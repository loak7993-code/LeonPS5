#pragma once

#include <QWidget>

class StatsBar : public QWidget {
public:
    explicit StatsBar(QWidget *parent = nullptr);

    void setValues(double minutes, int launches, const double daily[7]);

protected:
    void paintEvent(QPaintEvent *event) override;
    QSize minimumSizeHint() const override;

private:
    double minutes_ = 0.0;
    int launches_ = 0;
    double daily_[7] = {0, 0, 0, 0, 0, 0, 0};
};
