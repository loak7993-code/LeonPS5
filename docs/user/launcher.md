# LeonPS5 launcher

The home screen of the LeonPS5 project. It scans a games directory, shows every
title as a card in a console-style rail and hands the selected folder to the
`leonps5` runner. Keyboard, mouse and gamepad navigation work out of the box.

## Quick start

```sh
cd tools/launcher/web
npm install
npm run build
cd ../..
python3 tools/launcher/server.py
```

Open http://127.0.0.1:8245. Put game folders in `~/Games/LeonPS5` (a game
folder contains `sce_module`, `sce_modules` or `prx`). The server picks up the
library again on every scan, or press Rescan in Settings.

For UI development with hot reload:

```sh
cd tools/launcher/web && npm run dev
```

The dev server runs on http://localhost:5188 and proxies `/api` to the launcher
server on port 8245.

## Configuration

| Option | Purpose | Default |
| --- | --- | --- |
| `--games-dir` | directory scanned for game folders | `LEONPS5_GAMES_DIR` or `~/Games/LeonPS5` |
| `--runner` | path of the leonps5 binary | `LEONPS5_RUNNER`, then `build/core/runner/leonps5`, then `PATH` |
| `--port` | HTTP port of the launcher | `8245` |
| `--host` | bind address | `127.0.0.1` |
| `--web-dir` | directory of the built UI | `tools/launcher/web/dist` |
| `--open` | open the default browser on start | off |

Game titles come from `sce_sys/param.json` (`TITLE`, `localizedParameters` or
`title`), with the folder name as fallback. Card art uses `sce_sys/icon0.png`
when present, otherwise the launcher draws procedural cover art.

## Controls

| Input | Action |
| --- | --- |
| Arrows | move between rows and cards |
| Enter | start the selected title |
| Esc | close panels and overlays |
| Gamepad | D-pad or left stick, cross to start, circle to go back |

Starting a title spawns `leonps5 <game-folder>` detached from the launcher and
records the timestamp in `<games-dir>/.leonps5-launcher/state.json`, which
drives the Recent sort. Runner output lands in
`<games-dir>/.leonps5-launcher/run.log`.

## Known limitations

- The runner converts and processes the title; playing a title end to end is
  the emulator milestone, not a launcher one. The launcher always reports what
  it actually ran, and the runner log captures failures.
- Demo tiles (toggle in the bottom row) are launcher samples and never launch.
- On hosts without `xdg-open`, `open` or `explorer`, the Open folder action
  reports the path instead of opening a window.
