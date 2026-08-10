package com.barisnow.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;

public class BariSnowWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_REFRESH = "com.barisnow.app.ACTION_WIDGET_REFRESH";
    public static final String PREFS = "barisnow_native";
    public static final String PREF_ZONE_KEY = "zone_key";
    public static final String PREF_ZONE_NAME = "zone_name";

    private static final String DEFAULT_ZONE = "lago_moreno";
    private static final Map<String, Place> PLACES = new HashMap<>();

    static {
        PLACES.put("bustillo_95", new Place("bustillo_95", "Bustillo km 9,5", -41.11369, -71.41412, 800));
        PLACES.put("lago_moreno", new Place("lago_moreno", "Lago Moreno", -41.1000, -71.4500, 778));
        PLACES.put("melipal", new Place("melipal", "Melipal", -41.1240, -71.3660, 790));
        PLACES.put("centro", new Place("centro", "Centro", -41.1343, -71.3085, 770));
        PLACES.put("las_victorias", new Place("las_victorias", "Las Victorias", -41.1355, -71.2540, 780));
        PLACES.put("dina_huapi", new Place("dina_huapi", "Dina Huapi", -41.0705, -71.1635, 780));
        PLACES.put("cerro_catedral", new Place("cerro_catedral", "Cerro Catedral", -41.1677, -71.4381, 1030));
        PLACES.put("llao_llao", new Place("llao_llao", "Llao Llao", -41.0525, -71.5310, 785));
        PLACES.put("el_alto", new Place("el_alto", "El Alto", -41.1678, -71.3389, 860));
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
                        ids = manager.getAppWidgetIds(new ComponentName(appContext, BariSnowWidgetProvider.class));
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
        Intent intent = new Intent(context, BariSnowWidgetProvider.class);
        intent.setAction(ACTION_REFRESH);
        context.sendBroadcast(intent);
    }

    private static void refreshWidgets(Context context, AppWidgetManager manager, int[] ids) {
        if (ids == null || ids.length == 0) return;
        Place place = selectedPlace(context);
        for (int id : ids) manager.updateAppWidget(id, loadingViews(context, place));

        try {
            JSONObject json = fetchForecast(place);
            WidgetData data = parseForecast(json, place);
            saveCache(context, place.key, json.toString());
            for (int id : ids) manager.updateAppWidget(id, dataViews(context, data));
        } catch (Exception error) {
            try {
                JSONObject cached = loadCache(context, place.key);
                if (cached != null) {
                    WidgetData data = parseForecast(cached, place);
                    data.updated = "Dato guardado";
                    for (int id : ids) manager.updateAppWidget(id, dataViews(context, data));
                    return;
                }
            } catch (Exception ignored) {
            }
            for (int id : ids) manager.updateAppWidget(id, errorViews(context, place));
        }
    }

    private static RemoteViews baseViews(Context context, Place place) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_barisnow);
        views.setTextViewText(R.id.widget_zone, place.name);

        Intent openIntent = new Intent(context, MainActivity.class);
        PendingIntent openPending = PendingIntent.getActivity(
                context, 1001, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, openPending);

        Intent refreshIntent = new Intent(context, BariSnowWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPending = PendingIntent.getBroadcast(
                context, 1002, refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_refresh, refreshPending);
        return views;
    }

    private static RemoteViews loadingViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        views.setTextViewText(R.id.now_state, "ACTUALIZANDO…");
        views.setTextViewText(R.id.now_temp, "—");
        views.setTextViewText(R.id.now_feels, "Sens. —");
        views.setTextViewText(R.id.day1_state, "—");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "Buscando datos…");
        return views;
    }

    private static RemoteViews errorViews(Context context, Place place) {
        RemoteViews views = baseViews(context, place);
        views.setTextViewText(R.id.now_icon, "❄");
        views.setTextViewText(R.id.now_state, "SIN CONEXIÓN");
        views.setTextViewText(R.id.now_temp, "—");
        views.setTextViewText(R.id.now_feels, "Sens. —");
        views.setTextViewText(R.id.day1_state, "Tocá ↻ para reintentar");
        views.setTextViewText(R.id.day2_state, "—");
        views.setTextViewText(R.id.widget_updated, "No se pudo actualizar");
        return views;
    }

    private static RemoteViews dataViews(Context context, WidgetData data) {
        RemoteViews views = baseViews(context, data.place);

        views.setTextViewText(R.id.now_icon, iconFor(data.nowState));
        views.setTextViewText(R.id.now_state, data.nowState);
        views.setTextViewText(R.id.now_temp, formatTemp(data.nowTemp));
        views.setTextViewText(R.id.now_feels, "Sens. " + formatTemp(data.nowFeels));
        views.setTextColor(R.id.now_state, colorFor(data.nowState));

        applyDay(views, true, data.tomorrow);
        applyDay(views, false, data.dayAfter);
        views.setTextViewText(R.id.widget_updated, data.updated);
        return views;
    }

    private static void applyDay(RemoteViews views, boolean first, DayData day) {
        int iconId = first ? R.id.day1_icon : R.id.day2_icon;
        int stateId = first ? R.id.day1_state : R.id.day2_state;
        int tempId = first ? R.id.day1_temp : R.id.day2_temp;
        int feelsId = first ? R.id.day1_feels : R.id.day2_feels;
        int snowId = first ? R.id.day1_snow : R.id.day2_snow;

        views.setTextViewText(iconId, iconFor(day.state));
        views.setTextViewText(stateId, day.state);
        views.setTextViewText(tempId, formatRange(day.minTemp, day.maxTemp));
        views.setTextViewText(feelsId, "Sens. " + formatRange(day.minFeels, day.maxFeels));
        views.setTextViewText(snowId, "❄ " + formatSnow(day.snowCm));
        views.setTextColor(stateId, colorFor(day.state));
    }

    private static Place selectedPlace(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String key = prefs.getString(PREF_ZONE_KEY, DEFAULT_ZONE);
        Place place = PLACES.get(key);
        return place != null ? place : PLACES.get(DEFAULT_ZONE);
    }

    private static JSONObject fetchForecast(Place place) throws Exception {
        String timezone = Uri.encode("America/Argentina/Buenos_Aires");
        String current = "temperature_2m,apparent_temperature,weather_code,snowfall";
        String daily = "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,snowfall_sum";
        String endpoint = String.format(Locale.US,
                "https://api.open-meteo.com/v1/forecast?latitude=%.5f&longitude=%.5f&elevation=%d&current=%s&daily=%s&forecast_days=3&timezone=%s&temperature_unit=celsius&precipitation_unit=mm",
                place.lat, place.lon, place.elev, current, daily, timezone);

        HttpURLConnection connection = (HttpURLConnection) new URL(endpoint).openConnection();
        connection.setConnectTimeout(8000);
        connection.setReadTimeout(8000);
        connection.setRequestMethod("GET");
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("User-Agent", "BariSnowAndroidWidget/1.1");

        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status);

        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        } finally {
            connection.disconnect();
        }
        return new JSONObject(body.toString());
    }

    private static WidgetData parseForecast(JSONObject json, Place place) {
        JSONObject current = json.optJSONObject("current");
        JSONObject daily = json.optJSONObject("daily");
        if (current == null || daily == null) throw new IllegalArgumentException("Datos incompletos");

        WidgetData data = new WidgetData();
        data.place = place;
        data.nowTemp = current.optDouble("temperature_2m", Double.NaN);
        data.nowFeels = current.optDouble("apparent_temperature", Double.NaN);
        int currentCode = current.optInt("weather_code", -1);
        double currentSnow = current.optDouble("snowfall", 0);
        data.nowState = currentState(currentCode, currentSnow);

        data.tomorrow = readDay(daily, 1);
        data.dayAfter = readDay(daily, 2);
        data.updated = "Actualizado " + localClock();
        return data;
    }

    private static DayData readDay(JSONObject daily, int index) {
        DayData day = new DayData();
        int code = arrayInt(daily.optJSONArray("weather_code"), index, -1);
        day.minTemp = arrayDouble(daily.optJSONArray("temperature_2m_min"), index);
        day.maxTemp = arrayDouble(daily.optJSONArray("temperature_2m_max"), index);
        day.minFeels = arrayDouble(daily.optJSONArray("apparent_temperature_min"), index);
        day.maxFeels = arrayDouble(daily.optJSONArray("apparent_temperature_max"), index);
        day.snowCm = Math.max(0, arrayDouble(daily.optJSONArray("snowfall_sum"), index, 0));
        day.state = dailyState(code, day.snowCm);
        return day;
    }

    private static String currentState(int code, double snow) {
        if (code == 85 || code == 86) return "CHAPARRÓN DE NIEVE";
        if (isSnowCode(code) || snow > 0.005) return "NIEVA";
        return "SIN NIEVE";
    }

    private static String dailyState(int code, double snowCm) {
        if (code == 85 || code == 86) return "CHAPARRONES DE NIEVE";
        if (snowCm >= 2.0) return "NEVADA";
        if (isSnowCode(code) || snowCm >= 0.05) return "NIEVE";
        return "SIN NIEVE";
    }

    private static boolean isSnowCode(int code) {
        return code == 71 || code == 73 || code == 75 || code == 77 || code == 85 || code == 86;
    }

    private static String iconFor(String state) {
        if (state.contains("CHAPARR")) return "🌨";
        if (state.contains("NIEVE") || state.contains("NEVADA") || state.equals("NIEVA")) return "❄";
        return "☁";
    }

    private static int colorFor(String state) {
        if (state.contains("NEVADA")) return Color.rgb(255, 183, 77);
        if (state.contains("NIEVE") || state.equals("NIEVA")) return Color.rgb(120, 223, 255);
        return Color.rgb(167, 196, 216);
    }

    private static String formatTemp(double value) {
        if (Double.isNaN(value)) return "—";
        return String.format(Locale.getDefault(), "%.0f°", value);
    }

    private static String formatRange(double min, double max) {
        if (Double.isNaN(min) || Double.isNaN(max)) return "—";
        return String.format(Locale.getDefault(), "%.0f° / %.0f°", min, max);
    }

    private static String formatSnow(double cm) {
        if (Double.isNaN(cm) || cm < 0.05) return "0 cm";
        if (cm < 1) return String.format(Locale.getDefault(), "%.1f cm", cm);
        return String.format(Locale.getDefault(), "%.0f cm", cm);
    }

    private static String localClock() {
        SimpleDateFormat format = new SimpleDateFormat("HH:mm", Locale.getDefault());
        format.setTimeZone(TimeZone.getTimeZone("America/Argentina/Buenos_Aires"));
        return format.format(new Date());
    }

    private static double arrayDouble(JSONArray array, int index) {
        return arrayDouble(array, index, Double.NaN);
    }

    private static double arrayDouble(JSONArray array, int index, double fallback) {
        if (array == null || index < 0 || index >= array.length() || array.isNull(index)) return fallback;
        return array.optDouble(index, fallback);
    }

    private static int arrayInt(JSONArray array, int index, int fallback) {
        if (array == null || index < 0 || index >= array.length() || array.isNull(index)) return fallback;
        return array.optInt(index, fallback);
    }

    private static void saveCache(Context context, String zoneKey, String json) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString("widget_cache_" + zoneKey, json)
                .apply();
    }

    private static JSONObject loadCache(Context context, String zoneKey) {
        String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .getString("widget_cache_" + zoneKey, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (Exception ignored) {
            return null;
        }
    }

    private static final class Place {
        final String key;
        final String name;
        final double lat;
        final double lon;
        final int elev;

        Place(String key, String name, double lat, double lon, int elev) {
            this.key = key;
            this.name = name;
            this.lat = lat;
            this.lon = lon;
            this.elev = elev;
        }
    }

    private static final class WidgetData {
        Place place;
        String nowState;
        double nowTemp;
        double nowFeels;
        DayData tomorrow;
        DayData dayAfter;
        String updated;
    }

    private static final class DayData {
        String state;
        double minTemp;
        double maxTemp;
        double minFeels;
        double maxFeels;
        double snowCm;
    }
}
