#include "ApiClient.hpp"

#include <QJsonDocument>
#include <QNetworkReply>
#include <QUrlQuery>

namespace {
GameEntry parseGame(const QJsonObject &object)
{
    GameEntry game;
    game.id = object.value(QStringLiteral("id")).toString();
    game.folder = object.value(QStringLiteral("folder")).toString();
    game.title = object.value(QStringLiteral("title")).toString();
    game.hasIcon = object.value(QStringLiteral("hasIcon")).toBool();
    game.hasPic = object.value(QStringLiteral("hasPic")).toBool();
    game.lastPlayed = object.value(QStringLiteral("lastPlayed")).toString();
    game.minutes = object.value(QStringLiteral("minutes")).toDouble();
    game.launches = object.value(QStringLiteral("launches")).toInt();
    game.running = object.value(QStringLiteral("running")).toBool();
    game.description = object.value(QStringLiteral("description")).toString();
    game.artUrl = object.value(QStringLiteral("artUrl")).toString();
    game.genre = object.value(QStringLiteral("genre")).toString();
    game.storeUrl = object.value(QStringLiteral("storeUrl")).toString();
    const QJsonArray daily = object.value(QStringLiteral("daily")).toArray();
    for (int index = 0; index < daily.size() && index < 7; ++index)
        game.daily[index] = daily.at(index).toDouble();
    return game;
}

ShowcaseEntry parseShowcase(const QJsonObject &object)
{
    ShowcaseEntry entry;
    entry.id = object.value(QStringLiteral("id")).toString();
    entry.title = object.value(QStringLiteral("title")).toString();
    entry.description = object.value(QStringLiteral("description")).toString();
    entry.art = object.value(QStringLiteral("art")).toString();
    entry.genre = object.value(QStringLiteral("genre")).toString();
    entry.beta = object.value(QStringLiteral("beta")).toBool();
    entry.storeUrl = object.value(QStringLiteral("storeUrl")).toString();
    entry.installed = object.value(QStringLiteral("installed")).toBool();
    return entry;
}
}

ApiClient::ApiClient(const QUrl &base, QObject *parent)
    : QObject(parent), base_(base)
{
}

void ApiClient::fetchLibrary(std::function<void(LibraryPayload, QString)> callback)
{
    QUrl url = base_;
    url.setPath(QStringLiteral("/api/games"));
    QNetworkReply *reply = manager_.get(QNetworkRequest(url));
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback] {
        reply->deleteLater();
        LibraryPayload payload;
        const QByteArray body = reply->readAll();
        if (reply->error() != QNetworkReply::NoError) {
            callback(payload, QStringLiteral("Network error: ") + reply->errorString());
            return;
        }
        const QJsonDocument document = QJsonDocument::fromJson(body);
        if (!document.isObject()) {
            callback(payload, QStringLiteral("The launcher server returned an invalid payload"));
            return;
        }
        const QJsonObject root = document.object();
        for (const QJsonValue &value : root.value(QStringLiteral("games")).toArray())
            payload.games.append(parseGame(value.toObject()));
        const QJsonObject showcase = root.value(QStringLiteral("showcase")).toObject();
        for (const QJsonValue &value : showcase.value(QStringLiteral("production")).toArray())
            payload.production.append(parseShowcase(value.toObject()));
        for (const QJsonValue &value : showcase.value(QStringLiteral("beta")).toArray())
            payload.beta.append(parseShowcase(value.toObject()));
        for (const QJsonValue &value : root.value(QStringLiteral("profiles")).toArray()) {
            const QJsonObject profile = value.toObject();
            payload.profiles.append({profile.value(QStringLiteral("id")).toString(), profile.value(QStringLiteral("name")).toString()});
        }
        payload.activeProfile = root.value(QStringLiteral("activeProfile")).toString();
        payload.gamesDir = root.value(QStringLiteral("gamesDir")).toString();
        payload.runnerFound = root.value(QStringLiteral("runnerFound")).toBool();
        payload.version = root.value(QStringLiteral("version")).toString();
        callback(payload, QString());
    });
}

void ApiClient::post(const QString &path, const QJsonObject &body,
                     std::function<void(QJsonObject, QString)> callback)
{
    QUrl url = base_;
    url.setPath(path);
    QNetworkRequest request(url);
    request.setHeader(QNetworkRequest::ContentTypeHeader, QStringLiteral("application/json"));
    QNetworkReply *reply = manager_.post(request, QJsonDocument(body).toJson(QJsonDocument::Compact));
    connect(reply, &QNetworkReply::finished, this, [this, reply, callback] {
        reply->deleteLater();
        const QByteArray body = reply->readAll();
        const QJsonDocument document = QJsonDocument::fromJson(body);
        if (reply->error() != QNetworkReply::NoError) {
            QString message = QStringLiteral("Request failed");
            if (document.isObject()) message = document.object().value(QStringLiteral("error")).toString(message);
            callback({}, message);
            return;
        }
        callback(document.object(), QString());
    });
}

void ApiClient::launch(const QString &id, std::function<void(QString, QString)> callback)
{
    QJsonObject body;
    body.insert(QStringLiteral("id"), id);
    post(QStringLiteral("/api/launch"), body, [callback](const QJsonObject &result, const QString &error) {
        callback(result.value(QStringLiteral("command")).toString(), error);
    });
}

void ApiClient::stopGame(const QString &id, std::function<void(QString)> callback)
{
    QJsonObject body;
    body.insert(QStringLiteral("id"), id);
    post(QStringLiteral("/api/stop"), body, [callback](const QJsonObject &result, const QString &error) {
        callback(error.isEmpty() ? result.value(QStringLiteral("status")).toString() : error);
    });
}

void ApiClient::profileAction(const QString &action, const QString &id, const QString &name,
                              std::function<void(LibraryPayload, QString)> callback)
{
    QJsonObject body;
    body.insert(QStringLiteral("action"), action);
    if (!id.isEmpty()) body.insert(QStringLiteral("id"), id);
    if (!name.isEmpty()) body.insert(QStringLiteral("name"), name);
    post(QStringLiteral("/api/profile"), body, [this, callback](const QJsonObject &, const QString &error) {
        if (!error.isEmpty()) {
            callback({}, error);
            return;
        }
        fetchLibrary([callback](LibraryPayload payload, QString fetchError) {
            callback(payload, fetchError.isEmpty() ? QString() : fetchError);
        });
    });
}

QUrl ApiClient::iconUrl(const QString &id) const
{
    QUrl url = base_;
    url.setPath(QStringLiteral("/api/icon/") + id);
    return url;
}
