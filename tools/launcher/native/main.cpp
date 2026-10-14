#include "MainWindow.hpp"

#include <QApplication>
#include <QCommandLineParser>
#include <QProcess>
#include <QNetworkReply>
#include <QStyleFactory>

#include <QFile>
#include <QStandardPaths>
#include <QTimer>

namespace {
const char *kStyleSheet = R"(
QMainWindow, QWidget#central {
    background-color: #08080a;
    color: #f2f2f4;
}
QWidget#topBar {
    background: rgba(255, 255, 255, 0.04);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
QLineEdit {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 6px 14px;
    color: #f2f2f4;
    selection-background-color: #2f6bff;
}
QLineEdit:focus { border-color: #2f6bff; }
QListWidget#rail {
    background: transparent;
    border: none;
    outline: none;
}
QListWidget#rail::item {
    color: #9a9aa4;
    border-radius: 12px;
    padding: 4px 2px 0 2px;
}
QListWidget#rail::item:selected {
    color: #ffffff;
    background: transparent;
    border: 2px solid #ffffff;
}
QFrame#infoPanel {
    background: rgba(16, 16, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.10);
    border-radius: 14px;
    margin: 4px 16px 10px 16px;
}
QLabel#panelTitle { font-size: 22px; font-weight: 600; }
QLabel#panelMeta, QLabel#chip { font-size: 11px; color: #9a9aa4; }
QLabel#chip {
    background: rgba(255, 255, 255, 0.09);
    border-radius: 8px;
    padding: 3px 9px;
}
QLabel#panelDescription { font-size: 13px; color: rgba(242, 242, 244, 0.88); }
QPushButton {
    font-size: 13px;
    border-radius: 10px;
    padding: 9px 18px;
}
QPushButton#accentButton {
    background: #2f6bff;
    color: #ffffff;
    font-weight: 600;
    border: none;
}
QPushButton#accentButton:hover { background: #3f78ff; }
QPushButton#dangerButton {
    background: #ff6b6e;
    color: #08080a;
    font-weight: 600;
    border: none;
}
QPushButton#outlineButton, QPushButton#ghostButton {
    background: rgba(255, 255, 255, 0.06);
    color: #f2f2f4;
    border: 1px solid rgba(255, 255, 255, 0.12);
}
QPushButton#outlineButton:hover, QPushButton#ghostButton:hover { background: rgba(255, 255, 255, 0.12); }
QWidget#bottomBar {
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}
QLabel#toast {
    background: rgba(20, 20, 26, 0.95);
    color: #f2f2f4;
    border: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    padding: 8px 18px;
    font-size: 13px;
}
QScrollBar:horizontal { height: 8px; background: transparent; }
QScrollBar::handle:horizontal { background: rgba(255, 255, 255, 0.18); border-radius: 4px; }
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal { width: 0; }
)";
}

int main(int argc, char **argv)
{
    QApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("LeonPS5 Launcher"));
    app.setStyle(QStyleFactory::create(QStringLiteral("Fusion")));
    app.setStyleSheet(kStyleSheet);

    QUrl base = QUrl::fromUserInput(QStringLiteral("http://127.0.0.1:8245"));

    QProcess *server = nullptr;
    {
        // Probe once; if the server is not answering, start one next to this executable.
        QNetworkAccessManager probe;
        QUrl url = base;
        url.setPath(QStringLiteral("/api/games"));
        QNetworkReply *reply = probe.get(QNetworkRequest(url));
        QEventLoop loop;
        QObject::connect(reply, &QNetworkReply::finished, &loop, &QEventLoop::quit);
        QTimer::singleShot(1500, &loop, &QEventLoop::quit);
        loop.exec();
        const bool alive = reply->error() == QNetworkReply::NoError;
        reply->deleteLater();
        if (!alive) {
            QString serverScript = qEnvironmentVariable("LEONPS5_SERVER_SCRIPT");
            if (serverScript.isEmpty()) {
                const QStringList candidates = {
                    QCoreApplication::applicationDirPath() + QStringLiteral("/server.py"),
                    QCoreApplication::applicationDirPath() + QStringLiteral("/../../server.py"),
                };
                for (const QString &candidate : candidates)
                    if (QFile::exists(candidate)) {
                        serverScript = candidate;
                        break;
                    }
            }
            QString python = QStandardPaths::findExecutable(QStringLiteral("python3"));
            if (python.isEmpty()) python = QStandardPaths::findExecutable(QStringLiteral("python"));
            if (python.isEmpty()) {
                const QString bundled = QCoreApplication::applicationDirPath() + QStringLiteral("/python/python.exe");
                if (QFile::exists(bundled)) python = bundled;
            }
            if (!python.isEmpty() && QFile::exists(serverScript)) {
                server = new QProcess(&app);
                server->setProgram(python);
                server->setArguments({serverScript});
                server->start();
                server->waitForStarted(3000);
                for (int attempt = 0; attempt < 20; ++attempt) {
                    QEventLoop waitLoop;
                    QTimer::singleShot(250, &waitLoop, &QEventLoop::quit);
                    waitLoop.exec();
                    QNetworkReply *retry = probe.get(QNetworkRequest(url));
                    QEventLoop check;
                    QObject::connect(retry, &QNetworkReply::finished, &check, &QEventLoop::quit);
                    QTimer::singleShot(1200, &check, &QEventLoop::quit);
                    check.exec();
                    const bool up = retry->error() == QNetworkReply::NoError;
                    retry->deleteLater();
                    if (up) break;
                }
            }
        }
    }

    ApiClient api(base);
    MainWindow window(&api);
    window.setServerProcess(server);
    window.setWindowTitle(QStringLiteral("LeonPS5 Launcher"));
    window.resize(1180, 720);
    window.show();

    QCommandLineParser parser;
    parser.setApplicationDescription(QStringLiteral("LeonPS5 native launcher"));
    parser.addHelpOption();
    QCommandLineOption quitAfter(QStringLiteral("quit-after"), "Quit after this many milliseconds", "ms");
    parser.addOption(quitAfter);
    parser.process(app);
    bool ok = false;
    const int quitAfterMs = parser.value(quitAfter).toInt(&ok);
    if (ok && quitAfterMs > 0) QTimer::singleShot(quitAfterMs, &app, &QApplication::quit);

    const int code = app.exec();
    if (server) {
        server->terminate();
        if (!server->waitForFinished(3000)) server->kill();
    }
    return code;
}
