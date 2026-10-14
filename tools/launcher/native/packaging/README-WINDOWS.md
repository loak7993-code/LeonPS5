# Windows packaging notes

The build is a cross-compile from Linux using the distro mingw-w64 cross
compiler against the Qt 6.4.2 win64_mingw kit fetched with aqtinstall. The
Qt-bundled MinGW toolchain is Windows-hosted and cannot run here, so the
distro cross compiler produces the exe and Qt's own DLLs are shipped.

## Reproduce

```
pip install aqtinstall
python3 -m aqt install-qt windows desktop 6.4.2 win64_mingw --outputdir /tmp/qtwin
python3 -m aqt install-tool windows desktop tools_mingw1310 --outputdir /tmp/qtwin
apt install g++-mingw-w64-x86-64

cmake -B build-win -S . \
  -DCMAKE_TOOLCHAIN_FILE=packaging/windows-toolchain.cmake \
  -DCMAKE_QT_WIN_ROOT=/tmp/qtwin/6.4.2/mingw_64 \
  -DCMAKE_MINGW_BIN=/usr/bin -DCMAKE_BUILD_TYPE=Release
cmake --build build-win --target leonps5-launcher-native
```

The package needs no moc from the Windows kit: the app carries no Q_OBJECT
classes, so AUTOMOC is off and no Windows-hosted tool runs during the build.

## Package layout

leonps5-launcher.exe, Qt6Core/Gui/Widgets/Network DLLs, the qwindows platform
plugin, the mingw runtime DLLs, server.py, showcase.json, and an embedded
Python 3.12 (python/) the app uses to start the server. No installation: the
folder runs as-is; Python does not need to be installed on the target.

## Verification status

Built and structurally verified (PE32+, imports, all DLLs present). The wine
smoke test on the build host fails at wine's loader with "Bad EXE format" for
every Qt-linked mingw binary, including a minimal Qt app, while non-Qt mingw
binaries from the same compiler run fine - a wine environment limitation on
this host, not a confirmed defect. Verify on real Windows hardware before
distribution.
