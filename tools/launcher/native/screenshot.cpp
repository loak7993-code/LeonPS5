// Test harness: renders the launcher offscreen and saves screenshots of the
// main states so the native UI can be verified without a display.
#include "MainWindow.hpp"

#include <QApplication>
#include <QCommandLineParser>
#include <QEventLoop>
#include <QListWidget>
#include <QPixmap>
#include <QPushButton>
#include <QTimer>

namespace {
void settle(int ms)
{
    QEventLoop loop;
    QTimer::singleShot(ms, &loop, &QEventLoop::quit);
    loop.exec();
}

void grab(QMainWindow &window, const QString &path)
{
    window.grab().save(path);
}

QPushButton *findButton(QMainWindow &window, const QString &text)
{
    const QList<QPushButton *> buttons = window.findChildren<QPushButton *>();
    for (QPushButton *button : buttons)
        if (button->text() == text) return button;
    return nullptr;
}
}

int main(int argc, char **argv)
{
    QApplication app(argc, argv);
    QCommandLineParser parser;
    parser.addHelpOption();
    parser.addOptions({{{"o", "output"}, "Screenshot directory", "dir"}});
    parser.process(app);
    const QString output = parser.value(QStringLiteral("output"));

    qputenv("QT_QPA_PLATFORM", "offscreen");
    ApiClient api(QUrl::fromUserInput(QStringLiteral("http://127.0.0.1:8245")));
    MainWindow window(&api);
    window.setWindowTitle(QStringLiteral("LeonPS5 Launcher"));
    window.resize(1180, 720);
    window.show();
    settle(4000);
    grab(window, output + QStringLiteral("/native-home.png"));

    auto *rail = window.findChild<QListWidget *>(QStringLiteral("rail"));
    if (rail && rail->count() > 1) {
        rail->setCurrentRow(1);
        settle(500);
        grab(window, output + QStringLiteral("/native-info.png"));
    }

    if (QPushButton *beta = findButton(window, QStringLiteral("Beta off"))) {
        beta->click();
        settle(1200);
        grab(window, output + QStringLiteral("/native-beta-on.png"));
        if (rail && rail->count() > 2) {
            rail->setCurrentRow(2);
            settle(500);
            grab(window, output + QStringLiteral("/native-production-info.png"));
        }
    }
    return 0;
}
