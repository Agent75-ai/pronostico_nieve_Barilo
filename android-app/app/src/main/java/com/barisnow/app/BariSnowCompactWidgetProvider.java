package com.barisnow.app;

import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

public final class BariSnowCompactWidgetProvider extends BariSnowWidgetProvider {
    @Override
    protected Class<? extends AppWidgetProvider> providerClass() {
        return BariSnowCompactWidgetProvider.class;
    }

    @Override
    protected int layoutResId() {
        return R.layout.widget_barisnow_compact;
    }

    @Override
    protected int refreshRequestCode() {
        return 1102;
    }

    @Override
    protected RemoteViews loadingViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "ACTUALIZANDO…");
        setHourLoading(views, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, "—");
        setHourLoading(views, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, "—");
        setHourLoading(views, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, "—");
        views.setTextViewText(R.id.widget_updated, "Preparando…");
        return views;
    }

    @Override
    protected RemoteViews errorViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "SIN CONEXIÓN");
        setHourLoading(views, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, "—");
        setHourLoading(views, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, "—");
        setHourLoading(views, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, "—");
        views.setTextViewText(R.id.widget_updated, "Sin conexión · tocá ↻");
        return views;
    }

    @Override
    protected RemoteViews dataViews(Context context, WidgetData data) {
        RemoteViews views = baseViews(context, data.place);
        applyHour(views, R.id.now_icon, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, data.now);
        applyHour(views, R.id.plus1_icon, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, data.plus1);
        applyHour(views, R.id.plus2_icon, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, data.plus2);
        applyHour(views, R.id.plus3_icon, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, data.plus3);
        applyRate(views, R.id.plus1_rate, data.plus1);
        applyRate(views, R.id.plus2_rate, data.plus2);
        applyRate(views, R.id.plus3_rate, data.plus3);
        views.setTextViewText(R.id.widget_updated, data.updated);
        return views;
    }
}
