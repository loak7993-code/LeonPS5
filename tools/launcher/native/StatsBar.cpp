#include "StatsBar.hpp"

#include <QFontMetrics>
#include <QPainter>

StatsBar::StatsBar(QWidget *parent)
    : QWidget(parent)
{
    setMinimumHeight(44);
}

void StatsBar::setValues(double minutes, int launches, const double daily[7])
{
    minutes_ = minutes;
    launches_ = launches;
    for (int index = 0; index < 7; ++index) daily_[index] = daily[index];
    update();
}

QSize StatsBar::minimumSizeHint() const
{
    return {280, 44};
}

void StatsBar::paintEvent(QPaintEvent *)
{
    QPainter painter(this);
    painter.setRenderHint(QPainter::Antialiasing);
    const QColor accent = palette().color(QPalette::Highlight);
    const QColor muted = palette().color(QPalette::PlaceholderText);

    QFont font = painter.font();
    font.setPixelSize(13);
    font.setBold(true);
    painter.setFont(font);

    const QString played = minutes_ >= 120.0
        ? QString::number(qRound(minutes_ / 6.0) / 10.0) + QStringLiteral(" h")
        : QString::number(qRound(minutes_)) + QStringLiteral(" min");
    int x = 0;
    painter.setPen(palette().color(QPalette::WindowText));
    painter.drawText(QRect(x, 0, 78, 22), Qt::AlignBottom | Qt::AlignLeft, played);
    QFont small = font;
    small.setBold(false);
    small.setPixelSize(10);
    painter.setFont(small);
    painter.setPen(muted);
    painter.drawText(QRect(x, 22, 78, 14), Qt::AlignLeft, QStringLiteral("played"));
    x += 84;

    painter.setFont(font);
    painter.setPen(palette().color(QPalette::WindowText));
    painter.drawText(QRect(x, 0, 60, 22), Qt::AlignBottom | Qt::AlignLeft, QString::number(launches_));
    painter.setFont(small);
    painter.setPen(muted);
    painter.drawText(QRect(x, 22, 60, 14), Qt::AlignLeft, QStringLiteral("launches"));
    x += 66;

    double peak = 0.5;
    for (const double value : daily_) peak = qMax(peak, value);
    const int barArea = width() - x - 52;
    const int barWidth = qMax(4, barArea / 7 - 4);
    const int baseline = height() - 4;
    for (int index = 0; index < 7; ++index) {
        const int barHeight = qMax(3, int(double(baseline - 2) * daily_[index] / peak));
        QRect bar(x + index * (barWidth + 4), baseline - barHeight, barWidth, barHeight);
        painter.setPen(Qt::NoPen);
        painter.setBrush(accent);
        painter.drawRoundedRect(bar, 2, 2);
    }
    painter.setFont(small);
    painter.setPen(muted);
    painter.drawText(QRect(width() - 48, baseline - 14, 48, 14), Qt::AlignRight, QStringLiteral("7 days"));
}
