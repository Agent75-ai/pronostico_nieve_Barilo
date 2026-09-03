from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


# Escala tipográfica equilibrada del widget completo 4x4.
# El bloque horario Ahora/+1/+2/+3 aumenta 15% respecto de 1.4.25.
# Encabezado, bloque diario, iconos y widget completo 4x3 quedan sin cambios.
# El valor diario de precipitación se mantiene en 12sp mediante RemoteViews.
layout = 'android-app/app/src/main/res/layout/widget_barisnow.xml'
s = read(layout)

textview_re = re.compile(r'<TextView\b[^>]*?/?>', re.S)
size_re = re.compile(r'android:textSize="([0-9]+(?:\.[0-9]+)?)sp"')
id_re = re.compile(r'android:id="@\+id/([^"]+)"')
text_re = re.compile(r'android:text="([^"]*)"')

EXEMPT_IDS = {'widget_refresh'}
EXEMPT_LITERALS = {'❄', '↻'}
DAILY_LABELS = {'Temperatura', 'Sensación térmica'}
HOURLY_TITLE_LITERALS = {'Ahora', '+1 hora', '+2 horas', '+3 horas'}
HOURLY_PREFIXES = ('now_', 'plus1_', 'plus2_', 'plus3_')
BASE_SCALE = 0.8325
HOURLY_SCALE = BASE_SCALE * 1.15


def set_attr(tag, key, value):
    pat = re.compile(r'android:' + re.escape(key) + r'="[^"]*"')
    if pat.search(tag):
        return pat.sub(f'android:{key}="{value}"', tag, count=1)
    if tag.endswith('/>'):
        return tag[:-2] + f' android:{key}="{value}" />'
    return tag


def scale_tag(match):
    tag = match.group(0)
    size_match = size_re.search(tag)
    if not size_match:
        return tag

    view_id_match = id_re.search(tag)
    view_id = view_id_match.group(1) if view_id_match else ''
    text_match = text_re.search(tag)
    literal_text = text_match.group(1) if text_match else ''

    if view_id in EXEMPT_IDS or view_id.endswith('_icon') or literal_text in EXEMPT_LITERALS:
        return tag

    is_hourly = literal_text in HOURLY_TITLE_LITERALS or view_id.startswith(HOURLY_PREFIXES)
    base = float(size_match.group(1))
    scale = HOURLY_SCALE if is_hourly else BASE_SCALE
    final_size = base * scale
    tag = tag[:size_match.start()] + f'android:textSize="{final_size:.1f}sp"' + tag[size_match.end():]

    if literal_text in DAILY_LABELS:
        tag = set_attr(tag, 'maxLines', '1')
        tag = set_attr(tag, 'ellipsize', 'end')

    return tag


s = textview_re.sub(scale_tag, s)
write(layout, s)

# Reducir exclusivamente el valor diario de precipitación desde RemoteViews.
provider = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider)
if 'import android.util.TypedValue;' not in s:
    s = s.replace('import android.graphics.Color;\n', 'import android.graphics.Color;\nimport android.util.TypedValue;\n')

needle = '        views.setTextColor(stateId, colorFor(day.state));\n'
replacement = ('        // Dato terciario: más pequeño que temperatura y sensación, sin alterar el XML del widget.\n'
               '        views.setTextViewTextSize(metricId, TypedValue.COMPLEX_UNIT_SP, 12f);\n'
               '        views.setTextColor(stateId, colorFor(day.state));\n')
if 'views.setTextViewTextSize(metricId, TypedValue.COMPLEX_UNIT_SP, 12f);' not in s:
    if needle not in s:
        raise SystemExit('No se encontró el punto de inserción en applyDay().')
    s = s.replace(needle, replacement, 1)
write(provider, s)

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+37\b', 'versionCode 38', s, count=1)
s = s.replace("versionName '1.4.25'", "versionName '1.4.26'")
s = re.sub(r'// BariSnow 1\.4\.25[^\n]*',
           '// BariSnow 1.4.26 aumenta 15% la tipografía del bloque horario del widget completo 4x4.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.26', s)
write(client, s)

print('BariSnow 1.4.26: tipografía de Ahora/+1/+2/+3 aumentada 15% en el widget completo 4x4.')
