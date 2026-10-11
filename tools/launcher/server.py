import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

VERSION = "0.1.0"
GAME_MARKERS = ("sce_module", "sce_modules", "prx")
DEMO_TITLES = [
    "Aurora Drift",
    "Neon Vanguard",
    "Hollow Meridian",
    "Skyline Circuit",
    "Ember Protocol",
    "Tidal Runner",
    "Starfall Frontier",
]
MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".map": "application/json",
}


class LaunchError(Exception):
    pass


def find_title(data):
    if isinstance(data, dict):
        for key in ("TITLE", "title", "Title"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        localized = data.get("localizedParameters")
        if isinstance(localized, dict):
            for value in localized.values():
                found = find_title(value)
                if found:
                    return found
    return None


def resolve_runner(explicit):
    candidates = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    from_env = os.environ.get("LEONPS5_RUNNER")
    if from_env:
        candidates.append(Path(from_env).expanduser())
    here = Path(__file__).resolve()
    candidates.append(here.parents[2] / "build" / "core" / "runner" / "leonps5")
    on_path = shutil.which("leonps5")
    if on_path:
        candidates.append(Path(on_path))
    for candidate in candidates:
        if candidate.is_file() and os.access(candidate, os.X_OK):
            return candidate.resolve()
    return None


def open_folder(directory):
    openers = {"darwin": ["open"], "win32": ["explorer"]}
    opener = openers.get(sys.platform)
    if not opener and shutil.which("xdg-open"):
        opener = ["xdg-open"]
    if not opener:
        return {"ok": False, "error": f"No folder opener on this host. Path: {directory}"}
    try:
        subprocess.Popen(opener + [str(directory)])
    except OSError as error:
        return {"ok": False, "error": f"Could not open the folder: {error}"}
    return {"ok": True}


class Library:
    def __init__(self, games_dir, runner):
        self.games_dir = Path(games_dir).expanduser()
        self.runner = runner
        self.lock = threading.Lock()
        self.games = []
        self.played = {}
        self.load_state()
        self.scan()

    def state_path(self):
        return self.games_dir / ".leonps5-launcher" / "state.json"

    def load_state(self):
        try:
            data = json.loads(self.state_path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        if isinstance(data, dict):
            self.played = {str(key): str(value) for key, value in data.items()}

    def save_state(self):
        try:
            self.state_path().parent.mkdir(parents=True, exist_ok=True)
            self.state_path().write_text(json.dumps(self.played, indent=1), encoding="utf-8")
        except OSError:
            pass

    def title_for(self, folder):
        for candidate in (folder / "sce_sys" / "param.json", folder / "param.json"):
            try:
                data = json.loads(candidate.read_text(encoding="utf-8"))
            except (OSError, ValueError):
                continue
            title = find_title(data)
            if title:
                return title
        return folder.name

    def scan(self):
        games = []
        try:
            entries = sorted(self.games_dir.iterdir())
        except OSError:
            entries = []
        for entry in entries:
            if not entry.is_dir():
                continue
            if not any((entry / marker).is_dir() for marker in GAME_MARKERS):
                continue
            games.append(
                {
                    "id": entry.name,
                    "folder": entry.name,
                    "title": self.title_for(entry),
                    "hasIcon": (entry / "sce_sys" / "icon0.png").is_file(),
                    "lastPlayed": self.played.get(entry.name),
                    "demo": False,
                }
            )
        with self.lock:
            self.games = games

    def payload(self, demo=False):
        with self.lock:
            games = [dict(item, lastPlayed=self.played.get(item["id"])) for item in self.games]
        if demo:
            games = [
                {
                    "id": f"demo-{title.lower().replace(' ', '-')}",
                    "folder": f"sample-{position + 1}",
                    "title": title,
                    "hasIcon": False,
                    "lastPlayed": None,
                    "demo": True,
                }
                for position, title in enumerate(DEMO_TITLES)
            ]
        return {
            "games": games,
            "gamesDir": str(self.games_dir),
            "runnerFound": self.runner is not None,
            "runnerPath": str(self.runner) if self.runner else None,
            "version": VERSION,
        }

    def launch(self, game_id):
        if game_id.startswith("demo-"):
            raise LaunchError("Demo titles are samples and do not launch")
        with self.lock:
            game = next((item for item in self.games if item["id"] == game_id), None)
        if game is None:
            raise LaunchError(f"Unknown title: {game_id}. Rescan the library.")
        if self.runner is None:
            raise LaunchError(
                "leonps5 runner not found. Build it (cmake --build build --target leonps5) or set LEONPS5_RUNNER."
            )
        folder = self.games_dir / game["folder"]
        log_dir = self.games_dir / ".leonps5-launcher"
        log = None
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            log = open(log_dir / "run.log", "ab")
            process = subprocess.Popen(
                [str(self.runner), str(folder)],
                stdout=log,
                stderr=subprocess.STDOUT,
                cwd=str(self.games_dir),
                start_new_session=True,
            )
        except OSError as error:
            raise LaunchError(f"Cannot start the runner: {error}") from error
        finally:
            if log is not None:
                log.close()
        stamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with self.lock:
            self.played[game_id] = stamp
        self.save_state()
        return {"status": "started", "command": f"{Path(self.runner).name} {game['folder']}"}


class Handler(BaseHTTPRequestHandler):
    server_version = f"LeonPS5Launcher/{VERSION}"
    protocol_version = "HTTP/1.1"
    library = None
    web_dir = None
    server_ref = None

    def log_message(self, format, *args):
        pass

    def send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            return None
        if length <= 0 or length > 65536:
            return None
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/games":
            demo = parse_qs(parsed.query).get("demo", ["0"])[0] not in ("0", "", "false")
            self.send_json(self.library.payload(demo=demo))
            return
        if parsed.path.startswith("/api/icon/"):
            self.send_icon(unquote(parsed.path[len("/api/icon/") :]))
            return
        self.send_static(parsed.path)

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/api/scan":
            demo = parse_qs(urlparse(self.path).query).get("demo", ["0"])[0] not in ("0", "", "false")
            self.library.scan()
            self.send_json(self.library.payload(demo=demo))
            return
        if path == "/api/launch":
            body = self.read_json()
            game_id = str(body.get("id", "")) if isinstance(body, dict) else ""
            if not game_id:
                self.send_json({"error": "Missing title id"}, 400)
                return
            try:
                self.send_json(self.library.launch(game_id))
            except LaunchError as error:
                self.send_json({"error": str(error)}, 409)
            return
        if path == "/api/open-folder":
            self.send_json(open_folder(self.library.games_dir))
            return
        if path == "/api/quit":
            self.send_json({"ok": True})
            threading.Timer(0.3, self.server_ref.shutdown).start()
            return
        self.send_json({"error": "Unknown endpoint"}, 404)

    def send_icon(self, game_id):
        if not game_id or game_id in (".", "..") or "/" in game_id or "\\" in game_id:
            self.send_json({"error": "Unknown title"}, 404)
            return
        icon = self.library.games_dir / game_id / "sce_sys" / "icon0.png"
        if not icon.is_file():
            self.send_json({"error": "No icon"}, 404)
            return
        try:
            data = icon.read_bytes()
        except OSError:
            self.send_json({"error": "No icon"}, 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "max-age=300")
        self.end_headers()
        self.wfile.write(data)

    def send_static(self, path):
        web = self.web_dir
        index = web / "index.html"
        target = None
        if path not in ("/", ""):
            candidate = (web / path.lstrip("/")).resolve()
            if str(candidate).startswith(str(web.resolve())) and candidate.is_file():
                target = candidate
        if target is None:
            target = index
        if not target.is_file():
            body = b"UI build missing: run npm run build in tools/launcher/web"
            self.send_response(503)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(target.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(len(data)))
        cache = "no-store" if target.name == "index.html" else "max-age=3600"
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(data)


def main():
    parser = argparse.ArgumentParser(description="LeonPS5 home launcher server")
    parser.add_argument(
        "--games-dir",
        default=os.environ.get("LEONPS5_GAMES_DIR", str(Path.home() / "Games" / "LeonPS5")),
    )
    parser.add_argument("--port", type=int, default=8245)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--web-dir", default=str(Path(__file__).resolve().parent / "web" / "dist"))
    parser.add_argument("--runner", default=None)
    parser.add_argument("--open", action="store_true", help="open the launcher in the default browser")
    args = parser.parse_args()

    games_dir = Path(args.games_dir).expanduser()
    try:
        games_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        print(f"FAIL: cannot create the games directory {games_dir}: {error}", file=sys.stderr)
        return 1
    runner = resolve_runner(args.runner)
    Handler.library = Library(games_dir, runner)
    Handler.web_dir = Path(args.web_dir).expanduser().resolve()
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    Handler.server_ref = server

    print(f"LeonPS5 launcher {VERSION} on http://{args.host}:{args.port}")
    print(f"Games directory: {games_dir}")
    print(f"Runner: {runner if runner else 'not found (launching is disabled)'}")
    if args.open:
        webbrowser.open(f"http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
