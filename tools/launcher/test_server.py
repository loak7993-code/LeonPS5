import json
import shutil
import struct
import sys
import tempfile
import time
import unittest
import urllib.request
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import server


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


def make_game(root, name, title, icon=False, marker="sce_module", readme=None):
    folder = root / name
    (folder / marker).mkdir(parents=True, exist_ok=True)
    (folder / marker / "stub.txt").write_text("fixture\n", encoding="utf-8")
    if readme is not None:
        (folder / "README.txt").write_text(readme, encoding="utf-8")
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
        server.profiles_path = lambda: self.root / "profiles.json"
        self.games = self.root / "games"
        self.games.mkdir()
        make_game(self.games, "alpha", "Alpha Strike", icon=True, readme="Alpha readme line one.\n\nAlpha readme line two.\n")
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
        self.assertIsNone(alpha["lastPlayed"])
        self.assertIn("version", payload)
        self.assertEqual(alpha["description"], "Alpha readme line one. Alpha readme line two.")
        beta = next(item for item in payload["games"] if item["id"] == "beta")
        self.assertEqual(beta["description"], "")

    def test_description_caps_long_readme(self):
        make_game(self.games, "gamma", "Gamma Wave", readme="word " * 200)
        status, payload = self.spawn().get("/api/games")
        self.assertEqual(status, 200)
        gamma = next(item for item in payload["games"] if item["id"] == "gamma")
        self.assertEqual(len(gamma["description"]), 299)
        self.assertTrue(gamma["description"].endswith("word"))

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

    def test_fresh_payload_has_default_profile(self):
        fixture = self.spawn()
        status, payload = fixture.get("/api/games")
        self.assertEqual(status, 200)
        self.assertEqual(payload["activeProfile"], "p1")
        self.assertEqual(payload["profiles"], [{"id": "p1", "name": "Player 1"}])

    def test_profile_crud_and_per_profile_stats(self):
        script = self.root / "sleepy-runner.sh"
        script.write_text("#!/bin/sh\nsleep 1.2\n", encoding="utf-8")
        script.chmod(0o755)
        fixture = self.spawn(runner=script)
        status, body = fixture.post("/api/profile", {"action": "create", "name": "  Rival  "})
        self.assertEqual(status, 200)
        self.assertEqual(body["activeProfile"], "p2")
        self.assertIn({"id": "p2", "name": "Rival"}, body["profiles"])
        status, _ = fixture.post("/api/launch", {"id": "alpha"})
        self.assertEqual(status, 200)
        deadline = time.time() + 10.0
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            alpha = next(item for item in payload["games"] if item["id"] == "alpha")
            if not alpha["running"] and alpha["minutes"] > 0:
                break
            time.sleep(0.2)
        self.assertGreater(alpha["minutes"], 0)
        self.assertEqual(alpha["launches"], 1)
        status, body = fixture.post("/api/profile", {"action": "switch", "id": "p1"})
        self.assertEqual(status, 200)
        self.assertEqual(body["activeProfile"], "p1")
        alpha = next(item for item in body["games"] if item["id"] == "alpha")
        self.assertIsNone(alpha["lastPlayed"])
        self.assertEqual(alpha["minutes"], 0.0)
        self.assertEqual(alpha["launches"], 0)
        status, body = fixture.post("/api/profile", {"action": "switch", "id": "p2"})
        alpha = next(item for item in body["games"] if item["id"] == "alpha")
        self.assertIsNotNone(alpha["lastPlayed"])
        status, body = fixture.post("/api/profile", {"action": "rename", "id": "p2", "name": "Rival Two"})
        self.assertEqual(status, 200)
        self.assertIn({"id": "p2", "name": "Rival Two"}, body["profiles"])
        status, body = fixture.post("/api/profile", {"action": "delete", "id": "p2"})
        self.assertEqual(status, 200)
        self.assertEqual(body["activeProfile"], "p1")
        self.assertEqual(len(body["profiles"]), 1)

    def test_profile_validation_errors(self):
        fixture = self.spawn()
        status, body = fixture.post("/api/profile", {"action": "create", "name": "   "})
        self.assertEqual(status, 409)
        status, body = fixture.post("/api/profile", {"action": "create", "name": "Player 1"})
        self.assertEqual(status, 409)
        status, body = fixture.post("/api/profile", {"action": "switch", "id": "missing"})
        self.assertEqual(status, 409)
        status, body = fixture.post("/api/profile", {"action": "delete", "id": "p1"})
        self.assertEqual(status, 409)
        self.assertIn("last profile", body["error"])
        status, body = fixture.post("/api/profile", {"action": "nope"})
        self.assertEqual(status, 400)
        for index in range(2, server.MAX_PROFILES + 1):
            status, _ = fixture.post("/api/profile", {"action": "create", "name": f"Player {index}"})
            self.assertEqual(status, 200)
        status, body = fixture.post("/api/profile", {"action": "create", "name": "One too many"})
        self.assertEqual(status, 409)
        self.assertIn("At most", body["error"])

    def test_flat_state_migrates_into_first_profile(self):
        state_dir = self.games / ".leonps5-launcher"
        state_dir.mkdir(parents=True, exist_ok=True)
        (state_dir / "state.json").write_text(
            json.dumps({"alpha": {"lastPlayed": "2026-01-02T03:04:05Z", "minutes": 5.5, "launches": 2, "daily": {}}}),
            encoding="utf-8",
        )
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertEqual(alpha["lastPlayed"], "2026-01-02T03:04:05Z")
        self.assertEqual(alpha["minutes"], 5.5)
        self.assertEqual(alpha["launches"], 2)
        _, body = fixture.post("/api/profile", {"action": "create", "name": "Fresh"})
        fresh = next(item for item in body["games"] if item["id"] == "alpha")
        self.assertIsNone(fresh["lastPlayed"])
        self.assertEqual(fresh["minutes"], 0.0)

    def test_auto_scan_detects_dropped_folder(self):
        original = server.AUTO_SCAN_INTERVAL
        server.AUTO_SCAN_INTERVAL = 0.3
        self.addCleanup(setattr, server, "AUTO_SCAN_INTERVAL", original)
        fixture = self.spawn()
        _, before = fixture.get("/api/games")
        self.assertEqual(len(before["games"]), 2)
        make_game(self.games, "late", "Late Arrival")
        deadline = time.time() + 6.0
        count = len(before["games"])
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            count = len(payload["games"])
            if count > len(before["games"]):
                break
            time.sleep(0.3)
        self.assertEqual(count, 3)

    def test_dropped_game_inherits_showcase_art(self):
        make_game(self.games, "demons", "Demon's Souls")
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        demons = next(item for item in payload["games"] if item["id"] == "demons")
        self.assertTrue(demons["artUrl"].startswith("https://image.api.playstation.com/"))
        self.assertEqual(demons["genre"], "Action")
        self.assertTrue(demons["description"])
        self.assertTrue(demons["storeUrl"].startswith("https://store.playstation.com/"))
        showcase = next(entry for entry in payload["showcase"]["production"] if entry["title"] == "Demon's Souls")
        self.assertTrue(showcase["installed"])
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertIsNone(alpha["artUrl"])

    def test_icon_folder_keeps_its_own_art(self):
        folder = make_game(self.games, "demons2", "Demon's Souls", icon=True)
        _ = folder
        _, payload = self.spawn().get("/api/games")
        demons = next(item for item in payload["games"] if item["id"] == "demons2")
        self.assertIsNone(demons["artUrl"])
        self.assertTrue(demons["hasIcon"])

    def test_payload_carries_showcase_catalog(self):
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        production = payload["showcase"]["production"]
        beta = payload["showcase"]["beta"]
        self.assertGreater(len(production), 5)
        self.assertGreaterEqual(len(beta), 3)
        self.assertTrue(all(not entry["beta"] for entry in production))
        self.assertTrue(all(entry["beta"] for entry in beta))
        demons = next(entry for entry in production if entry["title"] == "Demon's Souls")
        self.assertTrue(demons["art"].startswith("https://image.api.playstation.com/"))
        self.assertTrue(demons["description"])
        self.assertFalse(demons["installed"])
        self.assertTrue(demons["storeUrl"].startswith("https://store.playstation.com/"))

    def test_showcase_marks_installed_titles(self):
        make_game(self.games, "demons", "Demon's Souls")
        _, payload = self.spawn().get("/api/games")
        demons = next(entry for entry in payload["showcase"]["production"] if entry["title"] == "Demon's Souls")
        self.assertTrue(demons["installed"])

    def test_launch_refuses_showcase_ids(self):
        fixture = self.spawn()
        status, body = fixture.post("/api/launch", {"id": "showcase-10000368"})
        self.assertEqual(status, 409)
        self.assertIn("not installed", body["error"])

    def test_pic_serves_png_and_404s(self):
        folder = make_game(self.games, "alpha", "Alpha Strike", icon=True)
        (folder / "sce_sys" / "pic1.png").write_bytes(tiny_png((60, 50, 40)))
        fixture = self.spawn()
        with urllib.request.urlopen(f"http://127.0.0.1:{fixture.port}/api/pic/alpha") as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers["Content-Type"], "image/png")
            self.assertEqual(response.read()[:4], b"\x89PNG")
        status, _ = fixture.get("/api/pic/beta")
        self.assertEqual(status, 404)
        status, _ = fixture.get("/api/pic/../escape")
        self.assertEqual(status, 404)
        _, payload = fixture.get("/api/games")
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertTrue(alpha["hasPic"])
        beta = next(item for item in payload["games"] if item["id"] == "beta")
        self.assertFalse(beta["hasPic"])

    def test_payload_carries_playtime_and_running_fields(self):
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        for item in payload["games"]:
            self.assertEqual(item["minutes"], 0.0)
            self.assertEqual(item["launches"], 0)
            self.assertEqual(len(item["daily"]), 7)
            self.assertFalse(item["running"])

    def test_state_migration_keeps_old_stamps(self):
        state_dir = self.games / ".leonps5-launcher"
        state_dir.mkdir(parents=True, exist_ok=True)
        (state_dir / "state.json").write_text(
            json.dumps({"alpha": "2026-01-02T03:04:05Z"}), encoding="utf-8"
        )
        fixture = self.spawn()
        _, payload = fixture.get("/api/games")
        alpha = next(item for item in payload["games"] if item["id"] == "alpha")
        self.assertEqual(alpha["lastPlayed"], "2026-01-02T03:04:05Z")
        self.assertEqual(alpha["launches"], 0)
        self.assertEqual(alpha["minutes"], 0.0)

    def test_stop_rejects_unknown_and_idle_titles(self):
        fixture = self.spawn()
        status, body = fixture.post("/api/stop", {"id": "alpha"})
        self.assertEqual(status, 409)
        self.assertIn("not running", body["error"])
        status, body = fixture.post("/api/stop", {})
        self.assertEqual(status, 400)

    def test_launch_accumulates_playtime_on_exit(self):
        script = self.root / "sleepy-runner.sh"
        script.write_text("#!/bin/sh\nsleep 1.2\n", encoding="utf-8")
        script.chmod(0o755)
        fixture = self.spawn(runner=script)
        status, _ = fixture.post("/api/launch", {"id": "alpha"})
        self.assertEqual(status, 200)
        deadline = time.time() + 5.0
        running = False
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            alpha = next(item for item in payload["games"] if item["id"] == "alpha")
            if alpha["running"]:
                running = True
                break
            time.sleep(0.1)
        self.assertTrue(running)
        deadline = time.time() + 8.0
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            alpha = next(item for item in payload["games"] if item["id"] == "alpha")
            if not alpha["running"]:
                break
            time.sleep(0.2)
        self.assertFalse(alpha["running"])
        self.assertGreaterEqual(alpha["minutes"], 0.01)
        self.assertEqual(alpha["launches"], 1)
        self.assertGreater(max(alpha["daily"]), 0)

    def test_stop_ends_session_and_records_time(self):
        script = self.root / "long-runner.sh"
        script.write_text("#!/bin/sh\nsleep 60\n", encoding="utf-8")
        script.chmod(0o755)
        fixture = self.spawn(runner=script)
        status, _ = fixture.post("/api/launch", {"id": "alpha"})
        self.assertEqual(status, 200)
        deadline = time.time() + 5.0
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            alpha = next(item for item in payload["games"] if item["id"] == "alpha")
            if alpha["running"]:
                break
            time.sleep(0.1)
        self.assertTrue(alpha["running"])
        status, body = fixture.post("/api/stop", {"id": "alpha"})
        self.assertEqual(status, 200)
        self.assertEqual(body["status"], "stopping")
        deadline = time.time() + 8.0
        while time.time() < deadline:
            _, payload = fixture.get("/api/games")
            alpha = next(item for item in payload["games"] if item["id"] == "alpha")
            if not alpha["running"]:
                break
            time.sleep(0.2)
        self.assertFalse(alpha["running"])
        self.assertGreaterEqual(alpha["minutes"], 0.0)
        self.assertEqual(alpha["launches"], 1)

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
        status, _ = fixture.post("/api/setup/install")
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