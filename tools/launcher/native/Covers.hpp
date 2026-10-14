#pragma once

#include <QHash>
#include <QNetworkAccessManager>
#include <QObject>
#include <QPixmap>
#include <QSize>
#include <QUrl>

// Downloads and caches cover art; answers every request synchronously with a
// generated fallback and repaints the requester when the real art lands.
class Covers : public QObject {
    Q_OBJECT

public:
    explicit Covers(QObject *parent = nullptr);

    void setBaseUrl(const QUrl &base) { baseUrl_ = base; }
    QPixmap coverFor(const QString &title, const QString &key, const QString &artUrl,
                     const QUrl &iconUrl, const QSize &size);

signals:
    void updated(const QString &key);

private:
    QNetworkAccessManager manager_;
    QHash<QString, QPixmap> cache_;
    QUrl baseUrl_;
};
