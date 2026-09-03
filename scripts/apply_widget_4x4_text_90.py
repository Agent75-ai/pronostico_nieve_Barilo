from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


# Reduce exclusivamente la tipografía del widget completo 4x4 al 90%.
# Íconos meteorológicos, copo de marca y botón de refresco conservan su tamaño.
layout = 'android-app/app/src/main/res/layout/widget_barisnow.xml'
s = read(layout)

textview_re = re.compile(r'<TextView\b[^>]*?/?>', re.S)
size_re = re.compile(r'android:textSize="([0-9]+(?:\.[0-9]+)?)sp"')
id_re = re.compile(r'android:id="@\+id/([^"]+)"')
text_re = re.compile(r'android:text="([^"]*)"')


def shrink_tag(match):
    tag = match.group(0)
    size_match = size_re.search(tag)
    if not size_match:
        return tag

    view_id_match = id_re.search(tag)
    view_id = view_id_match.group(1) if view_id_match else ''
    text_match = text_re.search(tag)
    literal_text = text_match.group(1) if text_match else ''

    # Elementos pictográficos: no son tipografía informativa.
    if view_id == 'widget_refresh' or view_id.endswith('_icon') or literal_text in {'❄', '↻'}:
        return tag

    old = float(size_match.group(1))
    new = old * 0.90
    # Una cifra decimal permite conservar exactamente la reducción solicitada.
    replacement = f'android:textSize="{new:.1f}sp"'
    return tag[:size_match.start()] + replacement + tag[size_match.end():]


s = textview_re.sub(shrink_tag, s)
write(layout, s)

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+32\b', 'versionCode 33', s, count=1)
s = s.replace("versionName '1.4.20'", "versionName '1.4.21'")
s = re.sub(r'// BariSnow 1\.4\.20[^\n]*',
           '// BariSnow 1.4.21 reduce un 10% la tipografía del widget completo 4x4.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.21', s)
write(client, s)

print('Tipografía 90% del widget completo 4x4 aplicada para BariSnow 1.4.21.')
