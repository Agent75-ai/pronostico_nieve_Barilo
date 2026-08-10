package com.barisnow.app;

import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

public final class BariSnowDailyWidgetProvider extends BariSnowWidgetProvider {
    @Override
    protected Class<? extends AppWidgetProvider> providerClass() {
        return BariSnowDailyWidgetProvider.class;
    }

    @Override
    protected int layoutResId() {
        return R.layout.widget_barisnow_daily;
    }

    @Override
    protected int refreshRequestCode() {
        return 1202;
    }

    @Override
    protected RemoteViews loadingViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "ACTUALIZANDO…");
        views.setTextViewText(R.id.day1_state, "—");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "Preparando pronóstico…");
        return views;
    }

    @Override
    protected RemoteViews errorViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "SIN CONEXIÓN");
        views.setTextViewText(R.id.day1_state, "—");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "Sin conexión · tocá ↻");
        return views;
    }

    @Override
    protected RemoteViews dataViews(Context context, WidgetData data) {
        RemoteViews views = baseViews(context, data.place);
        applyHour(views, R.id.now_icon, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, data.now);
        applyDay(views, true, data.tomorrow);
        applyDay(views, false, data.dayAfter);
        views.setTextViewText(R.id.widget_updated, data.updated);
        return views;
    }
}
