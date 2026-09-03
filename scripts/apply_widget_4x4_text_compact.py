from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


# Escala tipográfica final del widget completo 4x4.
# El pipeline reconstruye primero el diseño limpio original y luego este parche
# deja toda la tipografía informativa al 83,25% del tamaño base.
# Es el punto medio entre 1.4.21 (demasiado grande) y 1.4.22 (demasiado chico):
# aproximadamente +8,8% frente a 1.4.22 y -7,5% frente a 1.4.21.
# Los iconos meteorológicos, el copo de marca y el botón de refresco no cambian.
layout = 'android-app/app/src/main/res/layout/widget_barisnow.xml'
s = read(layout)

textview_re = re.compile(r'<TextView\b[^>]*?/?>', re.S)
size_re = re.compile(r'android:textSize="([0-9]+(?:\.[0-9]+)?)sp"')
id_re = re.compile(r'android:id="@\+id/([^"]+)"')
text_re = re.compile(r'android:text="([^"]*)"')

EXEMPT_IDS = {'widget_refresh'}
EXEMPT_LITERALS = {'❄', '↻'}
DAILY_LABELS = {'Temperatura', 'Sensación térmica'}


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

    base = float(size_match.group(1))
    balanced = base * 0.8325
    tag = tag[:size_match.start()] + f'android:textSize="{balanced:.1f}sp"' + tag[size_match.end():]

    # Los rótulos diarios permanecen en una sola línea para que la ganancia de
    # tamaño no vuelva a provocar el recorte observado en "Sensación térmica".
    if literal_text in DAILY_LABELS:
        tag = set_attr(tag, 'maxLines', '1')
        tag = set_attr(tag, 'ellipsize', 'end')

    return tag


s = textview_re.sub(scale_tag, s)
write(layout, s)

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+34\b', 'versionCode 35', s, count=1)
s = s.replace("versionName '1.4.22'", "versionName '1.4.23'")
s = re.sub(r'// BariSnow 1\.4\.22[^\n]*',
           '// BariSnow 1.4.23 equilibra la tipografía del widget completo 4x4 en una escala intermedia.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.23', s)
write(client, s)

print('Tipografía equilibrada 83,25% del widget completo 4x4 aplicada para BariSnow 1.4.23.')
