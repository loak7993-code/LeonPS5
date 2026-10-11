# LeonPS5 launcher

The home screen of the LeonPS5 project. It scans a games directory, shows every
title as a card in a console-style rail and hands the selected folder to the
`leonps5` runner. Keyboard, mouse and gamepad navigation work out of the box.

## Quick start

One command on Linux or macOS:

```sh
sh tools/launcher/install.sh
```

On Windows, double-click or run:

```cmd
tools\launcher\install.cmd
```

The installer checks Python and Node, builds the UI, creates the games folder,
reports whether the runner is built and opens the launcher in the browser. No
configuration is needed: the games folder defaults to `~/Games/LeonPS5` and the
first-run setup in the UI changes it if your games live somewhere else.

On the first start the launcher walks through three steps (welcome, games
folder, ready) and offers demo titles so the screen is useful before you have
any dumps. Setup is skippable, and reopening the page keeps it skipped.

Manual start:

```sh
cd tools/launcher/web
npm install
npm run build
cd ../..
python3 tools/launcher/server.py
```

Put game folders in the games directory (a game folder contains `sce_module`,
`sce_modules` or `prx`). The library refreshes on every scan, and Settings has
Rescan.

For UI development with hot reload:

```sh
cd tools/launcher/web && npm run dev
```

The dev server runs on http://localhost:5188 and proxies `/api` to the launcher
server on port 8245.

## Customization

Settings applies instantly and remembers itself in the browser:

- Accent: blue, cyan, emerald, orange or red
- Card size: small, medium or large
- Motion: full or reduced (reduced also follows the system setting)
- Backdrop art: the blurred selected-game backdrop on or off
- Games directory: change it at runtime, saved to the config file

Runner arguments set in the config file are passed to every launch:
`--to-intel`, `--windows`, `--macos` and `--libs <dir>` are the useful ones.

## Configuration

| Option | Purpose | Default |
| --- | --- | --- |
| `--games-dir` | directory scanned for game folders | saved config, then `LEONPS5_GAMES_DIR`, then `~/Games/LeonPS5` |
| `--no-config` | ignore the saved launcher configuration | off |
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
- The games folder, extra runner arguments and the save state live in
  `~/.config/leonps5-launcher/` (inside the games folder for the play history).
