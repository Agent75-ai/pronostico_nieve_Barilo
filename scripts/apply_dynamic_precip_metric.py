from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise RuntimeError(f"No se encontró marcador para {label}")
    return text.replace(old, new, 1)


def replace_block(text, start, end, replacement, label):
    if replacement.strip() in text:
        return text
    a = text.find(start)
    if a < 0:
        raise RuntimeError(f"No se encontró inicio para {label}")
    b = text.find(end, a)
    if b < 0:
        raise RuntimeError(f"No se encontró fin para {label}")
    return text[:a] + replacement + text[b:]


def add_metric_ids(path):
    text = read(path)
    if 'day1_metric_label' in text and 'day2_metric_label' in text:
        return
    pattern = re.compile(r'<TextView\b(?=[^>]*android:text="Nieve")[^>]*/>', re.S)
    matches = list(pattern.finditer(text))
    if len(matches) < 2:
        raise RuntimeError(f"Se esperaban dos etiquetas Nieve en {path}")
    ids = ['day1_metric_label', 'day2_metric_label']
    pieces = []
    pos = 0
    for idx, match in enumerate(matches[:2]):
        pieces.append(text[pos:match.start()])
        node = match.group(0)
        node = node.replace('<TextView', f'<TextView android:id="@+id/{ids[idx]}"', 1)
        pieces.append(node)
        pos = match.end()
    pieces.append(text[pos:])
    write(path, ''.join(pieces))


# 1) Los dos layouts con tarjetas diarias reciben IDs para la etiqueta dinámica.
add_metric_ids('android-app/app/src/main/res/layout/widget_barisnow.xml')
add_metric_ids('android-app/app/src/main/res/layout/widget_barisnow_daily.xml')

# 2) El modelo de datos del widget conserva lluvia diaria y decide qué métrica mostrar.
provider_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider_path)

apply_day = '''    protected static void applyDay(RemoteViews views, boolean first, DayData day) {
        int iconId = first ? R.id.day1_icon : R.id.day2_icon;
        int stateId = first ? R.id.day1_state : R.id.day2_state;
        int tempId = first ? R.id.day1_temp : R.id.day2_temp;
        int feelsId = first ? R.id.day1_feels : R.id.day2_feels;
        int metricLabelId = first ? R.id.day1_metric_label : R.id.day2_metric_label;
        int metricId = first ? R.id.day1_snow : R.id.day2_snow;

        views.setTextViewText(iconId, iconFor(day.state));
        views.setTextViewText(stateId, day.state);
        views.setTextViewText(tempId, formatRange(day.minTemp, day.maxTemp));
        views.setTextViewText(feelsId, formatRange(day.minFeels, day.maxFeels));

        boolean rainDominant = isRainState(day.state);
        boolean mixed = "LLUVIA Y NIEVE".equals(day.state)
                || (rainDominant && !Double.isNaN(day.rainMm) && day.rainMm >= .1 && day.snowCm >= .5);
        if (mixed) {
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

    private static boolean isRainState(String state) {
        if (state == null) return false;
        if (state.contains("NIEVE") && !"LLUVIA Y NIEVE".equals(state)) return false;
        return state.contains("LLUVIA") || state.contains("LLOVIZNA")
                || state.contains("TORMENTA") || state.contains("CHAPARRÓN");
    }

'''
s = replace_block(
    s,
    '    protected static void applyDay(RemoteViews views, boolean first, DayData day) {',
    '    private static Place selectedPlace(Context context) {',
    apply_day,
    'applyDay dinámico'
)

snow_formatter = '''    protected static String formatSnow(double cm) {
        if (Double.isNaN(cm) || cm < 0.03) return "0 cm";
        if (cm < 0.12) return "Traza";
        if (cm < 1) return String.format(Locale.getDefault(), "%.1f cm", cm);
        return String.format(Locale.getDefault(), "%.0f cm", cm);
    }

'''
rain_formatter = snow_formatter + '''    protected static String formatRain(double mm) {
        if (Double.isNaN(mm) || Double.isInfinite(mm)) return "—";
        if (mm < .05) return "0 mm";
        if (mm < 10) return String.format(Locale.getDefault(), "%.1f mm", mm);
        return String.format(Locale.getDefault(), "%.0f mm", mm);
    }

'''
if 'protected static String formatRain(double mm)' not in s:
    if snow_formatter not in s:
        raise RuntimeError('No se encontró formatSnow')
    s = s.replace(snow_formatter, rain_formatter, 1)

s = replace_once(
    s,
    '        double snowCm;\n    }',
    '        double snowCm;\n        double rainMm = Double.NaN;\n    }',
    'DayData.rainMm'
)
write(provider_path, s)

# 3) El motor de lluvia conserva el acumulado líquido diario multimodelo.
rain_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowRainEngine.java'
s = read(rain_path)
s = replace_once(
    s,
    '        merge(data.plus3, rain.plus3);\n        merge(data.tomorrow, rain.tomorrow);\n        merge(data.dayAfter, rain.dayAfter);',
    '        merge(data.plus3, rain.plus3);\n        if (data.tomorrow != null) data.tomorrow.rainMm = rain.tomorrowMm;\n        if (data.dayAfter != null) data.dayAfter.rainMm = rain.dayAfterMm;\n        merge(data.tomorrow, rain.tomorrow);\n        merge(data.dayAfter, rain.dayAfter);',
    'enrich lluvia diaria'
)
s = replace_once(
    s,
    '        out.tomorrow = dayCategory(model, 1);\n        out.dayAfter = dayCategory(model, 2);',
    '        out.tomorrow = dayCategory(model, 1);\n        out.dayAfter = dayCategory(model, 2);\n        out.tomorrowMm = dayLiquidTotal(model, 1);\n        out.dayAfterMm = dayLiquidTotal(model, 2);',
    'RainData acumulados'
)

helper = '''    private static double dayLiquidTotal(List<Row> model, int dayOffset) {
        LinkedHashMap<String, List<Row>> days = new LinkedHashMap<>();
        for (Row r : model) {
            String key = dayKey(r.time);
            if (!key.isEmpty()) days.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }
        if (days.size() <= dayOffset) return Double.NaN;
        double total = 0;
        for (Row r : new ArrayList<>(days.values()).get(dayOffset)) {
            if (!Double.isNaN(r.liquid) && !Double.isInfinite(r.liquid)) total += Math.max(0, r.liquid);
        }
        return total;
    }

'''
if 'private static double dayLiquidTotal' not in s:
    marker = '    private static String dayCategory(List<Row> model, int dayOffset) {'
    if marker not in s:
        raise RuntimeError('No se encontró dayCategory')
    s = s.replace(marker, helper + marker, 1)

s = replace_once(
    s,
    '        String tomorrow;\n        String dayAfter;\n    }',
    '        String tomorrow;\n        String dayAfter;\n        double tomorrowMm = Double.NaN;\n        double dayAfterMm = Double.NaN;\n    }',
    'RainData mm'
)
write(rain_path, s)

# 4) La caché conserva rainMm; las cachés viejas quedan como dato desconocido.
forecast_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowForecastEngine.java'
s = read(forecast_path)
s = replace_once(
    s,
    '        putFinite(o, "snowCm", d.snowCm);\n        return o;',
    '        putFinite(o, "snowCm", d.snowCm);\n        putFinite(o, "rainMm", d.rainMm);\n        return o;',
    'cache rainMm write'
)
s = replace_once(
    s,
    '        d.snowCm = o.optDouble("snowCm", 0);\n        return d;',
    '        d.snowCm = o.optDouble("snowCm", 0);\n        d.rainMm = o.has("rainMm") && !o.isNull("rainMm") ? o.optDouble("rainMm", Double.NaN) : Double.NaN;\n        return d;',
    'cache rainMm read'
)
s = replace_once(
    s,
    '        d.snowCm = b.snow;\n        d.state = categoricalSnow(b.peak);',
    '        d.snowCm = b.snow;\n        d.rainMm = Double.NaN;\n        d.state = categoricalSnow(b.peak);',
    'dayData rainMm init'
)
write(forecast_path, s)

# 5) Versión de aplicación y User-Agent.
gradle_path = 'android-app/app/build.gradle'
s = read(gradle_path)
if "versionName '1.4.10'" not in s:
    s = re.sub(r'versionCode\s+21\b', 'versionCode 22', s, count=1)
    s = re.sub(r"versionName '1\.4\.9'", "versionName '1.4.10'", s, count=1)
    s = re.sub(
        r'// BariSnow 1\.4\.9[^\n]*',
        '// BariSnow 1.4.10 muestra mm de lluvia o cm de nieve según el fenómeno diario dominante.',
        s,
        count=1
    )
write(gradle_path, s)

client_path = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client_path)
s = s.replace('BariSnowAndroidWidget/1.4.5', 'BariSnowAndroidWidget/1.4.10')
write(client_path, s)

print('Métrica dinámica de precipitación aplicada.')
