package com.barisnow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class BariSnowWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.barisnow.app.ACTION_WIDGET_REFRESH";
    public static final String PREFS = "barisnow_native";
    public static final String PREF_ZONE_KEY = "zone_key";
    public static final String PREF_ZONE_NAME = "zone_name";

    private static final String DEFAULT_ZONE = "lago_moreno";
    private static final Map<String, Place> PLACES = new HashMap<>();

    static {
        PLACES.put("bustillo_95", new Place("bustillo_95", "Bustillo km 9,5 / Centro Atómico", -41.11369, -71.41412, 800, .44, -.1));
        PLACES.put("lago_moreno", new Place("lago_moreno", "Barrio Lago Moreno", -41.1000, -71.4500, 778, .42, 0));
        PLACES.put("melipal", new Place("melipal", "Barrio Melipal", -41.1240, -71.3660, 790, .34, 0));
        PLACES.put("centro", new Place("centro", "Barrio Centro", -41.1343, -71.3085, 770, .24, .2));
        PLACES.put("las_victorias", new Place("las_victorias", "Las Victorias", -41.1355, -71.2540, 780, .18, .1));
        PLACES.put("dina_huapi", new Place("dina_huapi", "Dina Huapi", -41.0705, -71.1635, 780, .12, .1));
        PLACES.put("cerro_catedral", new Place("cerro_catedral", "Cerro Catedral", -41.1677, -71.4381, 1030, .58, -1.4));
        PLACES.put("llao_llao", new Place("llao_llao", "Llao Llao", -41.0525, -71.5310, 785, .48, -.1));
        PLACES.put("el_alto", new Place("el_alto", "El Alto / Frutillar / 2 de Abril", -41.1678, -71.3389, 860, .32, -.4));
    }

    protected Class<? extends AppWidgetProvider> providerClass() {
        return BariSnowWidgetProvider.class;
    }

    protected int layoutResId() {
        return R.layout.widget_barisnow;
    }

    protected int refreshRequestCode() {
        return 1002;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (AppWidgetManager.ACTION_APPWIDGET_UPDATE.equals(action) || ACTION_REFRESH.equals(action)) {
            final PendingResult pendingResult = goAsync();
            final Context appContext = context.getApplicationContext();
            new Thread(() -> {
                try {
                    AppWidgetManager manager = AppWidgetManager.getInstance(appContext);
                    int[] ids = intent.getIntArrayExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS);
                    if (ids == null || ids.length == 0) {
                        ids = manager.getAppWidgetIds(new ComponentName(appContext, providerClass()));
                    }
                    refreshWidgets(appContext, manager, ids);
                } finally {
                    pendingResult.finish();
                }
            }, "BariSnowWidgetRefresh").start();
            return;
        }
        super.onReceive(context, intent);
    }

    public static void requestRefresh(Context context) {
        sendRefresh(context, BariSnowWidgetProvider.class);
        sendRefresh(context, BariSnowComplete4x3WidgetProvider.class);
        sendRefresh(context, BariSnowCompactWidgetProvider.class);
        sendRefresh(context, BariSnowDailyWidgetProvider.class);
    }

    private static void sendRefresh(Context context, Class<? extends AppWidgetProvider> cls) {
        Intent intent = new Intent(context, cls);
        intent.setAction(ACTION_REFRESH);
        context.sendBroadcast(intent);
    }

    private void refreshWidgets(Context context, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        Place place = selectedPlace(context);
        for (int id : ids) manager.updateAppWidget(id, loadingViews(context, place));

        try {
            WidgetData data = BariSnowForecastEngine.fetch(place);
            try {
                BariSnowRainEngine.enrich(data, place);
            } catch (Exception ignored) {
                // La nieve sigue disponible aunque falle el suplemento de precipitación/cielo.
            }
            saveCache(context, place.key, BariSnowForecastEngine.toCache(data));
            for (int id : ids) manager.updateAppWidget(id, dataViews(context, data));
        } catch (Exception error) {
            try {
                String cached = loadCache(context, place.key);
                if (cached != null) {
                    WidgetData data = BariSnowForecastEngine.fromCache(cached, place);
                    data.updated = "Dato guardado";
                    for (int id : ids) manager.updateAppWidget(id, dataViews(context, data));
                    return;
                }
            } catch (Exception ignored) {
            }
            for (int id : ids) manager.updateAppWidget(id, errorViews(context, place));
        }
    }

    protected RemoteViews baseViews(Context context, Place place) {
        RemoteViews views = new RemoteViews(context.getPackageName(), layoutResId());
        views.setTextViewText(R.id.widget_zone, place.name);

        Intent openIntent = new Intent(context, MainActivity.class);
        PendingIntent openPending = PendingIntent.getActivity(
                context, 1001, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, openPending);

        Intent refreshIntent = new Intent(context, providerClass());
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPending = PendingIntent.getBroadcast(
                context, refreshRequestCode(), refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshPending);
        return views;
    }

    protected RemoteViews loadingViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "ACTUALIZANDO…");
        setHourLoading(views, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, "—");
        setHourLoading(views, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, "—");
        setHourLoading(views, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, "—");
        views.setTextViewText(R.id.day1_state, "—");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "Preparando pronóstico…");
        return views;
    }

    protected RemoteViews errorViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        setHourLoading(views, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, "SIN CONEXIÓN");
        setHourLoading(views, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, "—");
        setHourLoading(views, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, "—");
        setHourLoading(views, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, "—");
        views.setTextViewText(R.id.day1_state, "—");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "Sin conexión · tocá ↻");
        return views;
    }

    protected RemoteViews dataViews(Context context, WidgetData data) {
        RemoteViews views = baseViews(context, data.place);
        applyHour(views, R.id.now_icon, R.id.now_clock, R.id.now_state, R.id.now_temp, R.id.now_feels, data.now);
        applyHour(views, R.id.plus1_icon, R.id.plus1_clock, R.id.plus1_state, R.id.plus1_temp, R.id.plus1_feels, data.plus1);
        applyHour(views, R.id.plus2_icon, R.id.plus2_clock, R.id.plus2_state, R.id.plus2_temp, R.id.plus2_feels, data.plus2);
        applyHour(views, R.id.plus3_icon, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, data.plus3);
        applyRate(views, R.id.now_rate, data.now);
        applyRate(views, R.id.plus1_rate, data.plus1);
        applyRate(views, R.id.plus2_rate, data.plus2);
        applyRate(views, R.id.plus3_rate, data.plus3);
        applyDay(views, true, data.tomorrow);
        applyDay(views, false, data.dayAfter);
        views.setTextViewText(R.id.widget_updated, data.updated);
        return views;
    }

    protected static void setHourLoading(RemoteViews views, int clockId, int stateId, int tempId, int feelsId, String state) {
        views.setTextViewText(clockId, "—");
        views.setTextViewText(stateId, state);
        views.setTextViewText(tempId, "—");
        views.setTextViewText(feelsId, "—");
    }

    protected static void applyHour(RemoteViews views, int iconId, int clockId, int stateId, int tempId, int feelsId, HourData hour) {
        views.setTextViewText(iconId, iconFor(hour.state));
        views.setTextViewText(clockId, hour.clock);
        views.setTextViewText(stateId, displayState(hour.state));
        views.setTextViewText(tempId, formatTemp(hour.temp));
        views.setTextViewText(feelsId, formatFeels(hour.feels));
        views.setTextColor(stateId, colorFor(hour.state));
    }

    protected static void applyRate(RemoteViews views, int rateId, HourData hour) {
        views.setTextViewText(rateId, formatHourlyPrecip(hour));
    }

    protected static String formatHourlyPrecip(HourData hour) {
        if (hour == null) return "–";
        double rain = hour.rainRateMmH;
        double snow = hour.snowRateCmH;
        boolean rainMeasured = !Double.isNaN(rain) && !Double.isInfinite(rain) && rain >= .05;
        boolean snowMeasured = !Double.isNaN(snow) && !Double.isInfinite(snow) && snow >= .03;
        String state = hour.state == null ? "" : hour.state;

        if (!rainMeasured && !snowMeasured) return "–";

        boolean mixedState = "LLUVIA Y NIEVE".equals(state)
                || state.contains("PRECIPITACIÓN MIXTA");
        boolean snowState = state.contains("NIEVE") || state.contains("COPOS")
                || state.contains("GRANULADA");
        boolean rainState = isRainState(state);

        if (mixedState && rainMeasured && snowMeasured) {
            // Aproximación 10:1: 1 cm/h de nieve ~ 1 mm/h de agua equivalente.
            return snow >= rain ? formatSnowRate(snow) : formatRainRate(rain);
        }
        if (snowState && snowMeasured) return formatSnowRate(snow);
        if (rainState && rainMeasured) return formatRainRate(rain);
        if (rainMeasured && !snowMeasured) return formatRainRate(rain);
        if (snowMeasured && !rainMeasured) return formatSnowRate(snow);
        return snowState ? formatSnowRate(snow) : formatRainRate(rain);
    }

    private static String formatRainRate(double rain) {
        if (Double.isNaN(rain) || Double.isInfinite(rain) || rain < .05) return "–";
        return "🌧 " + (rain < 10
                ? String.format(Locale.getDefault(), "%.1f mm/h", rain)
                : String.format(Locale.getDefault(), "%.0f mm/h", rain));
    }

    private static String formatSnowRate(double snow) {
        if (Double.isNaN(snow) || Double.isInfinite(snow) || snow < .03) return "–";
        if (snow < .12) return "❄ Traza";
        return "❄ " + (snow < 1
                ? String.format(Locale.getDefault(), "%.1f cm/h", snow)
                : String.format(Locale.getDefault(), "%.0f cm/h", snow));
    }

    protected static void applyDay(RemoteViews views, boolean first, DayData day) {
        int iconId = first ? R.id.day1_icon : R.id.day2_icon;
        int stateId = first ? R.id.day1_state : R.id.day2_state;
        int tempId = first ? R.id.day1_temp : R.id.day2_temp;
        int feelsId = first ? R.id.day1_feels : R.id.day2_feels;
        int metricLabelId = first ? R.id.day1_metric_label : R.id.day2_metric_label;
        int metricId = first ? R.id.day1_snow : R.id.day2_snow;

        views.setTextViewText(iconId, iconFor(day.state));
        views.setTextViewText(stateId, displayState(day.state));
        views.setTextViewText(tempId, formatRange(day.minTemp, day.maxTemp));
        views.setTextViewText(feelsId, formatRange(day.minFeels, day.maxFeels));

        boolean rainDominant = isRainState(day.state);
        boolean rainMeasured = !Double.isNaN(day.rainMm) && !Double.isInfinite(day.rainMm) && day.rainMm >= .05;
        boolean snowMeasured = !Double.isNaN(day.snowCm) && !Double.isInfinite(day.snowCm) && day.snowCm >= .03;
        boolean mixed = "LLUVIA Y NIEVE".equals(day.state)
                || (rainDominant && rainMeasured && day.snowCm >= .5);
        if (!rainMeasured && !snowMeasured && !rainDominant) {
            views.setTextViewText(metricLabelId, "Lluvia / nieve");
            views.setTextViewText(metricId, "– / –");
        } else if (mixed) {
            views.setTextViewText(metricLabelId, "Lluvia / nieve");
            views.setTextViewText(metricId, formatRain(day.rainMm) + " / " + formatSnow(day.snowCm));
        } else if (rainDominant) {
            views.setTextViewText(metricLabelId, "Lluvia");
            views.setTextViewText(metricId, formatRain(day.rainMm));
        } else {
            views.setTextViewText(metricLabelId, "Nieve");
            views.setTextViewText(metricId, formatSnow(day.snowCm));
        }
        views.setTextColor(stateId, colorFor(day.state));
    }

    protected static String displayState(String state) {
        if (state == null || state.isEmpty()) return "—";
        String lower = state.toLowerCase(new Locale("es", "AR"));
        return lower.substring(0, 1).toUpperCase(new Locale("es", "AR")) + lower.substring(1);
    }

    private static boolean isRainState(String state) {
        if (state == null) return false;
        if (state.contains("NIEVE") && !"LLUVIA Y NIEVE".equals(state)) return false;
        return state.contains("LLUVIA") || state.contains("LLOVIZNA")
                || state.contains("TORMENTA") || state.contains("CHAPARRÓN");
    }

    private static Place selectedPlace(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String key = prefs.getString(PREF_ZONE_KEY, DEFAULT_ZONE);
        Place place = PLACES.get(key);
        return place != null ? place : PLACES.get(DEFAULT_ZONE);
    }

    protected static String iconFor(String state) {
        if (state == null || "SIN NIEVE".equals(state) || "SIN PRECIPITACIÓN".equals(state)) return "⛅";
        if ("SOLEADO".equals(state)) return "☀";
        if ("DESPEJADO".equals(state)) return "🌙";
        if ("MAYORMENTE DESPEJADO".equals(state)) return "🌤";
        if ("PARCIALMENTE NUBLADO".equals(state)) return "⛅";
        if ("NUBLADO".equals(state)) return "☁";
        if ("NIEBLA".equals(state)) return "🌫";
        if (state.contains("TORMENTA")) return "⛈";
        if (state.contains("LLUVIA Y NIEVE") || state.contains("NIEVE HÚMEDA") || state.contains("CHAPARRÓN DE NIEVE")) return "🌨";
        if (state.contains("CHAPARRÓN") || state.contains("LLOVIZNA")) return "🌦";
        if (state.contains("LLUVIA")) return "🌧";
        return "❄";
    }

    protected static int colorFor(String state) {
        if (state == null) return Color.rgb(91, 214, 160);
        if (state.contains("NEVADA ACUMULABLE") || state.contains("TORMENTA") || state.contains("LLUVIA CONGELANTE") || state.contains("LLUVIA FUERTE") || state.contains("CHAPARRÓN FUERTE")) return Color.rgb(241, 112, 126);
        if (state.equals("NIEVA") || state.contains("CHAPARRÓN DE NIEVE") || state.contains("LLUVIA MODERADA") || state.contains("CHAPARRÓN DE LLUVIA") || state.contains("LLOVIZNA CONGELANTE")) return Color.rgb(243, 162, 76);
        if (state.contains("HÚMEDA") || state.contains("LLUVIA Y NIEVE") || state.contains("GRANULADA") || state.contains("LLUVIA DÉBIL") || state.equals("NIEBLA")) return Color.rgb(233, 200, 92);
        if (state.contains("COPOS") || state.equals("LLOVIZNA") || state.equals("PARCIALMENTE NUBLADO") || state.equals("NUBLADO")) return Color.rgb(93, 183, 255);
        return Color.rgb(91, 214, 160);
    }

    protected static String formatTemp(double value) {
        if (Double.isNaN(value)) return "—";
        return String.format(Locale.getDefault(), "%.0f°", value);
    }

    protected static String formatFeels(double value) {
        if (Double.isNaN(value)) return "Sens. —";
        return String.format(Locale.getDefault(), "Sens. %.0f°", value);
    }

    protected static String formatRange(double min, double max) {
        if (Double.isNaN(min) || Double.isNaN(max)) return "—";
        return String.format(Locale.getDefault(), "%.0f° / %.0f°", min, max);
    }

    protected static String formatSnow(double cm) {
        if (Double.isNaN(cm) || cm < 0.03) return "–";
        if (cm < 0.12) return "Traza";
        if (cm < 1) return String.format(Locale.getDefault(), "%.1f cm", cm);
        return String.format(Locale.getDefault(), "%.0f cm", cm);
    }

    protected static String formatRain(double mm) {
        if (Double.isNaN(mm) || Double.isInfinite(mm)) return "—";
        if (mm < .05) return "–";
        if (mm < 10) return String.format(Locale.getDefault(), "%.1f mm", mm);
        return String.format(Locale.getDefault(), "%.0f mm", mm);
    }

    private static void saveCache(Context context, String zoneKey, String json) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString("widget_cache_" + zoneKey, json)
                .apply();
    }

    private static String loadCache(Context context, String zoneKey) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("widget_cache_" + zoneKey, null);
    }

    protected static final class Place {
        final String key;
        final String name;
        final double lat;
        final double lon;
        final int elev;
        final double oro;
        final double coldBias;

        Place(String key, String name, double lat, double lon, int elev, double oro, double coldBias) {
            this.key = key;
            this.name = name;
            this.lat = lat;
            this.lon = lon;
            this.elev = elev;
            this.oro = oro;
            this.coldBias = coldBias;
        }
    }

    protected static final class WidgetData {
        Place place;
        HourData now;
        HourData plus1;
        HourData plus2;
        HourData plus3;
        DayData tomorrow;
        DayData dayAfter;
        String updated;
    }

    protected static final class HourData {
        String state;
        String clock;
        double temp;
        double feels;
        double rainRateMmH = Double.NaN;
        double snowRateCmH = Double.NaN;
    }

    protected static final class DayData {
        String state;
        double minTemp;
        double maxTemp;
        double minFeels;
        double maxFeels;
        double snowCm;
        double rainMm = Double.NaN;
    }
}
