import argparse
import json
import os
import platform
import shutil
import signal
import subprocess
import sys
import threading
import time
import unicodedata
import urllib.request
import webbrowser
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

VERSION = "0.5.0"
GAME_MARKERS = ("sce_module", "sce_modules", "prx")
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


PIC_NAMES = ("PIC1.PNG", "pic1.png", "PIC1.png", "pic1.PNG")
DAILY_KEEP = 90
DAILY_SPAN = 7
AUTO_SCAN_INTERVAL = 4.0
MAX_PROFILES = 8
MAX_NAME_CHARS = 24
DEFAULT_PROFILE = {"id": "p1", "name": "Player 1"}


def empty_stats():
    return {"lastPlayed": None, "minutes": 0.0, "launches": 0, "daily": {}}


def normalize_stats(value):
    if isinstance(value, str):
        return {"lastPlayed": value or None, "minutes": 0.0, "launches": 0, "daily": {}}
    if not isinstance(value, dict):
        return empty_stats()
    daily = {}
    raw = value.get("daily")
    if isinstance(raw, dict):
        for key, item in list(raw.items())[-DAILY_KEEP:]:
            if isinstance(key, str) and len(key) == 10 and isinstance(item, (int, float)) and item >= 0:
                daily[key] = round(float(item), 2)
    minutes = value.get("minutes")
    launches = value.get("launches")
    last = value.get("lastPlayed")
    return {
        "lastPlayed": str(last) if isinstance(last, str) and last else None,
        "minutes": float(minutes) if isinstance(minutes, (int, float)) and minutes >= 0 else 0.0,
        "launches": int(launches) if isinstance(launches, int) and launches >= 0 else 0,
        "daily": daily,
    }


def daily_series(daily, span=DAILY_SPAN):
    now = time.time()
    return [
        round(daily.get(time.strftime("%Y-%m-%d", time.localtime(now - offset * 86400)), 0.0), 2)
        for offset in range(span - 1, -1, -1)
    ]


def config_path():
    base = os.environ.get("XDG_CONFIG_HOME") or str(Path.home() / ".config")
    return Path(base) / "leonps5-launcher" / "config.json"


def profiles_path():
    return config_path().parent / "profiles.json"


def clean_name(name):
    return " ".join(str(name).split())[:MAX_NAME_CHARS]


def load_profiles():
    try:
        data = json.loads(profiles_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    profiles = []
    if isinstance(data, dict) and isinstance(data.get("profiles"), list):
        for item in data["profiles"]:
            if not isinstance(item, dict):
                continue
            pid = str(item.get("id", "")).strip()
            name = clean_name(item.get("name", ""))
            if pid and name:
                profiles.append({"id": pid, "name": name})
    if not profiles:
        profiles = [dict(DEFAULT_PROFILE)]
    seen = set()
    unique = [item for item in profiles if not (item["id"] in seen or seen.add(item["id"]))]
    active = str(data.get("active", "")) if isinstance(data, dict) else ""
    if not any(item["id"] == active for item in unique):
        active = unique[0]["id"]
    return {"active": active, "profiles": unique}


def save_profiles(state):
    try:
        profiles_path().parent.mkdir(parents=True, exist_ok=True)
        profiles_path().write_text(json.dumps(state, indent=1), encoding="utf-8")
    except OSError:
        pass


def looks_like_stats(value):
    return isinstance(value, dict) and ("lastPlayed" in value or "minutes" in value or "launches" in value or "daily" in value)


def load_config():
    try:
        data = json.loads(config_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    if not isinstance(data, dict):
        data = {}
    args = data.get("extraArgs")
    extra = [str(item) for item in args if str(item).strip()] if isinstance(args, list) else []
    games = data.get("gamesDir")
    return {"gamesDir": str(games) if isinstance(games, str) and games else None, "extraArgs": extra}


def save_config(config):
    try:
        path = config_path()
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(config, indent=1), encoding="utf-8")
    except OSError:
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


def suggestion_paths():
    home = Path.home()
    return [
        home / "Games" / "LeonPS5",
        home / "Games",
        home / "Downloads" / "LeonPS5",
        home / "games" / "ps5",
        Path("/mnt/c/Users") if sys.platform.startswith("linux") else home,
    ]


def suggestions():
    found = []
    for candidate in suggestion_paths():
        if candidate.is_dir() and candidate not in found:
            found.append(candidate)
    return [str(path) for path in found]


def normalize_title(text):
    flattened = unicodedata.normalize("NFKD", str(text))
    flattened = "".join(char for char in flattened if not unicodedata.combining(char))
    return "".join(char.lower() for char in flattened if char.isalnum())


def load_showcase():
    try:
        data = json.loads((Path(__file__).resolve().parent / "showcase.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [entry for entry in data if isinstance(entry, dict) and entry.get("id") and entry.get("title")]


def read_description(folder):
    for name in ("README.txt", "description.txt"):
        candidate = folder / name
        try:
            text = candidate.read_text(encoding="utf-8")
        except (OSError, ValueError):
            continue
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if lines:
            joined = " ".join(lines)[:300]
            if len(joined) == 300 and " " in joined:
                joined = joined.rsplit(" ", 1)[0]
            return joined
    return ""


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


SHOWCASE = load_showcase()


class Library:
    def __init__(self, games_dir, runner):
        self.games_dir = Path(games_dir).expanduser()
        self.runner = runner
        self.extra_args = []
        self.lock = threading.Lock()
        self.games = []
        self.stats = {}
        self.running = {}
        self.profiles = load_profiles()
        self.suggestions_cache = suggestions()
        self.load_state()
        self.scan()
        threading.Thread(target=self.watch_library, daemon=True).start()

    def active_profile(self):
        return self.profiles["active"]

    def profile_stats(self):
        return self.stats.setdefault(self.active_profile(), {})

    def save_profiles(self):
        save_profiles(self.profiles)

    def next_profile_id(self):
        numbers = []
        for item in self.profiles["profiles"]:
            if item["id"].startswith("p") and item["id"][1:].isdigit():
                numbers.append(int(item["id"][1:]))
        return f"p{max(numbers, default=0) + 1}"

    def create_profile(self, name):
        name = clean_name(name)
        if not name:
            raise LaunchError("Profile names need at least one character")
        if len(self.profiles["profiles"]) >= MAX_PROFILES:
            raise LaunchError(f"At most {MAX_PROFILES} profiles fit")
        if any(item["name"].lower() == name.lower() for item in self.profiles["profiles"]):
            raise LaunchError("A profile with that name already exists")
        profile = {"id": self.next_profile_id(), "name": name}
        self.profiles["profiles"].append(profile)
        self.profiles["active"] = profile["id"]
        self.save_profiles()
        return profile

    def switch_profile(self, profile_id):
        if not any(item["id"] == profile_id for item in self.profiles["profiles"]):
            raise LaunchError("Unknown profile")
        self.profiles["active"] = profile_id
        self.save_profiles()
        return profile_id

    def rename_profile(self, profile_id, name):
        name = clean_name(name)
        if not name:
            raise LaunchError("Profile names need at least one character")
        target = next((item for item in self.profiles["profiles"] if item["id"] == profile_id), None)
        if target is None:
            raise LaunchError("Unknown profile")
        if any(item["id"] != profile_id and item["name"].lower() == name.lower() for item in self.profiles["profiles"]):
            raise LaunchError("A profile with that name already exists")
        target["name"] = name
        self.save_profiles()
        return target

    def delete_profile(self, profile_id):
        remaining = [item for item in self.profiles["profiles"] if item["id"] != profile_id]
        if len(remaining) == len(self.profiles["profiles"]):
            raise LaunchError("Unknown profile")
        if not remaining:
            raise LaunchError("The last profile cannot be deleted")
        with self.lock:
            self.stats.pop(profile_id, None)
        self.save_state()
        self.profiles["profiles"] = remaining
        if self.profiles["active"] == profile_id:
            self.profiles["active"] = remaining[0]["id"]
        self.save_profiles()
        return self.profiles["active"]

    def set_games_dir(self, games_dir):
        path = Path(games_dir).expanduser()
        path.mkdir(parents=True, exist_ok=True)
        with self.lock:
            self.games_dir = path
            self.stats = {}
            self.running = {}
        self.suggestions_cache = suggestions()
        self.load_state()
        self.scan()

    def set_extra_args(self, args):
        with self.lock:
            self.extra_args = list(args)

    def state_path(self):
        return self.games_dir / ".leonps5-launcher" / "state.json"

    def load_state(self):
        try:
            data = json.loads(self.state_path().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            data = {}
        self.stats = {}
        if isinstance(data, dict) and data:
            values = list(data.values())
            if any(looks_like_stats(value) or isinstance(value, str) for value in values):
                self.stats = {self.active_profile(): {str(key): normalize_stats(value) for key, value in data.items()}}
            else:
                for profile_id, games in data.items():
                    if not isinstance(games, dict):
                        continue
                    self.stats[str(profile_id)] = {str(key): normalize_stats(value) for key, value in games.items()}

    def save_state(self):
        try:
            self.state_path().parent.mkdir(parents=True, exist_ok=True)
            self.state_path().write_text(json.dumps(self.stats, indent=1, sort_keys=True), encoding="utf-8")
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
        matched_titles = {normalize_title(item["title"]): item for item in SHOWCASE}
        try:
            entries = sorted(self.games_dir.iterdir())
        except OSError:
            entries = []
        for entry in entries:
            if not entry.is_dir():
                continue
            if not any((entry / marker).is_dir() for marker in GAME_MARKERS):
                continue
            has_icon = (entry / "sce_sys" / "icon0.png").is_file()
            has_pic = any((entry / base / name).is_file() for base in ("sce_sys", ".") for name in PIC_NAMES)
            title = self.title_for(entry)
            description = read_description(entry)
            matched = matched_titles.get(normalize_title(title))
            games.append(
                {
                    "id": entry.name,
                    "folder": entry.name,
                    "title": title,
                    "hasIcon": has_icon,
                    "hasPic": has_pic,
                    "lastPlayed": self.profile_stats().get(entry.name, empty_stats())["lastPlayed"],
                    "description": description or (matched["description"] if matched else ""),
                    "artUrl": matched["art"] if matched and not has_icon and not has_pic else None,
                    "genre": matched["genre"] if matched else "",
                    "storeUrl": matched["storeUrl"] if matched else "",
                }
            )
        with self.lock:
            self.games = games

    def dir_signature(self):
        signature = []
        try:
            for entry in sorted(self.games_dir.iterdir()):
                if not entry.is_dir():
                    continue
                try:
                    signature.append(
                        (
                            entry.name,
                            (entry / "sce_sys" / "icon0.png").is_file(),
                            any((entry / base / name).is_file() for base in ("sce_sys", ".") for name in PIC_NAMES),
                            int((entry / "sce_sys" / "param.json").stat().st_mtime)
                            if (entry / "sce_sys" / "param.json").is_file()
                            else 0,
                        )
                    )
                except OSError:
                    continue
        except OSError:
            pass
        return signature

    def watch_library(self):
        previous = self.dir_signature()
        while True:
            time.sleep(AUTO_SCAN_INTERVAL)
            try:
                current = self.dir_signature()
            except OSError:
                continue
            if current != previous:
                previous = current
                self.scan()

    def showcase_entries(self):
        installed_titles = {normalize_title(game["title"]) for game in self.games}
        entries = []
        for item in SHOWCASE:
            entries.append(
                {
                    "id": item["id"],
                    "title": item["title"],
                    "description": item["description"],
                    "art": item["art"],
                    "genre": item.get("genre", ""),
                    "beta": bool(item.get("beta")),
                    "storeUrl": item.get("storeUrl", ""),
                    "installed": normalize_title(item["title"]) in installed_titles,
                }
            )
        return entries

    def payload(self):
        with self.lock:
            games = []
            for item in self.games:
                stats = self.profile_stats().get(item["id"], empty_stats())
                games.append(
                    dict(
                        item,
                        lastPlayed=stats["lastPlayed"],
                        minutes=round(stats["minutes"], 2),
                        launches=stats["launches"],
                        daily=daily_series(stats["daily"]),
                        running=item["id"] in self.running,
                    )
                )
            extra = list(self.extra_args)
            cached_suggestions = self.suggestions_cache
            profiles = [dict(item) for item in self.profiles["profiles"]]
            active_profile = self.active_profile()
            showcase = self.showcase_entries()
        return {
            "games": games,
            "profiles": profiles,
            "activeProfile": active_profile,
            "showcase": {
                "production": [entry for entry in showcase if not entry["beta"]],
                "beta": [entry for entry in showcase if entry["beta"]],
            },
            "gamesDir": str(self.games_dir),
            "runnerFound": self.runner is not None,
            "runnerPath": str(self.runner) if self.runner else None,
            "extraArgs": extra,
            "configPath": str(config_path()),
            "suggestions": cached_suggestions,
            "version": VERSION,
        }

    def apply_config(self, body):
        games = body.get("gamesDir")
        args = body.get("extraArgs")
        with self.lock:
            extra = self.extra_args
        if isinstance(games, str) and games.strip():
            target = Path(games.strip()).expanduser()
            try:
                target.mkdir(parents=True, exist_ok=True)
            except OSError as error:
                raise LaunchError(f"Cannot use the games directory {target}: {error}") from error
            if not os.access(target, os.R_OK | os.X_OK):
                raise LaunchError(f"Cannot read the games directory {target}")
            if target != self.games_dir:
                self.set_games_dir(target)
        if isinstance(args, list):
            cleaned = [str(item).strip() for item in args if str(item).strip()]
            if len(cleaned) > 16:
                raise LaunchError("Too many runner arguments, at most 16")
            self.set_extra_args(cleaned)
            extra = cleaned
        config = {"gamesDir": str(self.games_dir), "extraArgs": list(extra)}
        save_config(config)
        return {**self.payload(), "saved": config}

    def launch(self, game_id):
        if game_id.startswith("showcase-"):
            raise LaunchError("That title is not installed. Showcase entries are browse-only.")
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
                [str(self.runner), *self.extra_args, str(folder)],
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
            stats = self.stats.setdefault(self.active_profile(), {}).setdefault(game_id, empty_stats())
            stats["lastPlayed"] = stamp
            stats["launches"] += 1
            self.running[game_id] = {"process": process, "started": time.monotonic()}
        self.save_state()
        threading.Thread(target=self.watch_session, args=(game_id, process, self.active_profile()), daemon=True).start()
        parts = [Path(self.runner).name, *self.extra_args, game["folder"]]
        return {"status": "started", "command": " ".join(parts)}

    def watch_session(self, game_id, process, profile_id):
        process.wait()
        with self.lock:
            session = self.running.pop(game_id, None)
            if session is None:
                return
            minutes = max(0.0, (time.monotonic() - session["started"]) / 60.0)
            stats = self.stats.setdefault(profile_id, {}).setdefault(game_id, empty_stats())
            stats["minutes"] += minutes
            today = time.strftime("%Y-%m-%d")
            stats["daily"][today] = round(stats["daily"].get(today, 0.0) + minutes, 2)
            if len(stats["daily"]) > DAILY_KEEP:
                for key in sorted(stats["daily"])[:-DAILY_KEEP]:
                    del stats["daily"][key]
        self.save_state()

    def stop(self, game_id):
        with self.lock:
            session = self.running.get(game_id)
            if session is None:
                raise LaunchError("That title is not running")
            process = session["process"]
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except OSError:
            pass

        def force():
            time.sleep(3.0)
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except OSError:
                    pass

        threading.Thread(target=force, daemon=True).start()
        return {"status": "stopping"}


POST_ROUTES = {
    "/api/scan": "post_scan",
    "/api/launch": "post_launch",
    "/api/config": "post_config",
    "/api/open-folder": "post_open_folder",
    "/api/stop": "post_stop",
    "/api/profile": "post_profile",
    "/api/quit": "post_quit",
    "/api/setup/install": "post_setup_install",
}


class Handler(BaseHTTPRequestHandler):
    server_version = f"LeonPS5Launcher/{VERSION}"
    protocol_version = "HTTP/1.1"
    library = None
    web_dir = None
    web_source = None
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
            self.send_json(self.library.payload())
            return
        if parsed.path == "/api/setup/status":
            self.send_json(setup_status(self.web_dir, self.web_source))
            return
        if parsed.path.startswith("/api/icon/"):
            self.send_art(unquote(parsed.path[len("/api/icon/") :]), ("icon0.png",))
            return
        if parsed.path.startswith("/api/pic/"):
            self.send_art(unquote(parsed.path[len("/api/pic/") :]), PIC_NAMES)
            return
        self.send_static(parsed.path)

    def do_POST(self):
        path = urlparse(self.path).path
        method = POST_ROUTES.get(path)
        if method is None:
            self.send_json({"error": "Unknown endpoint"}, 404)
            return
        getattr(self, method)()

    def post_scan(self):
        self.library.scan()
        self.send_json(self.library.payload())

    def post_launch(self):
        body = self.read_json()
        game_id = str(body.get("id", "")) if isinstance(body, dict) else ""
        if not game_id:
            self.send_json({"error": "Missing title id"}, 400)
            return
        try:
            self.send_json(self.library.launch(game_id))
        except LaunchError as error:
            self.send_json({"error": str(error)}, 409)
        except Exception as error:
            self.send_json({"error": f"Launcher error: {error}"}, 500)

    def post_stop(self):
        body = self.read_json()
        game_id = str(body.get("id", "")) if isinstance(body, dict) else ""
        if not game_id:
            self.send_json({"error": "Missing title id"}, 400)
            return
        try:
            self.send_json(self.library.stop(game_id))
        except LaunchError as error:
            self.send_json({"error": str(error)}, 409)
        except Exception as error:
            self.send_json({"error": f"Launcher error: {error}"}, 500)

    def post_profile(self):
        body = self.read_json()
        if not isinstance(body, dict):
            self.send_json({"error": "Invalid profile payload"}, 400)
            return
        action = str(body.get("action", ""))
        try:
            if action == "create":
                self.library.create_profile(body.get("name", ""))
            elif action == "switch":
                self.library.switch_profile(str(body.get("id", "")))
            elif action == "rename":
                self.library.rename_profile(str(body.get("id", "")), body.get("name", ""))
            elif action == "delete":
                self.library.delete_profile(str(body.get("id", "")))
            else:
                self.send_json({"error": "Unknown profile action"}, 400)
                return
            self.send_json(self.library.payload())
        except LaunchError as error:
            self.send_json({"error": str(error)}, 409)
        except Exception as error:
            self.send_json({"error": f"Launcher error: {error}"}, 500)

    def post_config(self):
        body = self.read_json()
        if not isinstance(body, dict):
            self.send_json({"error": "Invalid config payload"}, 400)
            return
        try:
            self.send_json(self.library.apply_config(body))
        except LaunchError as error:
            self.send_json({"error": str(error)}, 409)

    def post_open_folder(self):
        self.send_json(open_folder(self.library.games_dir))

    def post_setup_install(self):
        if SETUP_JOB["state"] == "running":
            self.send_json({"state": "running"})
            return
        source_ready = self.web_source is not None and (self.web_source / "package.json").is_file()
        if not source_ready:
            self.send_json(
                {"error": "This launcher build ships the UI pre-installed, so setup is not available."},
                409,
            )
            return
        reset_setup_job()
        self.send_json({"state": "running"})
        threading.Thread(target=run_setup, args=(self.web_source, self.library.games_dir), daemon=True).start()

    def post_quit(self):
        self.send_json({"ok": True})
        threading.Timer(0.3, self.server_ref.shutdown).start()

    def send_art(self, game_id, names):
        if not game_id or game_id in (".", "..") or "/" in game_id or "\\" in game_id:
            self.send_json({"error": "Unknown title"}, 404)
            return
        for name in names:
            candidate = self.library.games_dir / game_id / "sce_sys" / name
            if not candidate.is_file():
                continue
            try:
                data = candidate.read_bytes()
            except OSError:
                continue
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "max-age=300")
            self.end_headers()
            self.wfile.write(data)
            return
        self.send_json({"error": "No icon"}, 404)

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
            self.send_response(200)
            body = SETUP_PAGE.encode("utf-8")
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
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




NODE_VERSION = "v22.14.0"
SETUP_LOCK = threading.Lock()
SETUP_JOB = {"state": "idle", "steps": [], "log": [], "error": None}


def local_node_root():
    base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
    return Path(base) / "leonps5" / "node"


def find_node():
    from_env = os.environ.get("LEONPS5_NODE")
    if from_env and Path(from_env).is_file():
        return Path(from_env)
    on_path = shutil.which("node")
    if on_path:
        return Path(on_path)
    root = local_node_root()
    for candidate in sorted(root.glob("node-*/bin/node")):
        return candidate
    if sys.platform.startswith("win"):
        for candidate in sorted(root.glob("node-*/node.exe")):
            return candidate
    return None


def find_npm(node_path):
    if node_path is None:
        return None
    sibling = node_path.parent / ("npm.cmd" if sys.platform.startswith("win") else "npm")
    if sibling.is_file():
        return sibling
    return shutil.which("npm") and Path(shutil.which("npm"))


def ensure_node(log):
    node = find_node()
    if node:
        log(f"Node.js found: {node}")
        return node
    machine = platform.machine().lower()
    arch = "arm64" if machine in ("arm64", "aarch64") else "x64"
    system = "darwin" if sys.platform == "darwin" else "win" if sys.platform.startswith("win") else "linux"
    folder = f"node-{NODE_VERSION}-{system}-{arch}"
    url = f"https://nodejs.org/dist/{NODE_VERSION}/{folder}.{'zip' if system == 'win' else 'tar.gz'}"
    root = local_node_root()
    root.mkdir(parents=True, exist_ok=True)
    archive = root / (folder + (".zip" if system == "win" else ".tar.gz"))
    log(f"Downloading Node.js {NODE_VERSION} for {system}-{arch}")
    try:
        urllib.request.urlretrieve(url, archive)
    except OSError as error:
        raise RuntimeError(f"Node.js download failed ({error}). Install Node from nodejs.org and press Retry.") from error
    log("Extracting Node.js")
    if system == "win":
        with zipfile.ZipFile(archive) as bundle:
            bundle.extractall(root)
    else:
        import tarfile
        with tarfile.open(archive) as bundle:
            bundle.extractall(root)
    node = root / folder / "bin" / "node"
    if system == "win":
        node = root / folder / "node.exe"
    if not node.is_file():
        raise RuntimeError("Node.js extraction did not produce a usable runtime")
    log(f"Node.js installed: {node}")
    return node


def run_command(step, command, cwd, log, env_extra=None):
    environment = dict(os.environ)
    if env_extra:
        environment.update(env_extra)
    process = subprocess.Popen(
        command,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        errors="replace",
        env=environment,
    )
    for line in process.stdout:
        log(line.rstrip())
    code = process.wait()
    if code != 0:
        raise RuntimeError(f"{step} failed with exit code {code}. Check the log above.")


def run_setup(web_source, games_dir, node_hint=None):
    def log(line):
        with SETUP_LOCK:
            SETUP_JOB["log"].append(line)
            if len(SETUP_JOB["log"]) > 600:
                del SETUP_JOB["log"][:-600]

    def step(index, label):
        with SETUP_LOCK:
            SETUP_JOB["steps"][index]["state"] = "running"

    def done_step(index, ok=True):
        with SETUP_LOCK:
            SETUP_JOB["steps"][index]["state"] = "done" if ok else "failed"

    try:
        with SETUP_LOCK:
            SETUP_JOB["state"] = "running"
            SETUP_JOB["error"] = None
            SETUP_JOB["log"] = []
        node = find_node()
        if node_hint and node_hint.is_file():
            node = node_hint

        step(0, "Node.js runtime")
        try:
            node = ensure_node(log) if node is None else (log(f"Node.js found: {node}") or node)
            done_step(0)
        except Exception:
            done_step(0, ok=False)
            raise

        node_bin = str(node.parent)
        env = {"PATH": node_bin + os.pathsep + os.environ.get("PATH", "")}

        step(1, "UI packages")
        log("npm install")
        try:
            run_command("npm install", [str(find_npm(node)), "install", "--no-audit", "--no-fund"], web_source, log, env)
            done_step(1)
        except Exception:
            done_step(1, ok=False)
            raise

        step(2, "Build the launcher UI")
        log("npm run build")
        try:
            run_command("npm run build", [str(find_npm(node)), "run", "build"], web_source, log, env)
            done_step(2)
        except Exception:
            done_step(2, ok=False)
            raise

        step(3, "Games folder")
        try:
            Path(games_dir).expanduser().mkdir(parents=True, exist_ok=True)
            log(f"Games folder ready: {games_dir}")
            done_step(3)
        except OSError as error:
            done_step(3, ok=False)
            raise RuntimeError(f"Cannot create the games folder: {error}")

        dist_dir = web_source / "dist" if (web_source / "dist").is_dir() else web_source
        if not (dist_dir / "index.html").is_file():
            raise RuntimeError("The build finished but the UI is still missing")
        with SETUP_LOCK:
            SETUP_JOB["state"] = "done"
        log("Setup complete. Reloading the launcher.")
    except Exception as error:
        with SETUP_LOCK:
            SETUP_JOB["state"] = "error"
            SETUP_JOB["error"] = str(error)
        import traceback
        log(f"Setup error: {error}")
        for line in traceback.format_exc().splitlines()[-6:]:
            log(line)


def reset_setup_job():
    with SETUP_LOCK:
        SETUP_JOB["state"] = "running"
        SETUP_JOB["steps"] = [
            {"id": "node", "label": "Node.js runtime", "state": "pending"},
            {"id": "packages", "label": "UI packages", "state": "pending"},
            {"id": "build", "label": "Build the launcher UI", "state": "pending"},
            {"id": "games", "label": "Games folder", "state": "pending"},
        ]
        SETUP_JOB["log"] = []
        SETUP_JOB["error"] = None


def setup_status(web_dir, web_source):
    ui_built = bool(web_dir) and (web_dir / "index.html").is_file()
    state = SETUP_JOB["state"]
    if state == "running":
        phase = "running"
    elif ui_built:
        phase = "ready"
    elif state == "error":
        phase = "error"
    else:
        phase = "idle"
    return {
        "phase": phase,
        "uiBuilt": ui_built,
        "node": str(find_node()) if find_node() else None,
        "npm": str(find_npm(find_node())) if find_npm(find_node()) else None,
        "steps": SETUP_JOB["steps"],
        "state": state,
        "log": SETUP_JOB["log"][-40:],
        "error": SETUP_JOB["error"],
    }


SETUP_PAGE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LeonPS5 Setup</title>
<style>
  :root {
    --canvas: #0a0a0b;
    --panel: #14151a;
    --panel2: #1b1d24;
    --line: rgba(255, 255, 255, 0.09);
    --text: #f2f3f5;
    --muted: #9aa0ad;
    --accent: #2f6bff;
    --ok: #35c07a;
    --bad: #ff6b6e;
  }
  * { box-sizing: border-box; margin: 0; }
  html, body { height: 100%; }
  body {
    background: var(--canvas);
    color: var(--text);
    font-family: system-ui, "Segoe UI", sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .glow {
    position: fixed;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(46vw 34vw at -6% -12%, rgba(47, 107, 255, 0.13), transparent 70%),
      radial-gradient(50vw 38vw at 108% 110%, rgba(47, 107, 255, 0.08), transparent 70%);
  }
  .card {
    position: relative;
    width: 100%;
    max-width: 560px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 32px;
    box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
  }
  .brand { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 20px; }
  .brand .mark {
    width: 36px; height: 36px; border-radius: 8px;
    background: rgba(47, 107, 255, 0.16); color: var(--accent);
    font: 700 13px/36px ui-monospace, monospace; text-align: center;
  }
  .brand .name { font: 600 15px/1 system-ui, sans-serif; color: var(--muted); }
  h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
  p.sub { margin-top: 8px; color: var(--muted); font-size: 14px; line-height: 1.55; }
  .steps { margin-top: 24px; display: flex; flex-direction: column; gap: 10px; }
  .step {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--panel2);
    opacity: 0.55;
    transition: opacity 0.2s ease, border-color 0.2s ease;
  }
  .step.running, .step.done { opacity: 1; }
  .step.running { border-color: rgba(47, 107, 255, 0.45); }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.18); flex: none; }
  .step.running .dot { background: var(--accent); animation: pulse 1.1s ease-in-out infinite; }
  .step.done .dot { background: var(--ok); animation: none; }
  .step.failed .dot { background: var(--bad); }
  .step .label { font-size: 14px; flex: 1; }
  .step .state { font: 500 11px/1 ui-monospace, monospace; color: var(--muted); }
  .step.running .state { color: var(--accent); }
  .step.done .state { color: var(--ok); }
  .step.failed .state { color: var(--bad); }
  @keyframes pulse { 50% { opacity: 0.35; } }
  .actions { margin-top: 24px; display: flex; align-items: center; gap: 12px; }
  button {
    height: 44px; padding: 0 22px; border: 0; border-radius: 8px;
    background: var(--accent); color: #fff;
    font: 600 14px system-ui, sans-serif; cursor: pointer;
    transition: filter 0.15s ease, transform 0.1s ease;
  }
  button:hover { filter: brightness(1.1); }
  button:active { transform: scale(0.98); }
  button:disabled { opacity: 0.45; cursor: default; transform: none; }
  .hint { font-size: 12px; color: var(--muted); }
  .error {
    margin-top: 16px; padding: 12px 14px;
    border: 1px solid rgba(255, 107, 110, 0.35);
    border-radius: 10px;
    background: rgba(255, 107, 110, 0.08);
    color: var(--bad); font-size: 13px; line-height: 1.5; display: none;
  }
  .log {
    margin-top: 16px; max-height: 180px; overflow-y: auto;
    border: 1px solid var(--line); border-radius: 10px;
    background: #08090c; padding: 12px 14px;
    font: 12px/1.6 ui-monospace, monospace; color: var(--muted);
    white-space: pre-wrap; word-break: break-all; display: none;
  }
  .ready { border-color: rgba(53, 192, 122, 0.4); }
</style>
</head>
<body>
<div class="glow"></div>
<div class="card" id="card">
  <div class="brand"><span class="mark">L5</span><span class="name">LeonPS5 launcher</span></div>
  <h1 id="title">Set up the launcher</h1>
  <p class="sub" id="sub">This runs right here in the browser: it prepares Node.js if needed, builds the home screen and creates your games folder. Nothing to configure.</p>
  <div class="steps" id="steps"></div>
  <div class="error" id="error"></div>
  <div class="log" id="log"></div>
  <div class="actions">
    <button id="action" disabled>Checking environment</button>
    <span class="hint" id="hint">Python and this machine do the work. You watch.</span>
  </div>
</div>
<script>
(function () {
  var stepsEl = document.getElementById("steps");
  var action = document.getElementById("action");
  var errorEl = document.getElementById("error");
  var logEl = document.getElementById("log");
  var sub = document.getElementById("sub");
  var card = document.getElementById("card");
  var started = false;

  function render(status) {
    stepsEl.innerHTML = "";
    (status.steps || []).forEach(function (step) {
      var row = document.createElement("div");
      row.className = "step " + step.state;
      var dot = document.createElement("span");
      dot.className = "dot";
      var label = document.createElement("span");
      label.className = "label";
      label.textContent = step.label;
      var state = document.createElement("span");
      state.className = "state";
      state.textContent = step.state === "running" ? "working" : step.state;
      row.appendChild(dot);
      row.appendChild(label);
      row.appendChild(state);
      stepsEl.appendChild(row);
    });
    if (status.log && status.log.length) {
      logEl.style.display = "block";
      logEl.textContent = status.log.join(String.fromCharCode(10));
      logEl.scrollTop = logEl.scrollHeight;
    }
    if (status.error) {
      errorEl.style.display = "block";
      errorEl.textContent = status.error;
    } else {
      errorEl.style.display = "none";
    }
    action.dataset.ready = status.phase === "ready" ? "1" : "0";
    if (status.phase === "running") {
      action.textContent = "Installing";
      action.disabled = true;
    } else if (status.phase === "ready") {
      action.textContent = "Enter the launcher";
      action.disabled = false;
      card.classList.add("ready");
      sub.textContent = "Everything is installed. The home screen is ready.";
    } else if (status.phase === "error") {
      action.textContent = "Retry setup";
      action.disabled = false;
      card.classList.remove("ready");
    } else {
      action.textContent = "Install and launch";
      action.disabled = false;
      card.classList.remove("ready");
      sub.textContent = "This runs right here in the browser: it prepares Node.js if needed, builds the home screen and creates your games folder. Nothing to configure.";
    }
  }

  function poll() {
    fetch("/api/setup/status").then(function (r) { return r.json(); }).then(function (status) {
      if (!started && status.uiBuilt) {
        document.getElementById("title").textContent = "Launcher is ready";
        sub.textContent = "The home screen is already built. Press the button to open it.";
      }
      render(status);
    }).catch(function () {});
  }

  action.addEventListener("click", function () {
    if (action.dataset.ready === "1") { window.location.reload(); return; }
    started = true;
    action.disabled = true;
    action.textContent = "Installing";
    logEl.style.display = "block";
    fetch("/api/setup/install", { method: "POST" }).then(function () { poll(); });
  });

  setInterval(poll, 900);
  poll();
})();
</script>
</body>
</html>"""

def default_web_dir():
    bundled = getattr(sys, "_MEIPASS", None)
    if bundled and (Path(bundled) / "dist" / "index.html").is_file():
        return Path(bundled) / "dist"
    return Path(__file__).resolve().parent / "web" / "dist"


def synth_ambience(path, seconds=48, rate=44100):
    """Render a seamless ambient pad loop (Cmaj9, Am9, Fmaj9, G6/9) to a wav file."""
    import array as arraymod
    import math as mathmod
    import wave

    if Path(path).is_file():
        return
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    total = seconds * rate
    chords = [
        [48, 52, 55, 59, 62],
        [45, 48, 52, 55, 59],
        [41, 45, 48, 52, 55],
        [43, 47, 50, 52, 57],
    ]
    sparkle_notes = [72, 74, 76, 79, 81, 84]
    section = seconds / len(chords)
    fade = 3.0
    left = arraymod.array("f", [0.0] * total)
    right = arraymod.array("f", [0.0] * total)

    def midi_freq(m):
        return 440.0 * 2 ** ((m - 69) / 12)

    def add_note(start_s, dur_s, freq, level, pan):
        start_i = int(start_s * rate) % total
        dur_i = int(dur_s * rate)
        detune = freq * 1.003
        for i in range(dur_i):
            t = i / rate
            attack = min(1.0, t / 2.2)
            release = min(1.0, (dur_s - t) / 2.5)
            env = attack * release
            if env <= 0:
                continue
            v = mathmod.sin(2 * mathmod.pi * freq * t)
            v += 0.45 * mathmod.sin(2 * mathmod.pi * detune * t)
            v += 0.2 * mathmod.sin(2 * mathmod.pi * freq * 2 * t)
            sample = v * env * level
            pos = (start_i + i) % total
            left[pos] += sample * (1.0 - pan)
            right[pos] += sample * pan

    for index, chord in enumerate(chords):
        start_s = index * section
        add_note(start_s, section + fade, midi_freq(chord[0]) / 2, 0.16, 0.5)
        for note in chord[1:]:
            add_note(start_s, section + fade, midi_freq(note), 0.075, 0.5)
        if index % 2 == 0:
            sparkle_at = start_s + 2.0 + (index * 1.7) % (section - 6)
            add_note(sparkle_at, 4.0, midi_freq(sparkle_notes[index % len(sparkle_notes)]) * 2, 0.05, 0.35)

    peak = 0.0
    for index in range(total):
        peak = max(peak, abs(left[index]), abs(right[index]))
    gain = 0.42 / peak if peak > 0 else 1.0
    for index in range(total):
        left[index] = max(-1.0, min(1.0, left[index] * gain))
        right[index] = max(-1.0, min(1.0, right[index] * gain))

    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(rate)
        frames = arraymod.array("h", [0] * (total * 2))
        for index in range(total):
            frames[index * 2] = int(left[index] * 32767)
            frames[index * 2 + 1] = int(right[index] * 32767)
        handle.writeframes(frames.tobytes())


def main():
    parser = argparse.ArgumentParser(description="LeonPS5 home launcher server")
    parser.add_argument("--games-dir", default=os.environ.get("LEONPS5_GAMES_DIR"))
    parser.add_argument("--no-config", action="store_true", help="ignore the saved launcher configuration")
    parser.add_argument("--port", type=int, default=8245)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--web-dir", default=str(default_web_dir()))
    parser.add_argument("--runner", default=None)
    parser.add_argument("--open", action="store_true", help="open the launcher in the default browser")
    args = parser.parse_args()

    stored = {} if args.no_config else load_config()
    chosen = args.games_dir or stored["gamesDir"] or str(Path.home() / "Games" / "LeonPS5")
    games_dir = Path(chosen).expanduser()
    try:
        games_dir.mkdir(parents=True, exist_ok=True)
    except OSError as error:
        print(f"FAIL: cannot create the games directory {games_dir}: {error}", file=sys.stderr)
        return 1
    runner = resolve_runner(args.runner)
    Handler.library = Library(games_dir, runner)
    Handler.library.set_extra_args(stored["extraArgs"])
    Handler.web_dir = Path(args.web_dir).expanduser().resolve()
    web_dir_arg = Handler.web_dir
    Handler.web_source = web_dir_arg.parent if web_dir_arg.name == "dist" else web_dir_arg
    try:
        ambience_thread = threading.Thread(target=synth_ambience, args=(Handler.web_dir / "ambience.wav",), daemon=True)
        ambience_thread.start()
        print("Ambient loop: generating in the background")
    except Exception as error:
        print(f"Ambient loop: skipped ({error})")
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    Handler.server_ref = server

    print(f"LeonPS5 launcher {VERSION} on http://{args.host}:{args.port}")
    print(f"Games directory: {games_dir}")
    print(f"Config file: {config_path()}")
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
