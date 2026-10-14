#include "MainWindow.hpp"

#include "ApiClient.hpp"
#include "Covers.hpp"
#include "StatsBar.hpp"

#include <QAction>
#include <QApplication>
#include <QCheckBox>
#include <QDateTime>
#include <QDesktopServices>
#include <QFontMetrics>
#include <QFormLayout>
#include <QFrame>
#include <QHBoxLayout>
#include <QInputDialog>
#include <QLabel>
#include <QLineEdit>
#include <QListWidget>
#include <QMenu>
#include <QMessageBox>
#include <QPainter>
#include <QProcess>
#include <QPushButton>
#include <QRegularExpression>
#include <QScrollArea>
#include <QTimer>
#include <QUrl>
#include <QVBoxLayout>

namespace {
constexpr int kCardSize = 168;

QString relativeTime(const QString &stamp)
{
    if (stamp.isEmpty()) return QStringLiteral("Never played");
    const QDateTime moment = QDateTime::fromString(stamp, QStringLiteral("yyyy-MM-dd'T'HH:mm:ss'Z'"));
    if (!moment.isValid()) return QStringLiteral("Played before");
    const qint64 seconds = QDateTime::currentDateTimeUtc().toSecsSinceEpoch() - moment.toSecsSinceEpoch();
    if (seconds < 60) return QStringLiteral("Played just now");
    const qint64 minutes = seconds / 60;
    if (minutes < 60) return QStringLiteral("Played %1 min ago").arg(minutes);
    const qint64 hours = minutes / 60;
    if (hours < 24) return QStringLiteral("Played %1 h ago").arg(hours);
    const qint64 days = hours / 24;
    if (days < 30) return QStringLiteral("Played %1 d ago").arg(days);
    return QStringLiteral("Played %1 mo ago").arg(days / 30);
}
}

MainWindow::MainWindow(ApiClient *api, QWidget *parent)
    : QMainWindow(parent), api_(api), covers_(new Covers(this))
{
    covers_->setBaseUrl(api_->base());
    covers_->onUpdate = [this](const QString &key) {
        for (int index = 0; index < rail_->count(); ++index) {
            QListWidgetItem *item = rail_->item(index);
            if (item && item->data(Qt::UserRole).toString() == key) {
                const QPixmap cover = covers_->coverFor(item->text(), key, QString(), QUrl(), QSize(kCardSize, kCardSize));
                item->setIcon(QIcon(cover));
            }
        }
        update();
    };
    buildUi();
    auto *poll = new QTimer(this);
    connect(poll, &QTimer::timeout, this, [this] { refresh(false); });
    poll->start(5000);
    refresh(true);
}

void MainWindow::buildUi()
{
    auto *central = new QWidget(this);
    central->setObjectName(QStringLiteral("central"));
    setCentralWidget(central);
    auto *rootLayout = new QVBoxLayout(central);
    rootLayout->setContentsMargins(0, 0, 0, 0);
    rootLayout->setSpacing(0);

    rootLayout->addWidget(buildTopBar());
    rootLayout->addWidget(buildRail(), 1);
    rootLayout->addWidget(buildInfoPanel());
    rootLayout->addWidget(buildBottomBar());

    toast_ = new QLabel(central);
    toast_->setObjectName(QStringLiteral("toast"));
    toast_->setAlignment(Qt::AlignCenter);
    toast_->hide();
    toastTimer_ = new QTimer(this);
    toastTimer_->setSingleShot(true);
    connect(toastTimer_, &QTimer::timeout, toast_, &QLabel::hide);
}

QWidget *MainWindow::buildTopBar()
{
    auto *bar = new QFrame(this);
    bar->setObjectName(QStringLiteral("topBar"));
    auto *layout = new QHBoxLayout(bar);
    layout->setContentsMargins(16, 10, 16, 10);

    search_ = new QLineEdit(bar);
    search_->setPlaceholderText(QStringLiteral("Search games"));
    search_->setFixedWidth(280);
    search_->setClearButtonEnabled(true);
    connect(search_, &QLineEdit::textChanged, this, [this] { rebuildRail(); });
    layout->addWidget(search_);
    layout->addStretch(1);

    profileButton_ = new QPushButton(bar);
    profileButton_->setObjectName(QStringLiteral("profileButton"));
    profileButton_->setCursor(Qt::PointingHandCursor);
    connect(profileButton_, &QPushButton::clicked, this, [this] { showProfiles(); });
    layout->addWidget(profileButton_);

    auto *quit = new QPushButton(QStringLiteral("Quit"), bar);
    quit->setObjectName(QStringLiteral("ghostButton"));
    connect(quit, &QPushButton::clicked, this, &MainWindow::close);
    layout->addWidget(quit);
    return bar;
}

QWidget *MainWindow::buildRail()
{
    rail_ = new QListWidget(this);
    rail_->setObjectName(QStringLiteral("rail"));
    rail_->setViewMode(QListWidget::IconMode);
    rail_->setMovement(QListWidget::Static);
    rail_->setResizeMode(QListWidget::Adjust);
    rail_->setWrapping(false);
    rail_->setFlow(QListView::LeftToRight);
    rail_->setUniformItemSizes(true);
    rail_->setIconSize(QSize(kCardSize, kCardSize));
    rail_->setVerticalScrollBarPolicy(Qt::ScrollBarAlwaysOff);
    rail_->setHorizontalScrollBarPolicy(Qt::ScrollBarAsNeeded);
    rail_->setSpacing(14);
    rail_->setFixedHeight(kCardSize + 42);
    connect(rail_, &QListWidget::currentRowChanged, this, &MainWindow::onRailRowChanged);
    connect(rail_, &QListWidget::itemActivated, this, [this](QListWidgetItem *) { playSelected(); });
    return rail_;
}

QWidget *MainWindow::buildInfoPanel()
{
    panel_ = new QFrame(this);
    panel_->setObjectName(QStringLiteral("infoPanel"));
    auto *layout = new QVBoxLayout(panel_);
    layout->setContentsMargins(18, 14, 18, 14);
    layout->setSpacing(8);

    panelTitle_ = new QLabel(panel_);
    panelTitle_->setObjectName(QStringLiteral("panelTitle"));
    layout->addWidget(panelTitle_);

    panelMeta_ = new QLabel(panel_);
    panelMeta_->setObjectName(QStringLiteral("panelMeta"));
    layout->addWidget(panelMeta_);

    auto *chips = new QHBoxLayout();
    chips->setSpacing(8);
    chipGenre_ = new QLabel(panel_);
    chipGenre_->setObjectName(QStringLiteral("chip"));
    chips->addWidget(chipGenre_);
    chipState_ = new QLabel(panel_);
    chipState_->setObjectName(QStringLiteral("chip"));
    chips->addWidget(chipState_);
    chips->addStretch(1);
    layout->addLayout(chips);

    auto *buttons = new QHBoxLayout();
    buttons->setSpacing(10);
    playButton_ = new QPushButton(QStringLiteral("Play"), panel_);
    playButton_->setObjectName(QStringLiteral("accentButton"));
    playButton_->setCursor(Qt::PointingHandCursor);
    connect(playButton_, &QPushButton::clicked, this, &MainWindow::playSelected);
    buttons->addWidget(playButton_);

    stopButton_ = new QPushButton(QStringLiteral("Stop"), panel_);
    stopButton_->setObjectName(QStringLiteral("dangerButton"));
    stopButton_->setCursor(Qt::PointingHandCursor);
    connect(stopButton_, &QPushButton::clicked, this, &MainWindow::stopSelected);
    buttons->addWidget(stopButton_);

    folderButton_ = new QPushButton(QStringLiteral("Open folder"), panel_);
    folderButton_->setObjectName(QStringLiteral("outlineButton"));
    connect(folderButton_, &QPushButton::clicked, this, [this] {
        QDesktopServices::openUrl(QUrl::fromLocalFile(currentGameFolder()));
    });
    buttons->addWidget(folderButton_);

    storeButton_ = new QPushButton(QStringLiteral("PlayStation Store"), panel_);
    storeButton_->setObjectName(QStringLiteral("outlineButton"));
    connect(storeButton_, &QPushButton::clicked, this, [this] {
        if (!selectedStoreUrl_.isEmpty()) QDesktopServices::openUrl(QUrl(selectedStoreUrl_));
    });
    buttons->addWidget(storeButton_);
    buttons->addStretch(1);
    layout->addLayout(buttons);

    panelDescription_ = new QLabel(panel_);
    panelDescription_->setObjectName(QStringLiteral("panelDescription"));
    panelDescription_->setWordWrap(true);
    layout->addWidget(panelDescription_);

    stats_ = new StatsBar(panel_);
    layout->addWidget(stats_);
    layout->addStretch(1);
    return panel_;
}

QWidget *MainWindow::buildBottomBar()
{
    auto *bar = new QFrame(this);
    bar->setObjectName(QStringLiteral("bottomBar"));
    auto *layout = new QHBoxLayout(bar);
    layout->setContentsMargins(16, 8, 16, 10);
    layout->addStretch(1);

    betaButton_ = new QPushButton(QStringLiteral("Beta off"), bar);
    betaButton_->setObjectName(QStringLiteral("ghostButton"));
    betaButton_->setToolTip(QStringLiteral("Off: testing-only titles. On: production titles."));
    connect(betaButton_, &QPushButton::clicked, this, [this] {
        betaOn_ = !betaOn_;
        betaButton_->setText(betaOn_ ? QStringLiteral("Beta on") : QStringLiteral("Beta off"));
        rebuildRail();
    });
    layout->addWidget(betaButton_);

    sortButton_ = new QPushButton(QStringLiteral("Recent"), bar);
    sortButton_->setObjectName(QStringLiteral("ghostButton"));
    connect(sortButton_, &QPushButton::clicked, this, [this] {
        sortRecent_ = !sortRecent_;
        sortButton_->setText(sortRecent_ ? QStringLiteral("Recent") : QStringLiteral("A to Z"));
        rebuildRail();
    });
    layout->addWidget(sortButton_);

    auto *folder = new QPushButton(QStringLiteral("Open games folder"), bar);
    folder->setObjectName(QStringLiteral("ghostButton"));
    connect(folder, &QPushButton::clicked, this, [this] {
        QDesktopServices::openUrl(QUrl::fromLocalFile(gamesDir_.isEmpty() ? QStringLiteral(".") : gamesDir_));
    });
    layout->addWidget(folder);
    layout->addStretch(1);
    return bar;
}

void MainWindow::applyPayload(const LibraryPayload &payload)
{
    payload_ = payload;
    gamesDir_ = payload.gamesDir;
    covers_->setBaseUrl(api_->base());
    const QString activeName = [&] {
        for (const ProfileEntry &profile : payload.profiles)
            if (profile.id == payload.activeProfile) return profile.name;
        return QStringLiteral("Player 1");
    }();
    profileButton_->setText(QStringLiteral("Profile: %1").arg(activeName));
    rebuildRail();
}

void MainWindow::rebuildRail()
{
    const QString query = search_->text().trimmed().toLower();
    QList<GameEntry> combined;
    for (const GameEntry &game : payload_.games) combined.append(game);
    for (const ShowcaseEntry &entry : (betaOn_ ? payload_.production : payload_.beta))
        combined.append(entry.asGame());

    QList<GameEntry> visible;
    for (const GameEntry &game : combined)
        if (query.isEmpty() || game.title.toLower().contains(query)) visible.append(game);

    if (sortRecent_) {
        std::stable_sort(visible.begin(), visible.end(), [](const GameEntry &left, const GameEntry &right) {
            const qint64 leftStamp = QDateTime::fromString(left.lastPlayed, QStringLiteral("yyyy-MM-dd'T'HH:mm:ss'Z'")).toSecsSinceEpoch();
            const qint64 rightStamp = QDateTime::fromString(right.lastPlayed, QStringLiteral("yyyy-MM-dd'T'HH:mm:ss'Z'")).toSecsSinceEpoch();
            if (leftStamp != rightStamp) return leftStamp > rightStamp;
            return left.title.localeAwareCompare(right.title) < 0;
        });
    } else {
        std::stable_sort(visible.begin(), visible.end(), [](const GameEntry &left, const GameEntry &right) {
            return left.title.localeAwareCompare(right.title) < 0;
        });
    }

    const QString previousId = selectedId();
    rail_->blockSignals(true);
    rail_->clear();
    visibleIds_.clear();
    for (const GameEntry &game : visible) {
        visibleIds_.append(game.id);
        auto *item = new QListWidgetItem(game.title, rail_);
        item->setData(Qt::UserRole, game.id);
        item->setTextAlignment(Qt::AlignHCenter | Qt::AlignBottom);
        const QPixmap cover = covers_->coverFor(game.title, game.id, game.coverUrl(),
                                                game.hasIcon ? api_->iconUrl(game.id) : QUrl(),
                                                QSize(kCardSize, kCardSize));
        item->setIcon(QIcon(cover));
    }
    rail_->blockSignals(false);

    int row = 0;
    if (!previousId.isEmpty()) {
        const int found = visibleIds_.indexOf(previousId);
        if (found >= 0) row = found;
    }
    rail_->setCurrentRow(row);
    if (visible.isEmpty()) updatePanel(GameEntry());
}

QString MainWindow::selectedId() const
{
    QListWidgetItem *item = rail_->currentItem();
    return item ? item->data(Qt::UserRole).toString() : QString();
}

GameEntry MainWindow::gameForId(const QString &id) const
{
    for (const GameEntry &game : payload_.games)
        if (game.id == id) return game;
    for (const ShowcaseEntry &entry : payload_.production)
        if (entry.id == id) return entry.asGame();
    for (const ShowcaseEntry &entry : payload_.beta)
        if (entry.id == id) return entry.asGame();
    return {};
}

QString MainWindow::currentGameFolder() const
{
    const GameEntry game = gameForId(selectedId());
    return game.folder.isEmpty() ? gamesDir_ : gamesDir_ + QStringLiteral("/") + game.folder;
}

void MainWindow::onRailRowChanged(int row)
{
    if (row < 0 || row >= visibleIds_.size()) return;
    updatePanel(gameForId(visibleIds_.at(row)));
}

void MainWindow::updatePanel(const GameEntry &game)
{
    const bool valid = !game.id.isEmpty();
    panel_->setVisible(valid);
    if (!valid) return;

    panelTitle_->setText(game.title);
    if (game.showcase) {
        panelMeta_->setText(QStringLiteral("%1 · not installed").arg(game.genre.isEmpty() ? QStringLiteral("Showcase") : game.genre));
    } else {
        panelMeta_->setText(QStringLiteral("%1 · %2").arg(game.folder, relativeTime(game.lastPlayed)));
    }
    chipGenre_->setText(game.genre.isEmpty() ? QStringLiteral("Game") : game.genre);
    chipGenre_->setVisible(game.showcase || !game.genre.isEmpty());
    chipState_->setText(game.showcase ? (game.installed ? QStringLiteral("Installed") : QStringLiteral("Not installed · browse only"))
                                      : game.running ? QStringLiteral("Running now") : QString());
    chipState_->setVisible(!chipState_->text().isEmpty());

    playButton_->setVisible(!game.showcase || game.installed);
    stopButton_->setVisible(!game.showcase && game.running);
    folderButton_->setVisible(!game.showcase);
    storeButton_->setVisible(game.showcase && !game.storeUrl.isEmpty());
    selectedStoreUrl_ = game.storeUrl;

    if (game.showcase && game.installed) {
        playButton_->setText(QStringLiteral("Play installed copy"));
    } else {
        playButton_->setText(QStringLiteral("Play"));
    }
    panelDescription_->setText(game.description.trimmed().isEmpty()
        ? QStringLiteral("No description yet. Add a README.txt or description.txt to the game folder and rescan.")
        : game.description);
    if (!game.showcase) {
        stats_->setValues(game.minutes, game.launches, game.daily);
        stats_->setVisible(game.launches > 0 || game.minutes > 0);
    } else {
        stats_->setVisible(false);
    }
    update();
}

void MainWindow::refresh(bool announceErrors)
{
    api_->fetchLibrary([this, announceErrors](const LibraryPayload &payload, const QString &error) {
        if (!error.isEmpty()) {
            if (announceErrors && !serverStartedHere_) {
                QMessageBox::warning(this, QStringLiteral("Launcher"), error);
            } else if (announceErrors) {
                showToast(error);
            }
            return;
        }
        QStringList fresh;
        for (const GameEntry &game : payload.games)
            if (!knownGames_.contains(game.id)) fresh.append(game.title);
        for (const GameEntry &game : payload.games) knownGames_.insert(game.id);
        applyPayload(payload);
        if (!fresh.isEmpty()) {
            showToast(fresh.size() == 1 ? QStringLiteral("Detected %1").arg(fresh.first())
                                        : QStringLiteral("Detected %1 new titles").arg(fresh.size()));
        }
    });
}

void MainWindow::playSelected()
{
    const GameEntry game = gameForId(selectedId());
    if (game.id.isEmpty()) return;
    if (game.showcase && !game.installed) {
        showToast(QStringLiteral("Not installed. Showcase titles are browse-only."));
        return;
    }
    QString target = game.id;
    if (game.showcase && game.installed) {
        const QString wanted = normalizedTitle(game.title);
        for (const GameEntry &candidate : payload_.games)
            if (normalizedTitle(candidate.title) == wanted) target = candidate.id;
    }
    playButton_->setEnabled(false);
    api_->launch(target, [this](const QString &command, const QString &error) {
        playButton_->setEnabled(true);
        if (!error.isEmpty()) {
            showToast(error);
            return;
        }
        showToast(QStringLiteral("Started: %1").arg(command));
        refresh(false);
    });
}

void MainWindow::stopSelected()
{
    const GameEntry game = gameForId(selectedId());
    if (game.id.isEmpty() || game.showcase) return;
    api_->stopGame(game.id, [this](const QString &statusOrError) {
        showToast(statusOrError);
        refresh(false);
    });
}

void MainWindow::showToast(const QString &message)
{
    toast_->setText(message);
    toast_->adjustSize();
    toast_->move((width() - toast_->width()) / 2, height() - toast_->height() - 96);
    toast_->raise();
    toast_->show();
    toastTimer_->start(2600);
}

void MainWindow::showProfiles()
{
    QDialog dialog(this);
    dialog.setWindowTitle(QStringLiteral("Profiles"));
    auto *layout = new QVBoxLayout(&dialog);
    auto *list = new QListWidget(&dialog);
    for (const ProfileEntry &profile : payload_.profiles) {
        auto *item = new QListWidgetItem(profile.name, list);
        item->setData(Qt::UserRole, profile.id);
        if (profile.id == payload_.activeProfile) {
            item->setText(profile.name + QStringLiteral("  —  active"));
            item->setSelected(true);
        }
    }
    layout->addWidget(list);
    auto *nameField = new QLineEdit(&dialog);
    nameField->setPlaceholderText(QStringLiteral("New profile name"));
    layout->addWidget(nameField);

    auto *buttons = new QHBoxLayout();
    auto *applyButton = new QPushButton(QStringLiteral("Switch to selected"), &dialog);
    auto *createButton = new QPushButton(QStringLiteral("Create"), &dialog);
    auto *renameButton = new QPushButton(QStringLiteral("Rename"), &dialog);
    auto *deleteButton = new QPushButton(QStringLiteral("Delete"), &dialog);
    buttons->addWidget(applyButton);
    buttons->addWidget(createButton);
    buttons->addWidget(renameButton);
    buttons->addWidget(deleteButton);
    layout->addLayout(buttons);

    const auto runAction = [&](const QString &action, const QString &id, const QString &name) {
        api_->profileAction(action, id, name, [this, &dialog](const LibraryPayload &payload, const QString &error) {
            if (!error.isEmpty()) {
                QMessageBox::warning(&dialog, QStringLiteral("Profiles"), error);
                return;
            }
            applyPayload(payload);
            dialog.accept();
        });
    };
    connect(applyButton, &QPushButton::clicked, &dialog, [&] {
        QListWidgetItem *item = list->currentItem();
        if (item) runAction(QStringLiteral("switch"), item->data(Qt::UserRole).toString(), QString());
    });
    connect(createButton, &QPushButton::clicked, &dialog, [&] {
        if (!nameField->text().trimmed().isEmpty()) runAction(QStringLiteral("create"), QString(), nameField->text());
    });
    connect(renameButton, &QPushButton::clicked, &dialog, [&] {
        QListWidgetItem *item = list->currentItem();
        if (item) runAction(QStringLiteral("rename"), item->data(Qt::UserRole).toString(), nameField->text());
    });
    connect(deleteButton, &QPushButton::clicked, &dialog, [&] {
        QListWidgetItem *item = list->currentItem();
        if (item) runAction(QStringLiteral("delete"), item->data(Qt::UserRole).toString(), QString());
    });
    dialog.exec();
}

void MainWindow::paintEvent(QPaintEvent *)
{
    QPainter painter(this);
    painter.fillRect(rect(), QColor(0x08, 0x08, 0x0a));
    const GameEntry game = gameForId(selectedId());
    const QString url = game.coverUrl();
    if (url.isEmpty()) return;
    QPixmap cover = covers_->coverFor(game.title, game.id, url,
                                      game.hasIcon ? api_->iconUrl(game.id) : QUrl(), QSize(kCardSize, kCardSize));
    if (cover.isNull()) return;
    QPixmap small = cover.scaled(width() / 10, height() / 10, Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation);
    const QPixmap blurred = small.scaled(size(), Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation);
    const int x = (width() - blurred.width()) / 2;
    const int y = (height() - blurred.height()) / 2;
    painter.setOpacity(0.42);
    painter.drawPixmap(x, y, blurred);
    painter.setOpacity(1.0);
    QLinearGradient gradient(0, 0, 0, height());
    gradient.setColorAt(0, QColor(5, 8, 20, 150));
    gradient.setColorAt(0.4, QColor(5, 8, 20, 60));
    gradient.setColorAt(1, QColor(5, 8, 20, 215));
    painter.fillRect(rect(), gradient);
}
