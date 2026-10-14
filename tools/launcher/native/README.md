# LeonPS5 native launcher

A Qt 6 widgets client for the LeonPS5 launcher server. Same API, same state, same showcase as the web UI - a compiled desktop window instead of a browser tab.

## What it does

- Rail of game cards with real cover art (store art, icon0.png, or a generated cover), blurred art backdrop
- Info panel: description, Play / Stop, Open folder, store link, playtime stats with a 7-day chart
- Showcase browsing: Beta off shows testing-only titles, Beta on shows production titles
- Profiles: switch, create, rename, delete
- Search, recent/alpha sort, drop-in detection (the rail updates within ~5 s of dropping a folder)

## Run

The app talks to the launcher server on 127.0.0.1:8245. If the server is not running, the app starts one from `tools/launcher/server.py` and stops it when the window closes.

```
cmake -B build -S tools/launcher/native -DCMAKE_BUILD_TYPE=Release
cmake --build build -j 8
./tools/launcher/native/build/leonps5-launcher-native
```

Requires Qt 6 Widgets and Network (`apt install qt6-base-dev`). `LEONPS5_SERVER_SCRIPT` overrides the server script path. `--quit-after <ms>` exits the app after a delay, for headless checks.

## Verify without a display

```
QT_QPA_PLATFORM=offscreen ./build/leonps5-launcher-native-shot -o shots
```

Writes screenshots of the home, info panel, beta-on rail and production info panel states.

## Known gaps

Gamepad input, UI sounds, the settings surface, the gallery and the web UI's full motion set are web-only for now. The web launcher remains the feature-complete client; both frontends share one server and one state.
