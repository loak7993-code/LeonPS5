#!/bin/sh
# Packs the native launcher into a Linux AppImage. Requires linuxdeploy and
# linuxdeploy-plugin-qt AppImages (downloadable from their GitHub releases)
# and the Qt 6 build of the launcher.
set -e
LINUXDEPLOY="${LINUXDEPLOY:-linuxdeploy.AppImage}"
PLUGIN_QT="${PLUGIN_QT:-linuxdeploy-plugin-qt.AppImage}"
APPDIR="${APPDIR:-LeonPS5.Launcher.AppDir}"
BUILD_DIR="${BUILD_DIR:-build}"

cmake --build "$BUILD_DIR" --target leonps5-launcher-native

rm -rf "$APPDIR"
mkdir -p "$APPDIR/usr/bin"
cp "$BUILD_DIR/leonps5-launcher-native" "$APPDIR/usr/bin/"
cp "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)/server.py" "$APPDIR/usr/bin/"
cp "$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)/showcase.json" "$APPDIR/usr/bin/"
cat > "$APPDIR/leonps5-launcher.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=LeonPS5 Launcher
Comment=PS5 game launcher for the LeonPS5 project
Exec=leonps5-launcher-native
Icon=leonps5-launcher
Categories=Game;
DESKTOP
[ -f "$APPDIR/leonps5-launcher.png" ] || cp "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/appicon.png" "$APPDIR/leonps5-launcher.png"

# linuxdeploy does not generate AppRun for this layout; provide it explicitly.
cat > "$APPDIR/AppRun" <<APPRUN
#!/bin/sh
HERE=\$(dirname "\$(readlink -f "\$0")")
exec "\$HERE/usr/bin/leonps5-launcher-native" "\$@"
APPRUN
chmod +x "$APPDIR/AppRun"

export QMAKE="${QMAKE:-/usr/lib/qt6/bin/qmake}"
"$LINUXDEPLOY" --appdir "$APPDIR" --plugin qt --output appimage
