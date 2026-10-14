#include "Covers.hpp"

#include <QNetworkReply>

#include <QDateTime>
#include <QPainter>
#include <QPainterPath>

namespace {
QPixmap generatedCover(const QString &title, const QString &key, const QSize &size)
{
    static const QColor palettes[][3] = {
        {QColor(0x0a1440), QColor(0x1646c2), QColor(0x4d8bff)},
        {QColor(0x07223a), QColor(0x0d5f86), QColor(0x3fa9c9)},
        {QColor(0x241307), QColor(0x7c3a12), QColor(0xe08a3c)},
        {QColor(0x062b26), QColor(0x0d5f52), QColor(0x39b49a)},
        {QColor(0x0b1030), QColor(0x2a3f7d), QColor(0x7d9bff)},
    };
    quint32 hash = 0;
    for (const QChar character : key) hash = hash * 31u + character.unicode();
    const auto &palette = palettes[hash % 5];

    QPixmap pixmap(size);
    pixmap.fill(Qt::black);
    QPainter painter(&pixmap);
    painter.setRenderHint(QPainter::Antialiasing);
    QLinearGradient gradient(0, 0, size.width(), size.height());
    gradient.setColorAt(0, palette[0]);
    gradient.setColorAt(1, palette[1]);
    painter.fillRect(0, 0, size.width(), size.height(), gradient);

    QRadialGradient halo(size.width() * 0.7, size.height() * 0.25, size.width() * 0.5);
    halo.setColorAt(0, QColor(palette[2].red(), palette[2].green(), palette[2].blue(), 110));
    halo.setColorAt(1, QColor(0, 0, 0, 0));
    painter.fillRect(0, 0, size.width(), size.height(), halo);

    painter.setPen(QPen(palette[2], 2));
    painter.setBrush(Qt::NoBrush);
    for (int index = 1; index <= 3; ++index) {
        const int radius = size.width() / 9 * index;
        painter.drawEllipse(QPoint(size.width() * 7 / 10, size.height() / 4), radius, radius);
    }
    painter.setBrush(palette[2]);
    painter.setPen(Qt::NoPen);
    painter.drawEllipse(QPoint(size.width() * 7 / 10, size.height() / 4), size.width() / 26, size.width() / 26);

    const QString initial = title.isEmpty() ? QStringLiteral("?") : QString(title.at(0).toUpper());
    QFont font = painter.font();
    font.setPixelSize(size.height() / 5);
    font.setBold(true);
    painter.setFont(font);
    painter.setPen(QColor(255, 255, 255, 235));
    QPainterPath shadow;
    shadow.addText(size.width() / 2 - size.width() / 11 + 2, size.height() / 2 + size.height() / 10 + 2, font, initial);
    painter.fillPath(shadow, QColor(0, 0, 0, 140));
    painter.drawText(QRect(0, 0, size.width(), size.height()), Qt::AlignCenter, initial);
    return pixmap;
}
}

Covers::Covers(QObject *parent)
    : QObject(parent), manager_(new QNetworkAccessManager(this))
{
}

QPixmap Covers::coverFor(const QString &title, const QString &key, const QString &artUrl,
                         const QUrl &iconUrl, const QSize &size)
{
    const QString cacheKey = key + QStringLiteral("@") + QString::number(size.width());
    const auto cached = cache_.constFind(cacheKey);
    if (cached != cache_.constEnd()) return cached.value();

    const QPixmap fallback = generatedCover(title, key, size);
    cache_.insert(cacheKey, fallback);
    if (artUrl.isEmpty() && iconUrl.isEmpty()) return fallback;

    QUrl url = artUrl.isEmpty() ? iconUrl : QUrl(artUrl);
    if (url.isRelative()) url = baseUrl_.resolved(url);
    QNetworkRequest request(url);
    request.setAttribute(QNetworkRequest::RedirectPolicyAttribute, QNetworkRequest::NoLessSafeRedirectPolicy);
    QNetworkReply *reply = manager_.get(request);
    connect(reply, &QNetworkReply::finished, this, [this, reply, cacheKey, title, key, size, fallback] {
        reply->deleteLater();
        QPixmap downloaded;
        downloaded.loadFromData(reply->readAll());
        if (downloaded.isNull()) return;
        const QPixmap scaled = downloaded.scaled(size, Qt::KeepAspectRatioByExpanding, Qt::SmoothTransformation);
        cache_.insert(cacheKey, scaled);
        if (onUpdate) onUpdate(key);
    });
    return fallback;
}
