from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def patch_tag_by_id(text, view_id, attrs):
    pat = re.compile(r'<TextView\s+[^>]*android:id="@\+id/' + re.escape(view_id) + r'"[^>]*/>', re.S)
    m = pat.search(text)
    if not m:
        raise RuntimeError(f'No se encontró {view_id}')
    tag = m.group(0)
    for key, value in attrs.items():
        attr_pat = re.compile(r'android:' + re.escape(key) + r'="[^"]*"')
        if attr_pat.search(tag):
            tag = attr_pat.sub(f'android:{key}="{value}"', tag, count=1)
        else:
            tag = tag[:-2] + f' android:{key}="{value}" />'
    return text[:m.start()] + tag + text[m.end():]


def patch_text_tag(text, label, attrs):
    pat = re.compile(r'<TextView\s+(?=[^>]*android:text="' + re.escape(label) + r'")[^>]*/>', re.S)
    m = pat.search(text)
    if not m:
        return text
    tag = m.group(0)
    for key, value in attrs.items():
        attr_pat = re.compile(r'android:' + re.escape(key) + r'="[^"]*"')
        if attr_pat.search(tag):
            tag = attr_pat.sub(f'android:{key}="{value}"', tag, count=1)
        else:
            tag = tag[:-2] + f' android:{key}="{value}" />'
    return text[:m.start()] + tag + text[m.end():]


def hide_daily_feels_row(text, feels_id):
    # Conserva los IDs para RemoteViews, pero deja la fila sin altura visual.
    pat = re.compile(
        r'(<LinearLayout\s+[^>]*android:layout_height="0dp"[^>]*>\s*'
        r'<TextView[^>]*android:text="Sensación térmica"[^>]*/>\s*'
        r'<TextView[^>]*android:id="@\+id/' + re.escape(feels_id) + r'"[^>]*/>\s*'
        r'</LinearLayout>)',
        re.S,
    )
    m = pat.search(text)
    if not m:
        return text
    row = m.group(1)
    row = re.sub(r'android:layout_weight="[^"]+"', 'android:layout_weight="0"', row, count=1)
    row = re.sub(r'android:layout_marginTop="[^"]+"', 'android:layout_marginTop="0dp"', row, count=1)
    return text[:m.start()] + row + text[m.end():]


layout = 'android-app/app/src/main/res/layout/widget_barisnow.xml'
s = read(layout)

# Contenedor general y cabecera más fina.
s = re.sub(r'android:padding="10dp"', 'android:padding="8dp"', s, count=1)
s = re.sub(r'android:layout_height="52dp"', 'android:layout_height="42dp"', s, count=1)
s = patch_text_tag(s, '❄', {'textSize': '22sp'})
s = patch_text_tag(s, 'BariSnow', {'textSize': '16sp'})
s = patch_tag_by_id(s, 'widget_zone', {'textSize': '11sp'})
s = patch_tag_by_id(s, 'widget_updated', {'textSize': '10sp'})
s = patch_tag_by_id(s, 'widget_refresh', {'textSize': '20sp', 'layout_width': '34dp', 'layout_height': '34dp'})

# Reparto vertical 4x3: más espacio al bloque horario y resumen diario compacto.
s = s.replace('android:layout_weight="1.55"', 'android:layout_weight="1.48"', 1)
s = s.replace('android:layout_weight="0.95"', 'android:layout_weight="0.72"', 1)
s = s.replace('android:layout_marginTop="8dp"\n        android:layout_weight="0.72"', 'android:layout_marginTop="5dp"\n        android:layout_weight="0.72"', 1)

for label in ('Ahora', '+1 hora', '+2 horas', '+3 horas'):
    s = patch_text_tag(s, label, {'textSize': '13sp'})

for prefix in ('now', 'plus1', 'plus2', 'plus3'):
    s = patch_tag_by_id(s, prefix + '_clock', {'textSize': '10sp', 'layout_marginTop': '1dp'})
    s = patch_tag_by_id(s, prefix + '_icon', {'textSize': '24sp', 'layout_marginTop': '3dp'})
    s = patch_tag_by_id(s, prefix + '_state', {
        'textSize': '12sp', 'layout_height': '34dp', 'layout_marginTop': '2dp'
    })
    s = patch_tag_by_id(s, prefix + '_temp', {'textSize': '18sp', 'layout_marginTop': '2dp'})
    s = patch_tag_by_id(s, prefix + '_feels', {'textSize': '10sp', 'layout_marginTop': '2dp'})
    s = patch_tag_by_id(s, prefix + '_rate', {'textSize': '11sp', 'layout_marginTop': '3dp'})

# Separadores horarios más cortos para dar aire visual.
s = s.replace('android:layout_marginTop="8dp" android:layout_marginBottom="8dp" android:background="#29485D"',
              'android:layout_marginTop="5dp" android:layout_marginBottom="5dp" android:background="#29485D"')

# Tarjetas diarias: jerarquía compacta, sin la fila visible de sensación térmica.
for label in ('Mañana', 'Pasado mañana'):
    s = patch_text_tag(s, label, {'textSize': '13sp'})
for vid in ('day1_icon', 'day2_icon'):
    s = patch_tag_by_id(s, vid, {'textSize': '22sp', 'layout_width': '34dp'})
for vid in ('day1_state', 'day2_state'):
    s = patch_tag_by_id(s, vid, {'textSize': '12sp', 'layout_marginLeft': '4dp'})
for vid in ('day1_temp', 'day2_temp', 'day1_snow', 'day2_snow'):
    s = patch_tag_by_id(s, vid, {'textSize': '13sp'})
for vid in ('day1_metric_label', 'day2_metric_label'):
    s = patch_tag_by_id(s, vid, {'textSize': '10sp'})
s = hide_daily_feels_row(s, 'day1_feels')
s = hide_daily_feels_row(s, 'day2_feels')

# Reduce paddings de las dos tarjetas diarias.
s = s.replace('android:background="@drawable/widget_day_panel"\n            android:orientation="vertical"\n            android:padding="10dp"',
              'android:background="@drawable/widget_day_panel"\n            android:orientation="vertical"\n            android:padding="7dp"')

write(layout, s)

# Tamaño objetivo real 4x3.
info = 'android-app/app/src/main/res/xml/barisnow_widget_info.xml'
s = read(info)
s = re.sub(r'android:minWidth="[^"]+"', 'android:minWidth="280dp"', s, count=1)
s = re.sub(r'android:minHeight="[^"]+"', 'android:minHeight="220dp"', s, count=1)
s = re.sub(r'android:minResizeWidth="[^"]+"', 'android:minResizeWidth="260dp"', s, count=1)
s = re.sub(r'android:minResizeHeight="[^"]+"', 'android:minResizeHeight="205dp"', s, count=1)
s = re.sub(r'android:targetCellWidth="[^"]+"', 'android:targetCellWidth="4"', s, count=1)
s = re.sub(r'android:targetCellHeight="[^"]+"', 'android:targetCellHeight="3"', s, count=1)
write(info, s)

# BariSnow 1.4.18.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+29\b', 'versionCode 30', s, count=1)
s = s.replace("versionName '1.4.17'", "versionName '1.4.18'")
s = re.sub(r'// BariSnow 1\.4\.17[^\n]*',
           '// BariSnow 1.4.18 adapta el widget premium aprobado al formato 4x3.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.18', s)
write(client, s)

print('Widget premium 4x3 BariSnow 1.4.18 aplicado.')
