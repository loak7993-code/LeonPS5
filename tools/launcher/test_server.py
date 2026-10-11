import json
import shutil
import struct
import subprocess
import sys
import tempfile
import unittest
import time
import urllib.request
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import server  # noqa: E402


def tiny_png(rgb):
    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    raw = b""
    for _ in range(4):
        raw += b"\x00" + bytes(rgb) * 4
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 4, 4, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw))
        + chunk(b"IEND", b"")
    )


def make_game(root, name, title, icon=False, marker="sce_module"):
    folder = root / name
    (folder / marker).mkdir(parents=True, exist_ok=True)
    (folder / marker / "stub.txt").write_text("fixture\n", encoding="utf-8")
    (folder / "sce_sys").mkdir(exist_ok=True)
    (folder / "sce_sys" / "param.json").write_text(
        json.dumps({"localizedParameters": {"default": {"TITLE": title}}}), encoding="utf-8"
    )
    if icon:
        (folder / "sce_sys" / "icon0.png").write_bytes(tiny_png((10, 20, 30)))
    return folder


class ServerFixture:
    def __init__(self, games_dir, runner):
        self.games_dir = games_dir
        self.runner = runner
        self.library = server.Library(games_dir, runner)
        server.Handler.web_source = Path(__file__).resolve().parent / "web"
        server.Handler.web_dir = server.Handler.web_source / "dist"
        self.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        server.Handler.library = self.library
        self.port = self.httpd.server_address[1]
        self.thread = __import__("threading").Thread(target=self.httpd.serve_forever, daemon=True)
        self.thread.start()

    def get(self, path):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{self.port}{path}") as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def post(self, path, payload=None):
        data = json.dumps(payload).encode("utf-8") if payload is not None else b""
        request = urllib.request.Request(
            f"http://127.0.0.1:{self.port}{path}",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read().decode("utf-8"))

    def stop(self):
        self.httpd.shutdown()
        self.httpd.server_close()


class ServerTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(tempfile.mkdtemp(prefix="leonps5-launcher-test-"))
        self.addCleanup(shutil.rmtree, self.root, ignore_errors=True)
        server.config_path = lambda: self.root / "config.json"
        self.games = self.root / "games"
        self.games.mkdir()
        make_game(self.games, "alpha", "Alpha Strike", icon=True)
        make_game(self.games, "beta", "Beta Line", marker="prx")
        self.config_backup = (server.load_config, server.save_config)
        server.load_config = lambda: {"gamesDir": None, "extraArgs": []}
        server.save_config = lambda config: None
        self.addCleanup(setattr, server, "load_config", self.config_backup[0])
        self.addCleanup(setattr, server, "save_config", self.config_backup[1])

    def spawn(self, runner=None):
        fixture = ServerFixture(self.games, runner)
        self.addCleanup(fixture.stop)
        return fixture

    def test_games_payload_lists_titles_and_icons(self):
        fixture = self.spawn()
        status, payload = fixture.get("/api/games")
        self.assertEqual(status, 200)
        self.assertEqual(payload["gamesDir"], str(self.games))
        self.assertEqual(len(payload["games"]), 2)
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertEqual(alpha["title"], "Alpha Strike")
        self.assertTrue(alpha["hasIcon"])
        self.assertFalse(alpha["demo"])
        self.assertIsNone(alpha["lastPlayed"])
        self.assertIn("version", payload)

    def test_demo_payload_replaces_games(self):
        fixture = self.spawn()
        status, payload = fixture.get("/api/games?demo=1")
        self.assertEqual(status, 200)
        self.assertEqual(len(payload["games"]), len(server.DEMO_TITLES))
        self.assertTrue(all(item["demo"] for item in payload["games"]))

    def test_icon_serves_png_and_404s(self):
        fixture = self.spawn()
        with urllib.request.urlopen(f"http://127.0.0.1:{fixture.port}/api/icon/alpha") as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers["Content-Type"], "image/png")
            self.assertEqual(response.read()[:4], b"\x89PNG")
        status, _ = fixture.get("/api/icon/beta")
        self.assertEqual(status, 404)
        status, _ = fixture.get("/api/icon/../escape")
        self.assertEqual(status, 404)

    def test_launch_requires_known_title_and_runner(self):
        fixture = self.spawn(runner=None)
        status, body = fixture.post("/api/launch", {"id": "alpha"})
        self.assertEqual(status, 409)
        self.assertIn("runner not found", body["error"])
        status, body = fixture.post("/api/launch", {"id": "missing"})
        self.assertEqual(status, 409)
        self.assertIn("Unknown title", body["error"])
        status, body = fixture.post("/api/launch", {"id": "demo-aurora-drift"})
        self.assertEqual(status, 409)
        self.assertIn("samples", body["error"])

    def test_launch_spawns_runner_and_records_played(self):
        script = self.root / "fake-runner.sh"
        script.write_text("#!/bin/sh\nprintf 'ok' > /dev/null\nexit 0\n", encoding="utf-8")
        script.chmod(0o755)
        fixture = self.spawn(runner=script)
        status, body = fixture.post("/api/launch", {"id": "alpha"})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "started")
        self.assertIn("fake-runner.sh", body["command"])
        _, payload = fixture.get("/api/games")
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertIsNotNone(alpha["lastPlayed"])
        log = self.games / ".leonps5-launcher" / "run.log"
        self.assertTrue(log.is_file())

    def test_scan_picks_up_new_games(self):
        fixture = self.spawn()
        _, before = fixture.get("/api/games")
        self.assertEqual(len(before["games"]), 2)
        make_game(self.games, "gamma", "Gamma Point")
        status, after = fixture.post("/api/scan")
        self.assertEqual(status, 200)
        self.assertEqual(len(after["games"]), 3)

    def test_config_round_trip_switches_directory(self):
        other = self.root / "other"
        make_game(other, "delta", "Delta Prime")
        fixture = self.spawn()
        status, body = fixture.post("/api/config", {"gamesDir": str(other)})
        self.assertEqual(status, 200)
        self.assertEqual(body["gamesDir"], str(other))
        self.assertEqual([item["title"] for item in body["games"]], ["Delta Prime"])
        status, body = fixture.post("/api/config", {"extraArgs": ["--to-intel", ""]})
        self.assertEqual(status, 200)
        self.assertEqual(body["extraArgs"], ["--to-intel"])
        status, body = fixture.post("/api/config", {"extraArgs": [str(index) for index in range(20)]})
        self.assertEqual(status, 409)
        status, body = fixture.post("/api/config", {"gamesDir": "   "})
        self.assertEqual(status, 200)

    def test_unknown_post_endpoint_is_404(self):
        fixture = self.spawn()
        status, body = fixture.post("/api/nope")
        self.assertEqual(status, 404)
        self.assertIn("Unknown endpoint", body["error"])

    def test_setup_status_shape(self):
        fixture = self.spawn()
        status, body = fixture.get("/api/setup/status")
        self.assertEqual(status, 200)
        self.assertIn("phase", body)
        self.assertIn("uiBuilt", body)
        self.assertIn("steps", body)
        self.assertIn(body["phase"], ("idle", "running", "ready", "error"))

    def test_setup_install_runs_job(self):
        fixture = self.spawn()
        calls = []
        original = server.run_setup

        def fake_setup(web_source, games_dir, node_hint=None):
            calls.append(web_source)
            with server.SETUP_LOCK:
                server.SETUP_JOB["state"] = "done"
                server.SETUP_JOB["steps"] = [
                    {"id": "node", "label": "Node.js runtime", "state": "done"}
                ]

        server.run_setup = fake_setup
        self.addCleanup(setattr, server, "run_setup", original)
        status, body = fixture.post("/api/setup/install")
        self.assertEqual(status, 200)
        for _ in range(50):
            _, progress = fixture.get("/api/setup/status")
            if progress["state"] == "done":
                break
            time.sleep(0.1)
        self.assertEqual(progress["state"], "done")
        self.assertEqual(progress["steps"][0]["state"], "done")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0], Path(__file__).resolve().parent / "web")

    def test_title_fallbacks_to_folder_name(self):
        folder = make_game(self.games, "delta", "Delta Prime")
        (folder / "sce_sys" / "param.json").unlink()
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        delta = next(item for item in payload["games"] if item["id"] == "delta")
        self.assertEqual(delta["title"], "delta")


if __name__ == "__main__":
    unittest.main(verbosity=2)