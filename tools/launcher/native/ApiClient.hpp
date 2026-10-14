#pragma once

#include <functional>

#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QObject>
#include <QString>
#include <QUrl>

#include "Models.hpp"

class ApiClient : public QObject {
    Q_OBJECT

public:
    explicit ApiClient(const QUrl &base, QObject *parent = nullptr);

    void fetchLibrary(std::function<void(LibraryPayload, QString)> callback);
    void launch(const QString &id, std::function<void(QString command, QString error)> callback);
    void stopGame(const QString &id, std::function<void(QString statusOrError)> callback);
    void profileAction(const QString &action, const QString &id, const QString &name,
                       std::function<void(LibraryPayload, QString)> callback);
    QUrl iconUrl(const QString &id) const;
    QUrl base() const { return base_; }

private:
    void post(const QString &path, const QJsonObject &body,
              std::function<void(QJsonObject, QString)> callback);

    QUrl base_;
    QNetworkAccessManager manager_;
};
