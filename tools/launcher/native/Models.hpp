#pragma once

#include <QJsonArray>
#include <QJsonObject>
#include <QList>
#include <QString>
#include <QUrl>

struct GameEntry {
    QString id;
    QString folder;
    QString title;
    bool hasIcon = false;
    bool hasPic = false;
    QString lastPlayed;
    double minutes = 0.0;
    int launches = 0;
    double daily[7] = {0, 0, 0, 0, 0, 0, 0};
    bool running = false;
    QString description;
    QString artUrl;
    bool showcase = false;
    bool installed = false;
    QString genre;
    QString storeUrl;

    QString coverUrl() const
    {
        if (!artUrl.isEmpty()) return artUrl;
        if (hasIcon) return QStringLiteral("/api/icon/") + QUrl::toPercentEncoding(id);
        return QString();
    }
};

struct ShowcaseEntry {
    QString id;
    QString title;
    QString description;
    QString art;
    QString genre;
    bool beta = false;
    QString storeUrl;
    bool installed = false;

    GameEntry asGame() const
    {
        GameEntry game;
        game.id = id;
        game.title = title;
        game.description = description;
        game.artUrl = art;
        game.genre = genre;
        game.storeUrl = storeUrl;
        game.installed = installed;
        game.showcase = true;
        return game;
    }
};

struct ProfileEntry {
    QString id;
    QString name;
};

struct LibraryPayload {
    QList<GameEntry> games;
    QList<ShowcaseEntry> production;
    QList<ShowcaseEntry> beta;
    QList<ProfileEntry> profiles;
    QString activeProfile;
    QString gamesDir;
    bool runnerFound = false;
    QString version;
};

inline QString normalizedTitle(const QString &text)
{
    QString flat;
    flat.reserve(text.size());
    for (const QChar &character : text) {
        const QChar lower = character.toLower();
        if (lower.isLetterOrNumber()) flat.append(lower);
    }
    return flat;
}
