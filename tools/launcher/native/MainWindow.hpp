#pragma once

#include <QLabel>
#include <QListWidget>
#include <QMainWindow>
#include <QPushButton>
#include <QSet>
#include <QStringList>
#include <QTimer>

#include "ApiClient.hpp"
#include "Covers.hpp"
#include "Models.hpp"
#include "StatsBar.hpp"

class QLineEdit;
class QProcess;

class MainWindow : public QMainWindow {
public:
    explicit MainWindow(ApiClient *api, QWidget *parent = nullptr);
    void wireCoverUpdates();

    void setServerProcess(QProcess *process) { serverProcess_ = process; }

protected:
    void paintEvent(QPaintEvent *event) override;

private:
    void buildUi();
    QWidget *buildTopBar();
    QWidget *buildRail();
    QWidget *buildInfoPanel();
    QWidget *buildBottomBar();

    void applyPayload(const LibraryPayload &payload);
    void rebuildRail();
    void onRailRowChanged(int row);
    void updatePanel(const GameEntry &game);
    void refresh(bool announceErrors);
    void playSelected();
    void stopSelected();
    void showProfiles();
    void showToast(const QString &message);

    QString selectedId() const;
    GameEntry gameForId(const QString &id) const;
    QString currentGameFolder() const;

    ApiClient *api_;
    Covers *covers_;
    LibraryPayload payload_;
    QString gamesDir_;
    bool betaOn_ = false;
    bool sortRecent_ = true;
    bool serverStartedHere_ = false;
    QProcess *serverProcess_ = nullptr;
    QSet<QString> knownGames_;
    QStringList visibleIds_;
    QString selectedStoreUrl_;

    QListWidget *rail_ = nullptr;
    QLineEdit *search_ = nullptr;
    QPushButton *profileButton_ = nullptr;
    QPushButton *betaButton_ = nullptr;
    QPushButton *sortButton_ = nullptr;
    QFrame *panel_ = nullptr;
    QLabel *panelTitle_ = nullptr;
    QLabel *panelMeta_ = nullptr;
    QLabel *chipGenre_ = nullptr;
    QLabel *chipState_ = nullptr;
    QPushButton *playButton_ = nullptr;
    QPushButton *stopButton_ = nullptr;
    QPushButton *folderButton_ = nullptr;
    QPushButton *storeButton_ = nullptr;
    QLabel *panelDescription_ = nullptr;
    StatsBar *stats_ = nullptr;
    QLabel *toast_ = nullptr;
    QTimer *toastTimer_ = nullptr;
};
