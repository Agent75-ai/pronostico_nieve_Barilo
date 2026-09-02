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


def patch_first_text_tag(text, label, attrs):
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


def patch_all_text_tags(text, label, attrs):
    pat = re.compile(r'<TextView\s+(?=[^>]*android:text="' + re.escape(label) + r'")[^>]*/>', re.S)
    out = []
    pos = 0
    for m in pat.finditer(text):
        out.append(text[pos:m.start()])
        tag = m.group(0)
        for key, value in attrs.items():
            attr_pat = re.compile(r'android:' + re.escape(key) + r'="[^"]*"')
            if attr_pat.search(tag):
                tag = attr_pat.sub(f'android:{key}="{value}"', tag, count=1)
            else:
                tag = tag[:-2] + f' android:{key}="{value}" />'
        out.append(tag)
        pos = m.end()
    out.append(text[pos:])
    return ''.join(out)


def harmonize_main_layout(path):
    s = read(path)

    # Encabezado: identidad visible pero subordinada al pronóstico.
    s = patch_first_text_tag(s, "BariSnow", {"textSize": "17sp"})
    s = patch_tag_by_id(s, "widget_zone", {"textSize": "12sp"})
    s = patch_tag_by_id(s, "widget_refresh", {"textSize": "22sp"})

    # Escala superior: 14 / 11 / 12 / 25 / 11 / 12.
    for label in ("Ahora", "+1 hora", "+2 horas", "+3 horas"):
        s = patch_first_text_tag(s, label, {"textSize": "14sp"})

    for prefix in ("now", "plus1", "plus2", "plus3"):
        s = patch_tag_by_id(s, prefix + "_clock", {"textSize": "11sp"})
        s = patch_tag_by_id(s, prefix + "_icon", {"textSize": "24sp"})
        s = patch_tag_by_id(s, prefix + "_state", {
            "textSize": "12sp",
            "layout_height": "38dp",
            "fontFamily": "sans-serif-medium",
            "maxLines": "2",
        })
        s = patch_tag_by_id(s, prefix + "_temp", {
            "textSize": "25sp",
            "fontFamily": "sans-serif-medium",
        })
        s = patch_tag_by_id(s, prefix + "_feels", {
            "textSize": "11sp",
            "layout_height": "20dp",
            "fontFamily": "sans-serif-medium",
        })
        s = patch_tag_by_id(s, prefix + "_rate", {
            "textSize": "12sp",
            "layout_height": "24dp",
            "maxLines": "1",
            "fontFamily": "sans-serif-medium",
            "text": "–",
        })

    # Bloque diario: títulos 16, estado 13, rótulos 11 y valores 16.
    s = patch_first_text_tag(s, "Mañana", {"textSize": "16sp"})
    s = patch_first_text_tag(s, "Pasado mañana", {"textSize": "16sp"})
    s = patch_all_text_tags(s, "Temperatura", {"textSize": "11sp"})
    s = patch_all_text_tags(s, "Sensación térmica", {"textSize": "11sp"})

    for vid in ("day1_state", "day2_state"):
        s = patch_tag_by_id(s, vid, {"textSize": "13sp", "fontFamily": "sans-serif-medium"})
    for vid in ("day1_metric_label", "day2_metric_label"):
        s = patch_tag_by_id(s, vid, {"textSize": "11sp"})
    for vid in ("day1_temp", "day2_temp", "day1_feels", "day2_feels", "day1_snow", "day2_snow"):
        s = patch_tag_by_id(s, vid, {"textSize": "16sp", "fontFamily": "sans-serif-medium"})

    # Pie de actualización se mantiene en el nivel mínimo de la escala.
    s = re.sub(r'(android:id="@\+id/widget_updated"[^>]*android:textSize=")[^"]+("[^>]*/>)',
               r'\g<1>10sp\g<2>', s, count=1, flags=re.S)

    write(path, s)


def harmonize_compact_layout(path):
    s = read(path)

    s = patch_first_text_tag(s, "BariSnow", {"textSize": "16sp"})
    s = patch_tag_by_id(s, "widget_zone", {"textSize": "11sp"})
    s = patch_tag_by_id(s, "widget_refresh", {"textSize": "21sp"})

    for label in ("Ahora", "+1 hora", "+2 horas", "+3 horas"):
        s = patch_first_text_tag(s, label, {"textSize": "13sp"})

    for prefix in ("now", "plus1", "plus2", "plus3"):
        s = patch_tag_by_id(s, prefix + "_clock", {"textSize": "10sp"})
        s = patch_tag_by_id(s, prefix + "_icon", {"textSize": "22sp"})
        s = patch_tag_by_id(s, prefix + "_state", {
            "textSize": "11sp",
            "layout_height": "36dp",
            "fontFamily": "sans-serif-medium",
            "maxLines": "2",
        })
        s = patch_tag_by_id(s, prefix + "_temp", {"textSize": "23sp", "fontFamily": "sans-serif-medium"})
        s = patch_tag_by_id(s, prefix + "_feels", {"textSize": "10sp", "layout_height": "19dp"})
        s = patch_tag_by_id(s, prefix + "_rate", {
            "textSize": "11sp",
            "layout_height": "22dp",
            "maxLines": "1",
            "fontFamily": "sans-serif-medium",
            "text": "–",
        })

    write(path, s)


harmonize_main_layout('android-app/app/src/main/res/layout/widget_barisnow.xml')
harmonize_compact_layout('android-app/app/src/main/res/layout/widget_barisnow_compact.xml')

# Versión 1.4.15.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+26\b', 'versionCode 27', s, count=1)
s = s.replace("versionName '1.4.14'", "versionName '1.4.15'")
s = re.sub(r'// BariSnow 1\.4\.14[^\n]*',
           '// BariSnow 1.4.15 armoniza la jerarquía tipográfica completa del widget.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.15', s)
write(client, s)

print('Jerarquía tipográfica BariSnow 1.4.15 aplicada.')
