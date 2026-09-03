package com.barisnow.app;

import android.appwidget.AppWidgetProvider;

public final class BariSnowComplete4x3WidgetProvider extends BariSnowWidgetProvider {
    @Override
    protected Class<? extends AppWidgetProvider> providerClass() {
        return BariSnowComplete4x3WidgetProvider.class;
    }

    @Override
    protected int layoutResId() {
        return R.layout.widget_barisnow_complete_4x3;
    }

    @Override
    protected int refreshRequestCode() {
        return 1302;
    }
}
