from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def update_layout(path, rate_size):
    s = read(path)
    # El bloque horario gana un poco de espacio en el widget completo.
    if 'android:layout_weight="1.15"' in s:
        s = s.replace('android:layout_weight="1.15"', 'android:layout_weight="1.20"', 1)
    if 'android:layout_weight="0.85"' in s:
        s = s.replace('android:layout_weight="0.85"', 'android:layout_weight="0.80"', 1)

    for prefix in ("now", "plus1", "plus2", "plus3"):
        # Elimina la línea repetida "Sensación térmica" y usa el propio valor
        # como línea compacta: "Sens. 2°".
        pat = re.compile(
            r'(<TextView\s+android:id="@\+id/' + prefix + r'_temp"[^>]*/>)\s*'
            r'<TextView\s+(?=[^>]*android:text="Sensación térmica")[^>]*/>\s*'
            r'(<TextView\s+android:id="@\+id/' + prefix + r'_feels"[^>]*/>)',
            re.S,
        )
        m = pat.search(s)
        if m:
            feels = (
                '<TextView android:id="@+id/' + prefix + '_feels" '
                'android:layout_width="match_parent" android:layout_height="18dp" '
                'android:gravity="center" android:fontFamily="sans-serif-medium" '
                'android:includeFontPadding="false" android:maxLines="1" '
                'android:text="Sens. —" android:textColor="#70BDFF" android:textSize="9sp" />'
            )
            s = s[:m.start()] + m.group(1) + '\n            ' + feels + s[m.end():]

        rate = (
            '<TextView android:id="@+id/' + prefix + '_rate" '
            'android:layout_width="match_parent" android:layout_height="28dp" '
            'android:gravity="center" android:includeFontPadding="false" '
            'android:maxLines="2" android:lineSpacingExtra="1dp" '
            'android:text="🌧 –&#10;❄ –" android:textColor="#B5D8EC" '
            'android:textSize="' + str(rate_size) + 'sp" />'
        )
        rate_pat = re.compile(r'<TextView\s+android:id="@\+id/' + prefix + r'_rate"[^>]*/>', re.S)
        if rate_pat.search(s):
            s = rate_pat.sub(rate, s, count=1)
        else:
            feels_pat = re.compile(r'(<TextView\s+android:id="@\+id/' + prefix + r'_feels"[^>]*/>)', re.S)
            fm = feels_pat.search(s)
            if not fm:
                raise RuntimeError(f"No se encontró {prefix}_feels en {path}")
            s = s[:fm.end()] + '\n            ' + rate + s[fm.end():]

    write(path, s)


update_layout('android-app/app/src/main/res/layout/widget_barisnow.xml', 9)
update_layout('android-app/app/src/main/res/layout/widget_barisnow_compact.xml', 8)

# ---------------------------------------------------------------------------
# Provider: tasa también en Ahora, sensación compacta y bloque de dos líneas.
# ---------------------------------------------------------------------------
provider = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider)
if 'applyRate(views, R.id.now_rate, data.now);' not in s:
    needle = '        applyHour(views, R.id.plus3_icon, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, data.plus3);\n'
    s = s.replace(needle, needle + '        applyRate(views, R.id.now_rate, data.now);\n', 1)

s = s.replace('views.setTextViewText(feelsId, formatTemp(hour.feels));', 'views.setTextViewText(feelsId, formatFeels(hour.feels));')

start = s.find('    protected static String formatHourlyPrecip(HourData hour) {')
end = s.find('    protected static void applyDay(', start)
if start < 0 or end < 0:
    raise RuntimeError('No se encontró formatHourlyPrecip')
rate_method = '''    protected static String formatHourlyPrecip(HourData hour) {
        if (hour == null) return "🌧 –\\n❄ –";
        double rain = hour.rainRateMmH;
        double snow = hour.snowRateCmH;
        String rainText = Double.isNaN(rain) || Double.isInfinite(rain) || rain < .05
                ? "–"
                : (rain < 10 ? String.format(Locale.getDefault(), "%.1f mm/h", rain) : String.format(Locale.getDefault(), "%.0f mm/h", rain));
        String snowText;
        if (Double.isNaN(snow) || Double.isInfinite(snow) || snow < .03) snowText = "–";
        else if (snow < .12) snowText = "Traza";
        else if (snow < 1) snowText = String.format(Locale.getDefault(), "%.1f cm/h", snow);
        else snowText = String.format(Locale.getDefault(), "%.0f cm/h", snow);
        return "🌧 " + rainText + "\\n❄ " + snowText;
    }

'''
s = s[:start] + rate_method + s[end:]

if 'protected static String formatFeels(double value)' not in s:
    marker = '    protected static String formatRange(double min, double max) {'
    helper = '''    protected static String formatFeels(double value) {
        if (Double.isNaN(value)) return "Sens. —";
        return String.format(Locale.getDefault(), "Sens. %.0f°", value);
    }

'''
    if marker not in s:
        raise RuntimeError('No se encontró formatRange')
    s = s.replace(marker, helper + marker, 1)
write(provider, s)

compact = 'android-app/app/src/main/java/com/barisnow/app/BariSnowCompactWidgetProvider.java'
s = read(compact)
if 'applyRate(views, R.id.now_rate, data.now);' not in s:
    needle = '        applyHour(views, R.id.plus3_icon, R.id.plus3_clock, R.id.plus3_state, R.id.plus3_temp, R.id.plus3_feels, data.plus3);\n'
    s = s.replace(needle, needle + '        applyRate(views, R.id.now_rate, data.now);\n', 1)
write(compact, s)

# ---------------------------------------------------------------------------
# Motor nival: conserva tasas actuales aunque falle el suplemento de lluvia.
# Open-Meteo current entrega sumas retrospectivas y el campo interval en s.
# ---------------------------------------------------------------------------
forecast = 'android-app/app/src/main/java/com/barisnow/app/BariSnowForecastEngine.java'
s = read(forecast)
old = '''        if (c == null) {
            h.clock = clockFromIso(fallback.time);
            h.temp = fallback.T;
            h.feels = fallback.feels;
            h.state = categoricalSnow(fallback);
            return h;
        }
        h.clock = clockFromIso(c.optString("time", ""));
        h.temp = c.optDouble("temperature_2m", Double.NaN);
        h.feels = c.optDouble("apparent_temperature", Double.NaN);
        h.state = currentCategory(c, place);
        return h;
'''
new = '''        if (c == null) {
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
'''
if old in s:
    s = s.replace(old, new, 1)
elif 'double intervalSec = c.optDouble("interval", 900);' not in s:
    raise RuntimeError('No se encontró currentData para tasas actuales')
write(forecast, s)

# ---------------------------------------------------------------------------
# Motor de lluvia: la tasa de Ahora se normaliza con current.interval.
# ---------------------------------------------------------------------------
rain = 'android-app/app/src/main/java/com/barisnow/app/BariSnowRainEngine.java'
s = read(rain)
if 'data.now.rainRateMmH = rain.nowRainRate;' not in s:
    needle = '        merge(data.plus3, rain.plus3);\n'
    add = '''        if (data.now != null) {
            if (!Double.isNaN(rain.nowRainRate)) data.now.rainRateMmH = rain.nowRainRate;
            if (!Double.isNaN(rain.nowSnowRate)) data.now.snowRateCmH = rain.nowSnowRate;
        }
'''
    s = s.replace(needle, needle + add, 1)

needle = '''        out.now = currentCategory(currentRaw, place);
        if (out.now == null) out.now = category(model.get(0));
        return out;
'''
replacement = '''        out.now = currentCategory(currentRaw, place);
        out.nowRainRate = currentRainRate(currentRaw);
        out.nowSnowRate = currentSnowRate(currentRaw);
        if (Double.isNaN(out.nowRainRate)) out.nowRainRate = Math.max(0, model.get(0).liquid);
        if (out.now == null) out.now = category(model.get(0));
        return out;
'''
if needle in s:
    s = s.replace(needle, replacement, 1)
elif 'out.nowRainRate = currentRainRate(currentRaw);' not in s:
    raise RuntimeError('No se encontró salida current de RainEngine')

if 'private static double currentRainRate(JSONObject raw)' not in s:
    marker = '    private static String currentCategory(JSONObject raw, BariSnowWidgetProvider.Place place) {'
    helper = '''    private static double currentRateFactor(JSONObject raw) {
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        if (c == null) return Double.NaN;
        double intervalSec = c.optDouble("interval", 900);
        if (Double.isNaN(intervalSec) || Double.isInfinite(intervalSec) || intervalSec <= 0) intervalSec = 900;
        return 3600.0 / intervalSec;
    }

    private static double currentRainRate(JSONObject raw) {
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        double factor = currentRateFactor(raw);
        if (c == null || Double.isNaN(factor)) return Double.NaN;
        return Math.max(0, c.optDouble("rain", 0) + c.optDouble("showers", 0)) * factor;
    }

    private static double currentSnowRate(JSONObject raw) {
        JSONObject c = raw == null ? null : raw.optJSONObject("current");
        double factor = currentRateFactor(raw);
        if (c == null || Double.isNaN(factor)) return Double.NaN;
        return Math.max(0, c.optDouble("snowfall", 0)) * factor;
    }

'''
    if marker not in s:
        raise RuntimeError('No se encontró currentCategory RainEngine')
    s = s.replace(marker, helper + marker, 1)

if 'double nowRainRate = Double.NaN;' not in s:
    s = s.replace('        String dayAfter;\n', '        String dayAfter;\n        double nowRainRate = Double.NaN;\n        double nowSnowRate = Double.NaN;\n', 1)
write(rain, s)

# ---------------------------------------------------------------------------
# Web: Ahora también informa tasa equivalente de los 15 min precedentes.
# ---------------------------------------------------------------------------
web = 'precipitation-communication.js'
s = read(web)
s = s.replace('var baseRenderHours=window.renderHours;\n  var currentSeq=0,currentCat=null,applyingCurrent=false;',
              'var baseRenderHours=window.renderHours;\n  var currentSeq=0,currentCat=null,currentRates=null,applyingCurrent=false;')

if 'function currentRatesFrom(c)' not in s:
    marker = '  function applyCurrent(cat){'
    helper = '''  function currentRatesFrom(c){
    var sec=n(c&&c.interval,900);if(!finite(sec)||sec<=0)sec=900;
    var factor=3600/sec;
    return {rain:Math.max(0,n(c&&c.rain,0)+n(c&&c.showers,0))*factor,snow:Math.max(0,n(c&&c.snowfall,0))*factor};
  }

  function currentRatesHtml(r){
    if(!r)return '';
    var rain=r.rain<.05?'🌧️ –':'🌧️ '+fmt(r.rain,r.rain<1?2:1)+' mm/h';
    var snow=r.snow<.03?'❄️ –':r.snow<.12?'❄️ Traza':'❄️ '+fmt(r.snow,r.snow<1?2:1)+' cm/h';
    return '<span class="chip">'+esc(rain)+'</span><span class="chip">'+esc(snow)+'</span>';
  }

'''
    if marker not in s:
        raise RuntimeError('No se encontró applyCurrent web')
    s = s.replace(marker, helper + marker, 1)

s = s.replace('  function applyCurrent(cat){', '  function applyCurrent(cat,rates){', 1)
old_line = '    text("nowPhase","ESTADO ACTUAL · 15 min"+(finite(cat.cloud)?" · nubosidad "+Math.round(cat.cloud)+"%":""));'
new_line = '    text("nowPhase","ESTADO ACTUAL · últimos 15 min"+(finite(cat.cloud)?" · nubosidad "+Math.round(cat.cloud)+"%":""));var nm=$("nowMeta");if(nm&&rates)nm.innerHTML=currentRatesHtml(rates);'
s = s.replace(old_line, new_line)
s = s.replace('currentCat=currentCategory(d.current,p);applyCurrent(currentCat);', 'currentCat=currentCategory(d.current,p);currentRates=currentRatesFrom(d.current);applyCurrent(currentCat,currentRates);')
s = s.replace('applyCurrent(currentCat);},0);', 'applyCurrent(currentCat,currentRates);},0);')
write(web, s)

# PWA/WebView cache.
sw = 'sw.js'
s = read(sw)
s = re.sub(r'barisnow-pwa-v\d+', 'barisnow-pwa-v12', s, count=1)
write(sw, s)

# Versión 1.4.12.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+23\b', 'versionCode 24', s, count=1)
s = s.replace("versionName '1.4.11'", "versionName '1.4.12'")
s = re.sub(r'// BariSnow 1\.4\.11[^\n]*',
           '// BariSnow 1.4.12 mejora legibilidad del widget e incorpora tasa actual normalizada.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.12', s)
write(client, s)

print('Legibilidad y tasa actual aplicadas.')
