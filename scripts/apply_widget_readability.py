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


def patch_all_text_tags(text, label, attrs):
    pat = re.compile(r'<TextView\s+(?=[^>]*android:text="' + re.escape(label) + r'")[^>]*/>', re.S)
    pos = 0
    out = []
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


def update_main_layout(path):
    s = read(path)
    s = s.replace('android:layout_weight="1.20"', 'android:layout_weight="1.30"', 1)
    s = s.replace('android:layout_weight="0.80"', 'android:layout_weight="0.70"', 1)

    for label in ("Ahora", "+1 hora", "+2 horas", "+3 horas"):
        s = patch_text_tag(s, label, {"textSize": "14sp"})

    for prefix in ("now", "plus1", "plus2", "plus3"):
        s = patch_tag_by_id(s, prefix + "_clock", {"textSize": "11sp"})
        s = patch_tag_by_id(s, prefix + "_icon", {"textSize": "25sp"})
        s = patch_tag_by_id(s, prefix + "_state", {"textSize": "13sp", "layout_height": "40dp"})
        s = patch_tag_by_id(s, prefix + "_temp", {"textSize": "24sp"})
        s = patch_tag_by_id(s, prefix + "_feels", {"textSize": "11sp", "layout_height": "20dp"})
        s = patch_tag_by_id(s, prefix + "_rate", {"textSize": "11sp", "layout_height": "34dp", "lineSpacingExtra": "2dp"})

    s = patch_text_tag(s, "Mañana", {"textSize": "15sp"})
    s = patch_text_tag(s, "Pasado mañana", {"textSize": "15sp"})
    s = patch_all_text_tags(s, "Temperatura", {"textSize": "11sp"})
    s = patch_all_text_tags(s, "Sensación térmica", {"textSize": "11sp"})
    for vid in ("day1_metric_label", "day2_metric_label"):
        s = patch_tag_by_id(s, vid, {"textSize": "11sp"})
    for vid in ("day1_state", "day2_state"):
        s = patch_tag_by_id(s, vid, {"textSize": "14sp"})
    for vid in ("day1_temp", "day2_temp"):
        s = patch_tag_by_id(s, vid, {"textSize": "17sp"})
    for vid in ("day1_feels", "day2_feels"):
        s = patch_tag_by_id(s, vid, {"textSize": "15sp"})
    for vid in ("day1_snow", "day2_snow"):
        s = patch_tag_by_id(s, vid, {"textSize": "17sp"})
    write(path, s)


def update_compact_layout(path):
    s = read(path)
    for label in ("Ahora", "+1 hora", "+2 horas", "+3 horas"):
        s = patch_text_tag(s, label, {"textSize": "13sp"})
    for prefix in ("now", "plus1", "plus2", "plus3"):
        s = patch_tag_by_id(s, prefix + "_clock", {"textSize": "10sp"})
        s = patch_tag_by_id(s, prefix + "_icon", {"textSize": "23sp"})
        s = patch_tag_by_id(s, prefix + "_state", {"textSize": "12sp", "layout_height": "38dp"})
        s = patch_tag_by_id(s, prefix + "_temp", {"textSize": "22sp"})
        s = patch_tag_by_id(s, prefix + "_feels", {"textSize": "10sp", "layout_height": "19dp"})
        s = patch_tag_by_id(s, prefix + "_rate", {"textSize": "10sp", "layout_height": "31dp", "lineSpacingExtra": "1dp"})
    write(path, s)


update_main_layout('android-app/app/src/main/res/layout/widget_barisnow.xml')
update_compact_layout('android-app/app/src/main/res/layout/widget_barisnow_compact.xml')

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+24\b', 'versionCode 25', s, count=1)
s = s.replace("versionName '1.4.12'", "versionName '1.4.13'")
s = re.sub(r'// BariSnow 1\.4\.12[^\n]*',
           '// BariSnow 1.4.13 aumenta la jerarquía tipográfica y mejora la lectura del widget.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.13', s)
write(client, s)

print('Tipografía BariSnow 1.4.13 aplicada.')
