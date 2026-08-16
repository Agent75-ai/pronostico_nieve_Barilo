package com.barisnow.app;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import java.util.TreeMap;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/** Adds the same rain vocabulary used by the BariSnow web UI without replacing snow states. */
final class BariSnowRainEngine {
    private static final String TZ_ID = "America/Argentina/Buenos_Aires";
    private static final TimeZone TZ = TimeZone.getTimeZone(TZ_ID);
    private static final int HTTP_TIMEOUT_MS = 6500;

    private static final Source[] SOURCES = new Source[]{
            new Source("https://api.open-meteo.com/v1/forecast", .38),
            new Source("https://api.open-meteo.com/v1/ecmwf", .28),
            new Source("https://api.open-meteo.com/v1/gfs", .22),
            new Source("https://api.open-meteo.com/v1/gem", .12)
    };

    private BariSnowRainEngine() {}

    static void enrich(BariSnowWidgetProvider.WidgetData data, BariSnowWidgetProvider.Place place) throws Exception {
        if (data == null) return;
        RainData rain = fetch(place);
        replaceDrySnowState(data.now, rain.now);
        replaceDrySnowState(data.plus1, rain.plus1);
        replaceDrySnowState(data.plus2, rain.plus2);
        replaceDrySnowState(data.plus3, rain.plus3);
        replaceDrySnowState(data.tomorrow, rain.tomorrow);
        replaceDrySnowState(data.dayAfter, rain.dayAfter);
    }

    private static void replaceDrySnowState(BariSnowWidgetProvider.HourData h, String rainState) {
        if (h != null && "SIN NIEVE".equals(h.state) && rainState != null) h.state = rainState;
    }

    private static void replaceDrySnowState(BariSnowWidgetProvider.DayData d, String rainState) {
        if (d != null && "SIN NIEVE".equals(d.state) && rainState != null) d.state = rainState;
    }

    private static RainData fetch(BariSnowWidgetProvider.Place place) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(5);
        List<Future<Pack>> futures = new ArrayList<>();
        for (Source source : SOURCES) futures.add(pool.submit(new SourceTask(source, place)));
        Future<JSONObject> currentFuture = pool.submit(() -> fetchJson(currentUrl(place)));

        List<Pack> packs = new ArrayList<>();
        JSONObject currentRaw = null;
        try {
            for (Future<Pack> future : futures) {
                try {
                    Pack pack = future.get(7500, TimeUnit.MILLISECONDS);
                    if (pack != null && !pack.rows.isEmpty()) packs.add(pack);
                } catch (Exception ignored) {}
            }
            try { currentRaw = currentFuture.get(7500, TimeUnit.MILLISECONDS); } catch (Exception ignored) {}
        } finally {
            pool.shutdownNow();
        }
        if (packs.isEmpty()) throw new IllegalStateException("Sin datos de lluvia");
        List<Row> model = aggregate(packs);
        if (model.isEmpty()) throw new IllegalStateException("Sin horas de lluvia");

        RainData out = new RainData();
        out.plus1 = category(horizon(model, 1));
        out.plus2 = category(horizon(model, 2));
        out.plus3 = category(horizon(model, 3));
        out.tomorrow = dayCategory(model, 1);
        out.dayAfter = dayCategory(model, 2);
        out.now = currentCategory(currentRaw);
        if (out.now == null) out.now = category(model.get(0));
        return out;
    }

    private static final class SourceTask implements Callable<Pack> {
        private final Source source;
        private final BariSnowWidgetProvider.Place place;
        SourceTask(Source source, BariSnowWidgetProvider.Place place) { this.source = source; this.place = place; }
        @Override public Pack call() throws Exception {
            List<Row> rows = parse(fetchJson(modelUrl(source, place)), source);
            if (rows.isEmpty()) throw new IllegalStateException("Sin horas");
            return new Pack(rows);
        }
    }

    private static String modelUrl(Source source, BariSnowWidgetProvider.Place p) {
        String hourly = "precipitation,rain,showers,snowfall,weather_code,cape";
        return String.format(Locale.US,
                "%s?latitude=%.5f&longitude=%.5f&elevation=%d&hourly=%s&timezone=%s&forecast_days=3&precipitation_unit=mm",
                source.endpoint, p.lat, p.lon, p.elev, enc(hourly), enc(TZ_ID));
    }

    private static String currentUrl(BariSnowWidgetProvider.Place p) {
        String vars = "precipitation,rain,showers,snowfall,weather_code";
        return String.format(Locale.US,
                "https://api.open-meteo.com/v1/forecast?latitude=%.5f&longitude=%.5f&elevation=%d&current=%s&timezone=%s&precipitation_unit=mm",
                p.lat, p.lon, p.elev, enc(vars), enc(TZ_ID));
    }

    private static String enc(String value) {
        try { return URLEncoder.encode(value, "UTF-8"); } catch (Exception e) { return value; }
    }

    private static JSONObject fetchJson(String endpoint) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(endpoint).openConnection();
        c.setConnectTimeout(HTTP_TIMEOUT_MS);
        c.setReadTimeout(HTTP_TIMEOUT_MS);
        c.setRequestMethod("GET");
        c.setRequestProperty("Accept", "application/json");
        c.setRequestProperty("User-Agent", "BariSnowAndroidWidget/1.4.1");
        int status = c.getResponseCode();
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status);
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
            String line; while ((line = reader.readLine()) != null) body.append(line);
        } finally { c.disconnect(); }
        return new JSONObject(body.toString());
    }

    private static List<Row> parse(JSONObject data, Source source) {
        JSONObject h = data.optJSONObject("hourly");
        if (h == null) return Collections.emptyList();
        JSONArray times = h.optJSONArray("time");
        if (times == null) return Collections.emptyList();
        List<Row> out = new ArrayList<>();
        for (int i = 0; i < times.length(); i++) {
            Row r = new Row();
            r.time = times.optString(i, "");
            r.precip = Math.max(0, arr(h, "precipitation", i, 0));
            r.rain = Math.max(0, arr(h, "rain", i, 0));
            r.showers = Math.max(0, arr(h, "showers", i, 0));
            r.snow = Math.max(0, arr(h, "snowfall", i, 0));
            r.code = (int) Math.round(arr(h, "weather_code", i, -1));
            r.cape = Math.max(0, arr(h, "cape", i, 0));
            r.weight = source.weight;
            r.liquid = Math.max(r.rain + r.showers, r.snow > .01 ? 0 : r.precip);
            r.key = sourceKey(r);
            out.add(r);
        }
        return out;
    }

    private static String sourceKey(Row r) {
        int code = r.code;
        if (snowCode(code) || r.snow >= .01) return "snow";
        if (code == 95 || code == 96 || code == 99) return "thunder";
        if (code == 66 || code == 67) return "freezing_rain";
        if (code == 56 || code == 57) return "freezing_drizzle";
        if (code == 82) return "rain_shower_heavy";
        if (code == 80 || code == 81) return "rain_shower";
        if (code == 51 || code == 53 || code == 55) return "drizzle";
        if (code == 65) return "rain_heavy";
        if (code == 63) return "rain_moderate";
        if (code == 61) return "rain_light";
        if (r.showers >= .6 && r.showers >= .35 * Math.max(r.precip, .01)) return "rain_shower_heavy";
        if (r.showers >= .18 && r.showers >= .25 * Math.max(r.precip, .01)) return "rain_shower";
        if (r.liquid >= 5) return "rain_heavy";
        if (r.liquid >= 2) return "rain_moderate";
        if (r.liquid >= .4) return "rain_light";
        if (r.liquid >= .08 || r.precip >= .12) return "drizzle";
        return "dry";
    }

    private static List<Row> aggregate(List<Pack> packs) {
        Map<String, List<Row>> by = new TreeMap<>();
        for (Pack p : packs) for (Row r : p.rows) by.computeIfAbsent(r.time, k -> new ArrayList<>()).add(r);
        List<Row> out = new ArrayList<>();
        for (Map.Entry<String, List<Row>> e : by.entrySet()) {
            List<Row> a = e.getValue();
            double total = 0, liquid = 0;
            Map<String, Double> votes = new LinkedHashMap<>();
            for (Row r : a) {
                total += r.weight;
                liquid += r.weight * r.liquid;
                votes.put(r.key, votes.getOrDefault(r.key, 0d) + r.weight);
            }
            Row r = new Row();
            r.time = e.getKey();
            r.liquid = total > 0 ? liquid / total : 0;
            r.key = "dry";
            double best = -1;
            for (Map.Entry<String, Double> v : votes.entrySet()) if (v.getValue() > best) { best = v.getValue(); r.key = v.getKey(); }
            r.support = total > 0 ? Math.max(0, best) / total : 0;
            r.freezingRainSupport = vote(votes, "freezing_rain", total);
            r.freezingDrizzleSupport = vote(votes, "freezing_drizzle", total);
            r.showerSupport = (vote(votes, "rain_shower", total) + vote(votes, "rain_shower_heavy", total));
            r.violentShowerSupport = vote(votes, "rain_shower_heavy", total);
            r.thunderSupport = vote(votes, "thunder", total);
            out.add(r);
        }
        return filterNow(out);
    }

    private static double vote(Map<String, Double> votes, String key, double total) {
        return total > 0 ? votes.getOrDefault(key, 0d) / total : 0;
    }

    private static String category(Row r) {
        if (r == null) return "SIN PRECIPITACIÓN";
        if (r.thunderSupport >= .28 || "thunder".equals(r.key)) return "TORMENTA";
        if (r.freezingRainSupport >= .28 || "freezing_rain".equals(r.key)) return "LLUVIA CONGELANTE";
        if (r.freezingDrizzleSupport >= .28 || "freezing_drizzle".equals(r.key)) return "LLOVIZNA CONGELANTE";
        if (r.violentShowerSupport >= .28 || "rain_shower_heavy".equals(r.key)) return "CHAPARRÓN FUERTE";
        if ("rain_heavy".equals(r.key) || r.liquid >= 5) return "LLUVIA FUERTE";
        if (r.showerSupport >= .32 || "rain_shower".equals(r.key)) return "CHAPARRÓN DE LLUVIA";
        if ("rain_moderate".equals(r.key) || r.liquid >= 2) return "LLUVIA MODERADA";
        if ("rain_light".equals(r.key) || r.liquid >= .4) return "LLUVIA DÉBIL";
        if ("drizzle".equals(r.key) || r.liquid >= .08) return "LLOVIZNA";
        return "SIN PRECIPITACIÓN";
    }

    private static String currentCategory(JSONObject raw) {
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        if (c == null) return null;
        int code = c.optInt("weather_code", -1);
        double snow = Math.max(0, c.optDouble("snowfall", 0));
        double rain = Math.max(0, c.optDouble("rain", 0));
        double showers = Math.max(0, c.optDouble("showers", 0));
        double precip = Math.max(0, c.optDouble("precipitation", 0));
        if (snowCode(code) || snow >= .01) return null;
        if (code == 95 || code == 96 || code == 99) return "TORMENTA";
        if (code == 66 || code == 67) return "LLUVIA CONGELANTE";
        if (code == 56 || code == 57) return "LLOVIZNA CONGELANTE";
        if (code == 82) return "CHAPARRÓN FUERTE";
        if (code == 80 || code == 81) return "CHAPARRÓN DE LLUVIA";
        if (code == 51 || code == 53 || code == 55) return "LLOVIZNA";
        if (code == 65) return "LLUVIA FUERTE";
        if (code == 63) return "LLUVIA MODERADA";
        if (code == 61) return "LLUVIA DÉBIL";
        double liquid = rain + showers;
        if (showers >= .15) return "CHAPARRÓN DE LLUVIA";
        if (liquid >= 5) return "LLUVIA FUERTE";
        if (liquid >= 2) return "LLUVIA MODERADA";
        if (liquid >= .4) return "LLUVIA DÉBIL";
        if (liquid >= .05 || precip >= .05) return "LLOVIZNA";
        return "SIN PRECIPITACIÓN";
    }

    private static String dayCategory(List<Row> model, int dayOffset) {
        LinkedHashMap<String, Row> peaks = new LinkedHashMap<>();
        LinkedHashMap<String, Double> scores = new LinkedHashMap<>();
        for (Row r : model) {
            String key = dayKey(r.time); if (key.isEmpty()) continue;
            double score = rank(category(r)) + r.liquid / 5;
            if (!scores.containsKey(key) || score > scores.get(key)) { scores.put(key, score); peaks.put(key, r); }
        }
        if (peaks.size() <= dayOffset) return "SIN PRECIPITACIÓN";
        return category(new ArrayList<>(peaks.values()).get(dayOffset));
    }

    private static int rank(String s) {
        if ("TORMENTA".equals(s)) return 10;
        if (s.contains("CONGELANTE")) return 9;
        if ("CHAPARRÓN FUERTE".equals(s) || "LLUVIA FUERTE".equals(s)) return 8;
        if ("CHAPARRÓN DE LLUVIA".equals(s)) return 7;
        if ("LLUVIA MODERADA".equals(s)) return 6;
        if ("LLUVIA DÉBIL".equals(s)) return 5;
        if ("LLOVIZNA".equals(s)) return 4;
        return 0;
    }

    private static List<Row> filterNow(List<Row> rows) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:00", Locale.US); f.setTimeZone(TZ);
        long cut = parseMillis(f.format(new Date())) - 5 * 60_000L;
        List<Row> out = new ArrayList<>();
        for (Row r : rows) { long t = parseMillis(r.time); if (t <= 0 || t >= cut) out.add(r); }
        return out.isEmpty() ? rows : out;
    }

    private static Row horizon(List<Row> rows, int hours) {
        long target = System.currentTimeMillis() + hours * 3_600_000L;
        Row best = rows.get(0); long diff = Long.MAX_VALUE;
        for (Row r : rows) { long t = parseMillis(r.time); if (t <= 0) continue; long d = Math.abs(t - target); if (d < diff) { diff = d; best = r; } }
        return best;
    }

    private static double arr(JSONObject h, String key, int i, double fallback) {
        JSONArray a = h.optJSONArray(key); if (a == null || i < 0 || i >= a.length() || a.isNull(i)) return fallback; return a.optDouble(i, fallback);
    }
    private static boolean snowCode(int c) { return c == 71 || c == 73 || c == 75 || c == 77 || c == 85 || c == 86; }
    private static String dayKey(String iso) { return iso != null && iso.length() >= 10 ? iso.substring(0, 10) : ""; }
    private static long parseMillis(String iso) {
        if (iso == null || iso.isEmpty()) return -1;
        String value = iso.length() >= 16 ? iso.substring(0, 16) : iso;
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US); f.setLenient(false); f.setTimeZone(TZ);
        try { return f.parse(value).getTime(); } catch (Exception e) { return -1; }
    }

    private static final class Source { final String endpoint; final double weight; Source(String endpoint, double weight) { this.endpoint = endpoint; this.weight = weight; } }
    private static final class Pack { final List<Row> rows; Pack(List<Row> rows) { this.rows = rows; } }
    private static final class Row {
        String time, key; int code; double precip, rain, showers, snow, cape, liquid, weight, support, freezingRainSupport, freezingDrizzleSupport, showerSupport, violentShowerSupport, thunderSupport;
    }
    private static final class RainData { String now, plus1, plus2, plus3, tomorrow, dayAfter; }
}
