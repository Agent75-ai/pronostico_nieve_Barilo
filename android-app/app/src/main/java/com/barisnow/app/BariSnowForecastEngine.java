package com.barisnow.app;

import org.json.JSONArray;
import org.json.JSONObject;

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
 * Motor nativo del widget BariSnow.
 * Desde 1.4.5 el consenso operativo usa ECMWF + GFS + GEM con igual peso.
 * Los motores de nieve y lluvia comparten el mismo snapshot meteorológico.
 */
final class BariSnowForecastEngine {
    private static final String TZ_ID = "America/Argentina/Buenos_Aires";
    private static final TimeZone TZ = TimeZone.getTimeZone(TZ_ID);
    private static final int HTTP_TIMEOUT_MS = 6500;

    private static final Source[] SOURCES = new Source[]{
            new Source("ecmwf", "ECMWF IFS", "https://api.open-meteo.com/v1/ecmwf", 1d / 3d, false, true),
            new Source("gfs", "NOAA GFS", "https://api.open-meteo.com/v1/gfs", 1d / 3d, true, true),
            new Source("gem", "CMC GEM", "https://api.open-meteo.com/v1/gem", 1d / 3d, true, false)
    };

    private BariSnowForecastEngine() {}

    static BariSnowWidgetProvider.WidgetData fetch(BariSnowWidgetProvider.Place place) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(4);
        Future<JSONObject> currentFuture = pool.submit(() -> fetchJson(currentUrl(place)));
        List<Future<Pack>> futures = new ArrayList<>();
        for (Source source : SOURCES) futures.add(pool.submit(new SourceTask(source, place)));

        List<Pack> packs = new ArrayList<>();
        JSONObject currentRaw = null;
        try {
            for (Future<Pack> future : futures) {
                try {
                    Pack p = future.get(7500, TimeUnit.MILLISECONDS);
                    if (p != null && p.rows != null && !p.rows.isEmpty()) packs.add(p);
                } catch (Exception ignored) {
                }
            }
            try {
                currentRaw = currentFuture.get(7500, TimeUnit.MILLISECONDS);
            } catch (Exception ignored) {
            }
        } finally {
            pool.shutdownNow();
        }

        if (packs.isEmpty()) throw new IllegalStateException("Sin modelos BariSnow disponibles");
        List<Row> model = aggregate(packs);
        if (model.isEmpty()) throw new IllegalStateException("Sin horas BariSnow disponibles");

        BariSnowWidgetProvider.WidgetData out = new BariSnowWidgetProvider.WidgetData();
        out.place = place;
        out.plus1 = hourData(horizon(model, 1));
        out.plus2 = hourData(horizon(model, 2));
        out.plus3 = hourData(horizon(model, 3));
        out.tomorrow = dayData(model, 1);
        out.dayAfter = dayData(model, 2);
        out.now = currentData(currentRaw, model.get(0), place);
        out.updated = "Actualizado " + localClock();
        return out;
    }

    static String toCache(BariSnowWidgetProvider.WidgetData data) throws Exception {
        JSONObject root = new JSONObject();
        root.put("now", hourJson(data.now));
        root.put("plus1", hourJson(data.plus1));
        root.put("plus2", hourJson(data.plus2));
        root.put("plus3", hourJson(data.plus3));
        root.put("tomorrow", dayJson(data.tomorrow));
        root.put("dayAfter", dayJson(data.dayAfter));
        root.put("updated", data.updated);
        return root.toString();
    }

    static BariSnowWidgetProvider.WidgetData fromCache(String raw, BariSnowWidgetProvider.Place place) throws Exception {
        JSONObject root = new JSONObject(raw);
        BariSnowWidgetProvider.WidgetData data = new BariSnowWidgetProvider.WidgetData();
        data.place = place;
        data.now = hourFromJson(root.getJSONObject("now"));
        data.plus1 = hourFromJson(root.getJSONObject("plus1"));
        data.plus2 = hourFromJson(root.getJSONObject("plus2"));
        data.plus3 = hourFromJson(root.getJSONObject("plus3"));
        data.tomorrow = dayFromJson(root.getJSONObject("tomorrow"));
        data.dayAfter = dayFromJson(root.getJSONObject("dayAfter"));
        data.updated = root.optString("updated", "Dato guardado");
        return data;
    }

    private static JSONObject hourJson(BariSnowWidgetProvider.HourData h) throws Exception {
        JSONObject o = new JSONObject().put("state", h.state).put("clock", h.clock);
        putFinite(o, "temp", h.temp);
        putFinite(o, "feels", h.feels);
        putFinite(o, "rainRateMmH", h.rainRateMmH);
        putFinite(o, "snowRateCmH", h.snowRateCmH);
        return o;
    }

    private static BariSnowWidgetProvider.HourData hourFromJson(JSONObject o) {
        BariSnowWidgetProvider.HourData h = new BariSnowWidgetProvider.HourData();
        h.state = o.optString("state", "SIN DATO");
        h.clock = o.optString("clock", "—");
        h.temp = o.optDouble("temp", Double.NaN);
        h.feels = o.optDouble("feels", Double.NaN);
        h.rainRateMmH = o.has("rainRateMmH") && !o.isNull("rainRateMmH") ? o.optDouble("rainRateMmH", Double.NaN) : Double.NaN;
        h.snowRateCmH = o.has("snowRateCmH") && !o.isNull("snowRateCmH") ? o.optDouble("snowRateCmH", Double.NaN) : Double.NaN;
        return h;
    }

    private static JSONObject dayJson(BariSnowWidgetProvider.DayData d) throws Exception {
        JSONObject o = new JSONObject().put("state", d.state);
        putFinite(o, "minTemp", d.minTemp);
        putFinite(o, "maxTemp", d.maxTemp);
        putFinite(o, "minFeels", d.minFeels);
        putFinite(o, "maxFeels", d.maxFeels);
        putFinite(o, "snowCm", d.snowCm);
        putFinite(o, "rainMm", d.rainMm);
        return o;
    }

    private static BariSnowWidgetProvider.DayData dayFromJson(JSONObject o) {
        BariSnowWidgetProvider.DayData d = new BariSnowWidgetProvider.DayData();
        d.state = o.optString("state", "SIN DATO");
        d.minTemp = o.optDouble("minTemp", Double.NaN);
        d.maxTemp = o.optDouble("maxTemp", Double.NaN);
        d.minFeels = o.optDouble("minFeels", Double.NaN);
        d.maxFeels = o.optDouble("maxFeels", Double.NaN);
        d.snowCm = o.optDouble("snowCm", 0);
        d.rainMm = o.has("rainMm") && !o.isNull("rainMm") ? o.optDouble("rainMm", Double.NaN) : Double.NaN;
        return d;
    }

    private static void putFinite(JSONObject o, String key, double value) throws Exception {
        if (finite(value)) o.put(key, value);
        else o.put(key, JSONObject.NULL);
    }

    private static final class SourceTask implements Callable<Pack> {
        private final Source source;
        private final BariSnowWidgetProvider.Place place;

        SourceTask(Source source, BariSnowWidgetProvider.Place place) {
            this.source = source;
            this.place = place;
        }

        @Override
        public Pack call() throws Exception {
            JSONObject data = fetchJson(modelUrl(source, place));
            List<Row> rows = computeModel(data, source, place);
            if (rows.isEmpty()) throw new IllegalStateException(source.name + ": sin horas");
            return new Pack(source, rows);
        }
    }

    private static String modelUrl(Source source, BariSnowWidgetProvider.Place p) {
        String hourly = "temperature_2m,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,cape";
        if (source.freezingLevel) hourly += ",freezing_level_height";
        if (source.precipProbability) hourly += ",precipitation_probability";
        return String.format(Locale.US,
                "%s?latitude=%.5f&longitude=%.5f&elevation=%d&hourly=%s&timezone=%s&forecast_days=9&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm",
                source.endpoint, p.lat, p.lon, p.elev, enc(hourly), enc(TZ_ID));
    }

    private static String currentUrl(BariSnowWidgetProvider.Place p) {
        String vars = "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,showers,snowfall,weather_code,cloud_cover,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m";
        return String.format(Locale.US,
                "https://api.open-meteo.com/v1/forecast?latitude=%.5f&longitude=%.5f&elevation=%d&current=%s&timezone=%s&temperature_unit=celsius&wind_speed_unit=kmh&precipitation_unit=mm",
                p.lat, p.lon, p.elev, enc(vars), enc(TZ_ID));
    }

    private static String enc(String value) {
        try {
            return URLEncoder.encode(value, "UTF-8");
        } catch (Exception e) {
            return value;
        }
    }

    private static JSONObject fetchJson(String endpoint) throws Exception {
        return BariSnowWeatherClient.fetchJson(endpoint, HTTP_TIMEOUT_MS);
    }

    private static List<Row> computeModel(JSONObject data, Source source, BariSnowWidgetProvider.Place p) {
        JSONObject h = data.optJSONObject("hourly");
        if (h == null) return Collections.emptyList();
        JSONArray times = h.optJSONArray("time");
        if (times == null) return Collections.emptyList();
        List<Row> out = new ArrayList<>();

        for (int i = 0; i < times.length(); i++) {
            double tRaw = arr(h, "temperature_2m", i, Double.NaN);
            double rh = arr(h, "relative_humidity_2m", i, Double.NaN);
            if (!finite(tRaw) || !finite(rh)) continue;

            double pBase = Math.max(0, arr(h, "precipitation", i, 0));
            double prevP = Math.max(0, arr(h, "precipitation", i - 1, 0));
            double nextP = Math.max(0, arr(h, "precipitation", i + 1, 0));
            double showers = Math.max(0, arr(h, "showers", i, 0));
            double prevShowers = Math.max(0, arr(h, "showers", i - 1, 0));
            double nextShowers = Math.max(0, arr(h, "showers", i + 1, 0));
            double snowNative = Math.max(0, arr(h, "snowfall", i, 0));
            double prevSnow = Math.max(0, arr(h, "snowfall", i - 1, 0));
            double nextSnow = Math.max(0, arr(h, "snowfall", i + 1, 0));
            int code = (int) Math.round(arr(h, "weather_code", i, -1));
            double wind = arr(h, "wind_speed_10m", i, 0);
            double dir = arr(h, "wind_direction_10m", i, 270);
            double gust = Math.max(wind, arr(h, "wind_gusts_10m", i, wind));
            double cape = Math.max(0, arr(h, "cape", i, 0));
            double freezing = arr(h, "freezing_level_height", i, Double.NaN);

            double t = tRaw + p.coldBias;
            double windward = Math.max(0, Math.cos(rad(dir - 280)));
            double moist = clamp(rh / 90, .3, 1.3);
            double windTerm = clamp(wind / 45, 0, 1.5);
            double oroIndex = windward * moist * windTerm;
            double mult = clamp(1 + p.oro * oroIndex, .85, 1.55);
            double cool = clamp(.13 * oroIndex, 0, .45);
            double precip = pBase * mult;
            double temporalSignal = max(pBase, .42 * prevP, .42 * nextP, .70 * showers,
                    .32 * prevShowers, .32 * nextShowers, .22 * (prevP + nextP));
            double nativeSnowSignal = max(snowNative, .38 * prevSnow, .38 * nextSnow);
            double pSignal = max(precip, temporalSignal * mult, nativeSnowSignal / .7);
            double tw = wetBulb(t, rh);
            double evap = clamp(.12 * Math.sqrt(Math.max(precip, pSignal * .45))
                    + .28 * clamp((100 - rh) / 50, 0, 1) * Math.sqrt(Math.max(precip, pSignal * .45)), 0, .75);
            double twEff = tw - evap - cool;
            double snowLine = Math.max(0, p.elev + (twEff - .15) * 230);
            if (finite(freezing)) snowLine = Math.min(snowLine, Math.max(0, freezing - 180));

            double melt = Math.max(0, twEff + .1) * 650;
            double refreeze = Math.max(0, -twEff) * 420;
            double survival = clamp(Math.exp(-melt / 380) * (1 + refreeze / 1400), 0, 1);
            double dgz = clamp((rh - 72) / 26, 0, 1.25) * clamp(pSignal / .9, 0, 1.3) * clamp((.9 - twEff) / 1.7, 0, 1.2);
            double gustiness = clamp((gust - wind) / 20, 0, 1);
            double instability = clamp(cape / 90, 0, 1);
            double coldShower = clamp((1.35 - twEff) / 1.8, 0, 1);
            double humidShower = clamp((rh - 78) / 18, 0, 1);
            double precipContext = clamp(pSignal / .16, 0, 1);
            double snowShowerScore = clamp(precipContext * (.34 * humidShower + .30 * coldShower + .16 * gustiness
                    + .10 * instability + .10 * clamp(oroIndex / .75, 0, 1)), 0, 1);
            if (snowShowerCode(code)) snowShowerScore = Math.max(snowShowerScore, .82);
            else if (snowWeatherCode(code)) snowShowerScore = Math.max(snowShowerScore, .62);
            if (snowNative >= .03) snowShowerScore = Math.max(snowShowerScore, .50 + clamp(snowNative / .5, 0, .28));

            boolean localSnowShower = twEff <= 1.45 && rh >= 80
                    && (pSignal >= .025 || snowNative >= .01 || snowWeatherCode(code)) && snowShowerScore >= .42;

            double score = 1.55 * clamp((.75 - twEff) / 1.6, 0, 1)
                    + 1.15 * clamp((p.elev - snowLine + 260) / 540, 0, 1)
                    + .85 * clamp(survival / .75, 0, 1)
                    + .55 * clamp(dgz, 0, 1)
                    + .35 * clamp(pSignal / 1.2, 0, 1)
                    - .85 * clamp(melt / 900, 0, 1)
                    + .55 * snowShowerScore;
            if (twEff > 2.2) score -= 1.2;
            if (snowLine > p.elev + 650) score -= 1;

            boolean hasHydrometeor = precip >= .04 || pSignal >= .025 || snowNative >= .01 || snowWeatherCode(code);
            double idx = !hasHydrometeor ? 0 : (score >= 3.75 ? 5 : score >= 3.05 ? 4 : score >= 2.25 ? 3 : score >= 1.45 ? 2 : score >= .75 ? 1 : 0);
            if (snowNative >= .18 || snowShowerCode(code)) idx = Math.max(idx, 4);
            else if (snowNative >= .04 || snowWeatherCode(code)) idx = Math.max(idx, 3);
            else if (localSnowShower) idx = Math.max(idx, twEff <= .55 ? 3 : 2);

            double probScore = -1.10 + 1.55 * ((.45 - twEff) / .55)
                    + 1.05 * ((p.elev - snowLine + 140) / 240)
                    + .85 * Math.log(1 + pSignal)
                    + 1.15 * (survival - .45)
                    + .55 * clamp(dgz, 0, 1.3)
                    - .65 * clamp(melt / 950, 0, 1)
                    + .80 * snowShowerScore;
            double prob = sigmoid(probScore);
            if (pSignal < .025 && snowNative == 0 && !snowWeatherCode(code)) prob *= .1;
            if (twEff > 1.8) prob *= .35;
            if (snowLine > p.elev + 700) prob *= .25;
            if (snowWeatherCode(code)) prob = Math.max(prob, .62);
            if (snowNative >= .03) prob = Math.max(prob, .45 + clamp(snowNative / .6, 0, .35));
            if (localSnowShower) prob = Math.max(prob, .38 + .35 * snowShowerScore);
            prob = clamp(prob, 0, 1);

            double slr = clamp(8.5 + 2.6 * Math.max(0, -twEff) - 6 * Math.max(0, twEff) + 1.8 * dgz + .4 * oroIndex, 1.2, 20);
            if (idx <= 1) slr = Math.min(slr, 2.5);
            if (idx == 2) slr = Math.min(slr, 4);
            if (idx == 3) slr = Math.min(slr, 7);
            double stick = sigmoid((.25 - twEff) / .32)
                    * clamp(.75 + .18 * Math.sqrt(Math.max(precip, pSignal * .5)), .70, 1.22)
                    * clamp(1 - melt / 1300, .22, 1);
            if (idx <= 1) stick *= .1;
            else if (idx == 2) stick *= .32;
            else if (idx == 3) stick *= .62;
            else stick *= .9;
            stick = clamp(stick, 0, 1);
            double derivedCmh = precip * prob * slr / 10 * stick;
            double nativeAccum = snowNative * clamp(.35 + .75 * stick, .15, 1);
            double cmh = Math.max(derivedCmh, nativeAccum * .78);

            Row r = new Row();
            r.time = times.optString(i, "");
            r.T = t;
            r.RH = rh;
            r.P = precip;
            r.Psignal = pSignal;
            r.showers = showers;
            r.snowfall = snowNative;
            r.wind = wind;
            r.gust = gust;
            r.cape = cape;
            r.freezingLevel = freezing;
            r.TwEff = twEff;
            r.snowLine = snowLine;
            r.prob = prob;
            r.cmh = cmh;
            r.ptypeIdx = idx;
            r.snowShowerScore = snowShowerScore;
            r.localSnowShower = localSnowShower ? 1 : 0;
            r.feels = feels(t, wind);
            r.sourceWeight = source.weight;
            out.add(r);
        }
        return out;
    }

    private static List<Row> aggregate(List<Pack> packs) {
        Map<String, List<Row>> byTime = new TreeMap<>();
        for (Pack pack : packs) for (Row row : pack.rows) byTime.computeIfAbsent(row.time, k -> new ArrayList<>()).add(row);
        List<Row> out = new ArrayList<>();
        for (Map.Entry<String, List<Row>> entry : byTime.entrySet()) {
            List<Row> a = entry.getValue();
            double totalW = 0;
            double snowSupport = 0;
            for (Row r : a) {
                totalW += r.sourceWeight;
                if (sourceSnowEvidence(r)) snowSupport += r.sourceWeight;
            }
            Row row = new Row();
            row.time = entry.getKey();
            row.T = wmean(a, "T");
            row.RH = wmean(a, "RH");
            row.P = wmean(a, "P");
            row.Psignal = wmean(a, "Psignal");
            row.showers = wmean(a, "showers");
            row.snowfall = wmean(a, "snowfall");
            row.wind = wmean(a, "wind");
            row.gust = wmean(a, "gust");
            row.cape = wmean(a, "cape");
            row.freezingLevel = wmean(a, "freezingLevel");
            row.TwEff = wmean(a, "TwEff");
            row.snowLine = wmean(a, "snowLine");
            row.prob = wmean(a, "prob");
            row.cmh = wmean(a, "cmh");
            row.snowShowerScore = wmean(a, "snowShowerScore");
            row.localSnowShower = wmean(a, "localSnowShower");
            row.feels = wmean(a, "feels");
            row.ptypeIdx = wmean(a, "ptypeIdx");
            row.snowSupport = totalW > 0 ? snowSupport / totalW : 0;
            row.members = a.size();
            out.add(row);
        }
        return filterNow(out);
    }

    private static List<Row> filterNow(List<Row> rows) {
        Date d = new Date();
        SimpleDateFormat dayHour = new SimpleDateFormat("yyyy-MM-dd'T'HH:00", Locale.US);
        dayHour.setTimeZone(TZ);
        long cut = parseMillis(dayHour.format(d)) - 5 * 60_000L;
        List<Row> filtered = new ArrayList<>();
        for (Row r : rows) {
            long t = parseMillis(r.time);
            if (t <= 0 || t >= cut) filtered.add(r);
        }
        return filtered.isEmpty() ? rows : filtered;
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

    private static BariSnowWidgetProvider.HourData hourData(Row row) {
        BariSnowWidgetProvider.HourData h = new BariSnowWidgetProvider.HourData();
        h.clock = intervalFromIso(row.time);
        h.temp = row.T;
        h.feels = row.feels;
        h.snowRateCmH = Math.max(0, row.cmh);
        h.state = categoricalSnow(row);
        return h;
    }

    private static BariSnowWidgetProvider.HourData currentData(JSONObject raw, Row fallback, BariSnowWidgetProvider.Place place) {
        BariSnowWidgetProvider.HourData h = new BariSnowWidgetProvider.HourData();
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        if (c == null) {
            h.clock = clockFromIso(fallback.time);
            h.temp = fallback.T;
            h.feels = fallback.feels;
            h.snowRateCmH = Math.max(0, fallback.cmh);
            h.state = categoricalSnow(fallback);
            return h;
        }
        h.clock = clockFromIso(c.optString("time", ""));
        h.temp = c.optDouble("temperature_2m", Double.NaN);
        h.feels = c.optDouble("apparent_temperature", Double.NaN);
        double intervalSec = c.optDouble("interval", 900);
        if (Double.isNaN(intervalSec) || Double.isInfinite(intervalSec) || intervalSec <= 0) intervalSec = 900;
        double rateFactor = 3600.0 / intervalSec;
        h.rainRateMmH = Math.max(0, c.optDouble("rain", 0) + c.optDouble("showers", 0)) * rateFactor;
        h.snowRateCmH = Math.max(0, c.optDouble("snowfall", 0)) * rateFactor;
        h.state = currentCategory(c, place);
        return h;
    }

    private static BariSnowWidgetProvider.DayData dayData(List<Row> model, int dayOffset) {
        LinkedHashMap<String, DayBucket> days = new LinkedHashMap<>();
        for (Row r : model) {
            String key = dayKey(r.time);
            if (key.isEmpty()) continue;
            DayBucket b = days.computeIfAbsent(key, k -> new DayBucket());
            if (!finite(b.minT)) {
                b.minT = b.maxT = r.T;
                b.minFeels = b.maxFeels = r.feels;
            } else {
                b.minT = Math.min(b.minT, r.T);
                b.maxT = Math.max(b.maxT, r.T);
                b.minFeels = Math.min(b.minFeels, r.feels);
                b.maxFeels = Math.max(b.maxFeels, r.feels);
            }
            b.snow += Math.max(0, r.cmh);
            double score = categoryRank(r) + r.cmh;
            if (b.peak == null || score > b.peakScore) {
                b.peak = r;
                b.peakScore = score;
            }
        }
        if (days.size() <= dayOffset) throw new IllegalArgumentException("Horizonte diario incompleto");

        DayBucket b = new ArrayList<>(days.values()).get(dayOffset);
        BariSnowWidgetProvider.DayData d = new BariSnowWidgetProvider.DayData();
        d.minTemp = b.minT;
        d.maxTemp = b.maxT;
        d.minFeels = b.minFeels;
        d.maxFeels = b.maxFeels;
        d.snowCm = b.snow;
        d.rainMm = Double.NaN;
        d.state = categoricalSnow(b.peak);
        return d;
    }

    private static String currentCategory(JSONObject c, BariSnowWidgetProvider.Place p) {
        double t = c.optDouble("temperature_2m", Double.NaN);
        double rh = c.optDouble("relative_humidity_2m", Double.NaN);
        int code = c.optInt("weather_code", -1);
        double snow = Math.max(0, c.optDouble("snowfall", 0));
        double rain = Math.max(0, c.optDouble("rain", 0));
        double showers = Math.max(0, c.optDouble("showers", 0));
        double precip = Math.max(0, c.optDouble("precipitation", 0));
        double tw = finite(t) && finite(rh) ? wetBulb(t + p.coldBias, rh) : 99;
        double liquid = rain + showers;
        boolean snowCodeNow = snowShowerCode(code) || code == 71 || code == 73 || code == 75 || code == 77;
        boolean snowEvidence = (snow >= .01 && tw <= .70)
                || (snow >= .03 && tw <= 1.30)
                || (snow >= .10 && tw <= 1.80)
                || (snowCodeNow && tw <= .25 && precip >= .05);
        boolean snowShowerEvidence = snowEvidence || (snow >= .15 && tw <= 2.10);
        if (snowShowerCode(code) && snowShowerEvidence) return "CHAPARRÓN DE NIEVE";
        if ((code == 71 || code == 73 || code == 75) && snowEvidence) return "NIEVA";
        if (code == 77 && snowEvidence) return "NIEVE GRANULADA";
        if (code == 51 || code == 53 || code == 55 || code == 56 || code == 57
                || code == 61 || code == 63 || code == 65 || code == 66 || code == 67
                || code == 80 || code == 81 || code == 82 || code == 95 || code == 96 || code == 99) return "SIN NIEVE";
        if (!snowCodeNow && snowEvidence) {
            if (snow >= .06 && liquid < .03 && tw <= 1.0) return "NIEVA";
            if (snow >= .02 && tw <= 1.25) return liquid >= .03 ? "LLUVIA Y NIEVE" : "NIEVE HÚMEDA";
        }
        return "SIN NIEVE";
    }

    private static boolean sourceSnowEvidence(Row r) {
        if (r == null) return false;
        double t = r.T;
        double tw = r.TwEff;
        double sf = Math.max(0, r.snowfall);
        double ps = Math.max(0, r.Psignal);
        if (t > 5.5 || tw > 2.2) return false;
        if (t > 4.5) return tw <= 1.0 && sf >= .05 && ps >= .20;
        if (t > 3.0) return tw <= 1.5 && sf >= .02 && (ps >= .08 || r.snowShowerScore >= .55);
        return tw <= 1.9 && (sf >= .01 || r.ptypeIdx >= 2 || ps >= .12);
    }

    private static String categoricalSnow(Row row) {
        if (row == null) return "SIN DATO";
        double p = row.prob;
        double c = row.cmh;
        double idx = row.ptypeIdx;
        double sf = Math.max(0, row.snowfall);
        double sh = row.snowShowerScore;
        double tw = row.TwEff;
        double t = row.T;
        double ps = Math.max(0, row.Psignal);
        double support = clamp(row.snowSupport, 0, 1);
        boolean consensusOK = row.members >= 2 ? support >= .60 : support >= .99 && sf >= .08;
        boolean showerThermal = (t <= 3.0 && tw <= 1.8)
                || (t > 3.0 && t <= 4.5 && tw <= 1.5 && sf >= .02 && ps >= .08)
                || (t > 4.5 && t <= 5.5 && tw <= 1.0 && sf >= .05 && ps >= .20);
        if (t > 5.5 || tw > 2.3) return "SIN NIEVE";
        if ((idx >= 5 || c >= .8) && t <= 2.8 && tw <= 1.1 && consensusOK) return "NEVADA ACUMULABLE";
        if ((sh >= .45 || row.localSnowShower >= .35) && showerThermal && consensusOK && (sf >= .01 || ps >= .12)) return "CHAPARRÓN DE NIEVE";
        if (t <= 4.2 && tw <= 1.5 && support >= .50 && (idx >= 4 || sf >= .12 || (p >= .60 && sf >= .02))) return "NIEVA";
        if (t <= 4.8 && tw <= 1.8 && support >= .34 && (idx >= 3 || sf >= .02 || (p >= .42 && sf >= .01))) return "NIEVE HÚMEDA";
        if (t <= 5.2 && tw <= 2.1 && support >= .34 && (idx >= 2 || sf >= .01)) return "LLUVIA Y NIEVE";
        if (t <= 5.5 && tw <= 2.2 && support >= .34 && (p >= .23 || idx >= 1 || sf >= .01)) return "COPOS AISLADOS";
        return "SIN NIEVE";
    }

    private static int categoryRank(Row row) {
        String c = categoricalSnow(row);
        if ("NEVADA ACUMULABLE".equals(c)) return 5;
        if ("CHAPARRÓN DE NIEVE".equals(c) || "NIEVA".equals(c)) return 4;
        if ("NIEVE HÚMEDA".equals(c)) return 3;
        if ("LLUVIA Y NIEVE".equals(c)) return 2;
        if ("COPOS AISLADOS".equals(c)) return 1;
        return 0;
    }

    private static double wmean(List<Row> rows, String field) {
        double sw = 0;
        double sx = 0;
        for (Row r : rows) {
            double x;
            switch (field) {
                case "T": x = r.T; break;
                case "RH": x = r.RH; break;
                case "P": x = r.P; break;
                case "Psignal": x = r.Psignal; break;
                case "showers": x = r.showers; break;
                case "snowfall": x = r.snowfall; break;
                case "wind": x = r.wind; break;
                case "gust": x = r.gust; break;
                case "cape": x = r.cape; break;
                case "freezingLevel": x = r.freezingLevel; break;
                case "TwEff": x = r.TwEff; break;
                case "snowLine": x = r.snowLine; break;
                case "prob": x = r.prob; break;
                case "cmh": x = r.cmh; break;
                case "snowShowerScore": x = r.snowShowerScore; break;
                case "localSnowShower": x = r.localSnowShower; break;
                case "feels": x = r.feels; break;
                case "ptypeIdx": x = r.ptypeIdx; break;
                default: x = Double.NaN;
            }
            if (finite(x)) {
                sw += r.sourceWeight;
                sx += r.sourceWeight * x;
            }
        }
        return sw > 0 ? sx / sw : Double.NaN;
    }

    private static double arr(JSONObject h, String key, int index, double fallback) {
        JSONArray a = h.optJSONArray(key);
        if (a == null || index < 0 || index >= a.length() || a.isNull(index)) return fallback;
        return a.optDouble(index, fallback);
    }

    private static boolean snowWeatherCode(int code) {
        return code == 71 || code == 73 || code == 75 || code == 77 || code == 85 || code == 86;
    }

    private static boolean snowShowerCode(int code) {
        return code == 85 || code == 86;
    }

    private static double wetBulb(double t, double rh) {
        if (!finite(t) || !finite(rh)) return Double.NaN;
        double h = clamp(rh, 1, 100);
        return t * Math.atan(.151977 * Math.sqrt(h + 8.313659))
                + Math.atan(t + h)
                - Math.atan(h - 1.676331)
                + .00391838 * Math.pow(h, 1.5) * Math.atan(.023101 * h)
                - 4.686035;
    }

    private static double feels(double t, double wind) {
        if (!finite(t)) return Double.NaN;
        double w = Math.max(0, wind);
        if (t <= 10 && w >= 4.8) return 13.12 + .6215 * t - 11.37 * Math.pow(w, .16) + .3965 * t * Math.pow(w, .16);
        return t - Math.min(1.6, w / 34);
    }

    private static double sigmoid(double x) {
        return 1 / (1 + Math.exp(-x));
    }

    private static double clamp(double x, double a, double b) {
        return Math.max(a, Math.min(b, x));
    }

    private static double rad(double d) {
        return d * Math.PI / 180;
    }

    private static boolean finite(double x) {
        return !Double.isNaN(x) && !Double.isInfinite(x);
    }

    private static double max(double... values) {
        double m = -Double.MAX_VALUE;
        for (double v : values) m = Math.max(m, v);
        return m;
    }

    private static String intervalFromIso(String iso) {
        long end = parseMillis(iso);
        if (end <= 0) return "—";
        SimpleDateFormat h = new SimpleDateFormat("HH", Locale.getDefault());
        h.setTimeZone(TZ);
        return h.format(new Date(end - 3_600_000L)) + "–" + h.format(new Date(end)) + "h";
    }

    private static String clockFromIso(String iso) {
        if (iso == null) return "—";
        int t = iso.indexOf('T');
        if (t < 0 || iso.length() < t + 6) return "—";
        return iso.substring(t + 1, t + 6);
    }

    private static String dayKey(String iso) {
        if (iso == null || iso.length() < 10) return "";
        return iso.substring(0, 10);
    }

    private static long parseMillis(String iso) {
        if (iso == null || iso.isEmpty()) return -1;
        String value = iso.length() >= 16 ? iso.substring(0, 16) : iso;
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm", Locale.US);
        f.setLenient(false);
        f.setTimeZone(TZ);
        try {
            return f.parse(value).getTime();
        } catch (Exception e) {
            return -1;
        }
    }

    private static String localClock() {
        SimpleDateFormat f = new SimpleDateFormat("HH:mm", Locale.getDefault());
        f.setTimeZone(TZ);
        return f.format(new Date());
    }

    private static final class Source {
        final String id;
        final String name;
        final String endpoint;
        final double weight;
        final boolean precipProbability;
        final boolean freezingLevel;

        Source(String id, String name, String endpoint, double weight, boolean precipProbability, boolean freezingLevel) {
            this.id = id;
            this.name = name;
            this.endpoint = endpoint;
            this.weight = weight;
            this.precipProbability = precipProbability;
            this.freezingLevel = freezingLevel;
        }
    }

    private static final class Pack {
        final Source source;
        final List<Row> rows;

        Pack(Source source, List<Row> rows) {
            this.source = source;
            this.rows = rows;
        }
    }

    private static final class Row {
        String time;
        double T;
        double RH;
        double P;
        double Psignal;
        double showers;
        double snowfall;
        double wind;
        double gust;
        double cape;
        double freezingLevel;
        double TwEff;
        double snowLine;
        double prob;
        double cmh;
        double ptypeIdx;
        double snowShowerScore;
        double localSnowShower;
        double snowSupport;
        int members;
        double feels;
        double sourceWeight;
    }

    private static final class DayBucket {
        double minT = Double.NaN;
        double maxT = Double.NaN;
        double minFeels = Double.NaN;
        double maxFeels = Double.NaN;
        double snow = 0;
        Row peak;
        double peakScore = -1;
    }
}