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

/**
 * Suplemento de precipitación y estado del cielo del motor BariSnow.
 * Conserva la clasificación nival del motor principal y completa los estados
 * secos con despejado, nubosidad o niebla.
 */
final class BariSnowRainEngine {
    private static final String TZ_ID = "America/Argentina/Buenos_Aires";
    private static final TimeZone TZ = TimeZone.getTimeZone(TZ_ID);
    private static final int HTTP_TIMEOUT_MS = 5000;

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
        merge(data.now, rain.now);
        merge(data.plus1, rain.plus1);
        merge(data.plus2, rain.plus2);
        merge(data.plus3, rain.plus3);
        merge(data.tomorrow, rain.tomorrow);
        merge(data.dayAfter, rain.dayAfter);
    }

    private static void merge(BariSnowWidgetProvider.HourData h, String state) {
        if (h != null) h.state = combine(h.state, state);
    }

    private static void merge(BariSnowWidgetProvider.DayData d, String state) {
        if (d != null) d.state = combine(d.state, state);
    }

    private static String combine(String snowState, String liquidOrSkyState) {
        String base = snowState == null ? "SIN NIEVE" : snowState;
        String other = liquidOrSkyState == null ? "SIN PRECIPITACIÓN" : liquidOrSkyState;
        int snowRank = snowRank(base);
        int rainRank = rainRank(other);

        if (snowRank >= 12) return base;
        if (snowRank == 11 && rainRank < 7) return base;
        if (rainRank > 0) return other;
        if (snowRank > 0) return base;
        if (!"SIN PRECIPITACIÓN".equals(other)) return other;
        return "SIN PRECIPITACIÓN";
    }

    private static int snowRank(String s) {
        if ("NEVADA ACUMULABLE".equals(s)) return 15;
        if ("CHAPARRÓN DE NIEVE".equals(s) || "NIEVA".equals(s)) return 14;
        if ("NIEVE HÚMEDA".equals(s) || "NIEVE GRANULADA".equals(s)) return 13;
        if ("LLUVIA Y NIEVE".equals(s)) return 12;
        if ("COPOS AISLADOS".equals(s)) return 11;
        return 0;
    }

    private static int rainRank(String s) {
        if ("TORMENTA".equals(s)) return 10;
        if ("LLUVIA CONGELANTE".equals(s) || "LLOVIZNA CONGELANTE".equals(s)) return 9;
        if ("CHAPARRÓN FUERTE".equals(s) || "LLUVIA FUERTE".equals(s)) return 8;
        if ("CHAPARRÓN DE LLUVIA".equals(s)) return 7;
        if ("LLUVIA MODERADA".equals(s)) return 6;
        if ("LLUVIA DÉBIL".equals(s)) return 5;
        if ("LLOVIZNA".equals(s)) return 4;
        return 0;
    }

    private static double skyRank(String s) {
        if ("NIEBLA".equals(s)) return 3;
        if ("NUBLADO".equals(s)) return 1;
        if ("PARCIALMENTE NUBLADO".equals(s)) return .8;
        if ("MAYORMENTE DESPEJADO".equals(s)) return .5;
        if ("DESPEJADO".equals(s) || "SOLEADO".equals(s)) return .4;
        return .2;
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
                    Pack pack = future.get(6000, TimeUnit.MILLISECONDS);
                    if (pack != null && !pack.rows.isEmpty()) packs.add(pack);
                } catch (Exception ignored) {}
            }
            try { currentRaw = currentFuture.get(6000, TimeUnit.MILLISECONDS); } catch (Exception ignored) {}
        } finally {
            pool.shutdownNow();
        }
        if (packs.isEmpty()) throw new IllegalStateException("Sin modelos disponibles");
        List<Row> model = aggregate(packs);
        if (model.isEmpty()) throw new IllegalStateException("Sin horas disponibles");

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
        SourceTask(Source source, BariSnowWidgetProvider.Place place) {
            this.source = source;
            this.place = place;
        }
        @Override public Pack call() throws Exception {
            List<Row> rows = parse(fetchJson(modelUrl(source, place)), source, place);
            if (rows.isEmpty()) throw new IllegalStateException("Sin horas");
            return new Pack(rows);
        }
    }

    private static String modelUrl(Source source, BariSnowWidgetProvider.Place p) {
        String hourly = "relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,wind_speed_10m,wind_direction_10m,cape";
        return String.format(Locale.US,
                "%s?latitude=%.5f&longitude=%.5f&elevation=%d&hourly=%s&timezone=%s&forecast_days=3&wind_speed_unit=kmh&precipitation_unit=mm",
                source.endpoint, p.lat, p.lon, p.elev, enc(hourly), enc(TZ_ID));
    }

    private static String currentUrl(BariSnowWidgetProvider.Place p) {
        String vars = "precipitation,rain,showers,snowfall,weather_code,cloud_cover,is_day";
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
        c.setRequestProperty("User-Agent", "BariSnowAndroidWidget/1.4.2");
        int status = c.getResponseCode();
        if (status < 200 || status >= 300) throw new IllegalStateException("HTTP " + status);
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
        } finally {
            c.disconnect();
        }
        return new JSONObject(body.toString());
    }

    private static List<Row> parse(JSONObject data, Source source, BariSnowWidgetProvider.Place place) {
        JSONObject h = data.optJSONObject("hourly");
        if (h == null) return Collections.emptyList();
        JSONArray times = h.optJSONArray("time");
        if (times == null) return Collections.emptyList();
        List<Row> out = new ArrayList<>();

        for (int i = 0; i < times.length(); i++) {
            Row r = new Row();
            r.time = times.optString(i, "");
            double pBase = Math.max(0, arr(h, "precipitation", i, 0));
            r.rain = Math.max(0, arr(h, "rain", i, 0));
            r.showers = Math.max(0, arr(h, "showers", i, 0));
            r.snow = Math.max(0, arr(h, "snowfall", i, 0));
            r.code = (int) Math.round(arr(h, "weather_code", i, -1));
            r.cape = Math.max(0, arr(h, "cape", i, 0));
            double rh = arr(h, "relative_humidity_2m", i, 80);
            double wind = Math.max(0, arr(h, "wind_speed_10m", i, 0));
            double dir = arr(h, "wind_direction_10m", i, 270);
            double windward = Math.max(0, Math.cos(Math.toRadians(dir - 280)));
            double moist = clamp(rh / 90, .3, 1.3);
            double windTerm = clamp(wind / 45, 0, 1.5);
            double oroIndex = windward * moist * windTerm;
            double mult = clamp(1 + place.oro * oroIndex, .85, 1.55);
            r.precip = pBase * mult;
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
        if (code == 45 || code == 48) return "fog";
        if (code == 0) return "clear";
        if (code == 1) return "mostly_clear";
        if (code == 2) return "partly_cloudy";
        if (code == 3) return "overcast";
        return "unknown_sky";
    }

    private static List<Row> aggregate(List<Pack> packs) {
        Map<String, List<Row>> by = new TreeMap<>();
        for (Pack p : packs) {
            for (Row r : p.rows) by.computeIfAbsent(r.time, k -> new ArrayList<>()).add(r);
        }
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
            r.key = "unknown_sky";
            double best = -1;
            for (Map.Entry<String, Double> v : votes.entrySet()) {
                if (v.getValue() > best) {
                    best = v.getValue();
                    r.key = v.getKey();
                }
            }
            r.freezingRainSupport = vote(votes, "freezing_rain", total);
            r.freezingDrizzleSupport = vote(votes, "freezing_drizzle", total);
            r.showerSupport = vote(votes, "rain_shower", total) + vote(votes, "rain_shower_heavy", total);
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
        if ("fog".equals(r.key)) return "NIEBLA";
        if ("overcast".equals(r.key)) return "NUBLADO";
        if ("partly_cloudy".equals(r.key)) return "PARCIALMENTE NUBLADO";
        if ("mostly_clear".equals(r.key)) return "MAYORMENTE DESPEJADO";
        if ("clear".equals(r.key)) return "DESPEJADO";
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
        return currentSky(c, code);
    }

    private static String currentSky(JSONObject c, int code) {
        boolean day = c.optInt("is_day", 1) == 1;
        double cloud = c.optDouble("cloud_cover", Double.NaN);
        if (code == 45 || code == 48) return "NIEBLA";
        if (code == 0) return day ? "SOLEADO" : "DESPEJADO";
        if (code == 1) return "MAYORMENTE DESPEJADO";
        if (code == 2) return "PARCIALMENTE NUBLADO";
        if (code == 3) return "NUBLADO";
        if (!Double.isNaN(cloud)) {
            if (cloud <= 15) return day ? "SOLEADO" : "DESPEJADO";
            if (cloud <= 40) return "MAYORMENTE DESPEJADO";
            if (cloud <= 75) return "PARCIALMENTE NUBLADO";
            return "NUBLADO";
        }
        return "SIN PRECIPITACIÓN";
    }

    private static String dayCategory(List<Row> model, int dayOffset) {
        LinkedHashMap<String, Row> peaks = new LinkedHashMap<>();
        LinkedHashMap<String, Double> scores = new LinkedHashMap<>();
        for (Row r : model) {
            String key = dayKey(r.time);
            if (key.isEmpty()) continue;
            String c = category(r);
            double score = rainRank(c) + skyRank(c) + r.liquid / 5;
            if (!scores.containsKey(key) || score > scores.get(key)) {
                scores.put(key, score);
                peaks.put(key, r);
            }
        }
        if (peaks.size() <= dayOffset) return "SIN PRECIPITACIÓN";
        return category(new ArrayList<>(peaks.values()).get(dayOffset));
    }

    private static List<Row> filterNow(List<Row> rows) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:00", Locale.US);
        f.setTimeZone(TZ);
        long cut = parseMillis(f.format(new Date())) - 5 * 60_000L;
        List<Row> out = new ArrayList<>();
        for (Row r : rows) {
            long t = parseMillis(r.time);
            if (t <= 0 || t >= cut) out.add(r);
        }
        return out.isEmpty() ? rows : out;
    }

    private static Row horizon(List<Row> rows, int hours) {
        long target = System.currentTimeMillis() + hours * 3_600_000L;
        Row best = rows.get(0);
        long diff = Long.MAX_VALUE;
        for (Row r : rows) {
            long t = parseMillis(r.time);
            if (t <= 0) continue;
            long d = Math.abs(t - target);
            if (d < diff) {
                diff = d;
                best = r;
            }
        }
        return best;
    }

    private static double arr(JSONObject h, String key, int i, double fallback) {
        JSONArray a = h.optJSONArray(key);
        if (a == null || i < 0 || i >= a.length() || a.isNull(i)) return fallback;
        return a.optDouble(i, fallback);
    }

    private static double clamp(double x, double a, double b) {
        return Math.max(a, Math.min(b, x));
    }

    private static boolean snowCode(int c) {
        return c == 71 || c == 73 || c == 75 || c == 77 || c == 85 || c == 86;
    }

    private static String dayKey(String iso) {
        return iso != null && iso.length() >= 10 ? iso.substring(0, 10) : "";
    }

    private static long parseMillis(String iso) {
        if (iso == null || iso.isEmpty()) return -1;
        String value = iso.length() >= 16 ? iso.substring(0, 16) : iso;
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US);
        f.setLenient(false);
        f.setTimeZone(TZ);
        try { return f.parse(value).getTime(); } catch (Exception e) { return -1; }
    }

    private static final class Source {
        final String endpoint;
        final double weight;
        Source(String endpoint, double weight) { this.endpoint = endpoint; this.weight = weight; }
    }

    private static final class Pack {
        final List<Row> rows;
        Pack(List<Row> rows) { this.rows = rows; }
    }

    private static final class Row {
        String time;
        String key;
        int code;
        double precip;
        double rain;
        double showers;
        double snow;
        double cape;
        double liquid;
        double weight;
        double freezingRainSupport;
        double freezingDrizzleSupport;
        double showerSupport;
        double violentShowerSupport;
        double thunderSupport;
    }

    private static final class RainData {
        String now;
        String plus1;
        String plus2;
        String plus3;
        String tomorrow;
        String dayAfter;
    }
}
