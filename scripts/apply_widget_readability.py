from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def patch_tag_by_id(text, view_id, attrs):
    pat = re.compile(r'<TextView\s+[^>]*android:id="@\+id/' + re.escape(view_id) + r'"[^>]*/>', re.S)
    m = pat.search(text)
    if not m:
        raise RuntimeError(f"No se encontró {view_id}")
    tag = m.group(0)
    for key, value in attrs.items():
        attr_pat = re.compile(r'android:' + re.escape(key) + r'="[^"]*"')
        if attr_pat.search(tag):
            tag = attr_pat.sub(f'android:{key}="{value}"', tag, count=1)
        else:
            tag = tag[:-2] + f' android:{key}="{value}" />'
    return text[:m.start()] + tag + text[m.end():]


def update_layout(path, rate_size, rate_height):
    s = read(path)
    for prefix in ("now", "plus1", "plus2", "plus3"):
        s = patch_tag_by_id(s, prefix + "_rate", {
            "textSize": rate_size,
            "layout_height": rate_height,
            "maxLines": "1",
            "lineSpacingExtra": "0dp",
            "fontFamily": "sans-serif-medium",
        })
    write(path, s)


# Una sola tasa visible permite usar una tipografía claramente mayor.
update_layout('android-app/app/src/main/res/layout/widget_barisnow.xml', '13sp', '24dp')
update_layout('android-app/app/src/main/res/layout/widget_barisnow_compact.xml', '12sp', '22dp')

# ---------------------------------------------------------------------------
# Provider: muestra solo la tasa de la fase meteorológica dominante.
# Lluvia/llovizna -> mm/h; nieve/copos -> cm/h; seco -> –.
# En mezcla real se usa la fase con mayor equivalente aproximado de agua.
# ---------------------------------------------------------------------------
provider = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider)
start = s.find('    protected static String formatHourlyPrecip(HourData hour) {')
end = s.find('    protected static void applyDay(', start)
if start < 0 or end < 0:
    raise RuntimeError('No se encontró formatHourlyPrecip')

method = '''    protected static String formatHourlyPrecip(HourData hour) {
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

'''
s = s[:start] + method + s[end:]
write(provider, s)

# Versión 1.4.14.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+25\b', 'versionCode 26', s, count=1)
s = s.replace("versionName '1.4.13'", "versionName '1.4.14'")
s = re.sub(r'// BariSnow 1\.4\.13[^\n]*',
           '// BariSnow 1.4.14 muestra una sola tasa por fase y aumenta su legibilidad.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.14', s)
write(client, s)

print('Tasa dominante y tipografía BariSnow 1.4.14 aplicadas.')
