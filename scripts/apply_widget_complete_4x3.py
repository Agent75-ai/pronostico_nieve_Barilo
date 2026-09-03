from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


def hour_column(prefix, title):
    return f'''        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center_horizontal|center_vertical"
            android:orientation="vertical"
            android:paddingLeft="1dp"
            android:paddingRight="1dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="{title}" android:textColor="#79B8FF" android:textSize="13sp" />
            <TextView android:id="@+id/{prefix}_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="1dp" android:includeFontPadding="false" android:text="—" android:textColor="#A9BAC7" android:textSize="10sp" />
            <TextView android:id="@+id/{prefix}_icon" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:includeFontPadding="false" android:text="❄" android:textSize="23sp" />
            <TextView android:id="@+id/{prefix}_state" android:layout_width="match_parent" android:layout_height="27dp" android:layout_marginTop="1dp" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#5DB7FF" android:textSize="11sp" />
            <TextView android:id="@+id/{prefix}_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="1dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="18sp" />
            <TextView android:id="@+id/{prefix}_feels" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="1dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="Sens. —" android:textColor="#73B9FF" android:textSize="10sp" />
            <TextView android:id="@+id/{prefix}_rate" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:ellipsize="end" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="–" android:textColor="#D4E4EE" android:textSize="10sp" />
        </LinearLayout>'''


def divider():
    return '''        <TextView
            android:layout_width="1dp"
            android:layout_height="match_parent"
            android:layout_marginTop="4dp"
            android:layout_marginBottom="4dp"
            android:background="#29485D"
            android:text="" />'''


def day_card(n, title, right_margin=False):
    margin = 'android:layout_marginRight="3dp"' if right_margin else 'android:layout_marginLeft="3dp"'
    return f'''        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            {margin}
            android:layout_weight="1"
            android:background="@drawable/widget_day_panel"
            android:orientation="vertical"
            android:padding="6dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="{title}" android:textColor="#79B8FF" android:textSize="13sp" />
            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="2dp" android:layout_weight="1.05" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day{n}_icon" android:layout_width="31dp" android:layout_height="wrap_content" android:gravity="center" android:includeFontPadding="false" android:text="❄" android:textSize="20sp" />
                <TextView android:id="@+id/day{n}_state" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_marginLeft="3dp" android:layout_weight="1" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#EEF7FC" android:textSize="11sp" />
            </LinearLayout>
            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="0.82" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:includeFontPadding="false" android:text="Temp." android:textColor="#A9BAC7" android:textSize="9sp" />
                <TextView android:id="@+id/day{n}_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginLeft="3dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="11sp" />
                <TextView android:layout_width="0dp" android:layout_height="1dp" android:layout_weight="1" android:text="" />
                <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:includeFontPadding="false" android:text="Sens." android:textColor="#A9BAC7" android:textSize="9sp" />
                <TextView android:id="@+id/day{n}_feels" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginLeft="3dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#73B9FF" android:textSize="11sp" />
            </LinearLayout>
            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_weight="0.82" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day{n}_metric_label" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:ellipsize="end" android:includeFontPadding="false" android:maxLines="1" android:text="Nieve" android:textColor="#A9BAC7" android:textSize="9sp" />
                <TextView android:id="@+id/day{n}_snow" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#D4E4EE" android:textSize="11sp" />
            </LinearLayout>
        </LinearLayout>'''


layout = f'''<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:orientation="vertical"
    android:padding="7dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="39dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">
        <TextView android:layout_width="30dp" android:layout_height="match_parent" android:gravity="center" android:includeFontPadding="false" android:text="❄" android:textColor="#B9E3FF" android:textSize="21sp" />
        <LinearLayout android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:orientation="vertical">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="BariSnow" android:textColor="#EEF7FC" android:textSize="16sp" />
            <TextView android:id="@+id/widget_zone" android:layout_width="match_parent" android:layout_height="wrap_content" android:ellipsize="end" android:includeFontPadding="false" android:maxLines="1" android:text="Barrio Lago Moreno" android:textColor="#A9BAC7" android:textSize="10sp" />
        </LinearLayout>
        <TextView android:id="@+id/widget_updated" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginRight="1dp" android:ellipsize="end" android:gravity="center_vertical|right" android:includeFontPadding="false" android:maxLines="1" android:text="Actualizando…" android:textColor="#A9BAC7" android:textSize="9sp" />
        <TextView android:id="@+id/widget_refresh" android:layout_width="32dp" android:layout_height="32dp" android:gravity="center" android:includeFontPadding="false" android:text="↻" android:textColor="#DDF6FF" android:textSize="19sp" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1.62"
        android:background="@drawable/widget_hour_panel"
        android:baselineAligned="false"
        android:orientation="horizontal"
        android:padding="5dp">
{hour_column('now', 'Ahora')}
{divider()}
{hour_column('plus1', '+1 hora')}
{divider()}
{hour_column('plus2', '+2 horas')}
{divider()}
{hour_column('plus3', '+3 horas')}
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="4dp"
        android:layout_weight="0.88"
        android:baselineAligned="false"
        android:orientation="horizontal">
{day_card(1, 'Mañana', True)}
{day_card(2, 'Pasado mañana', False)}
    </LinearLayout>
</LinearLayout>
'''
write('android-app/app/src/main/res/layout/widget_barisnow_complete_4x3.xml', layout)

info = '''<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="280dp"
    android:minHeight="220dp"
    android:minResizeWidth="260dp"
    android:minResizeHeight="205dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_barisnow_complete_4x3"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:targetCellWidth="4"
    android:targetCellHeight="3" />
'''
write('android-app/app/src/main/res/xml/barisnow_widget_complete_4x3_info.xml', info)

provider = '''package com.barisnow.app;

import android.appwidget.AppWidgetProvider;

public final class BariSnowComplete4x3WidgetProvider extends BariSnowWidgetProvider {
    @Override
    protected Class<? extends AppWidgetProvider> providerClass() {
        return BariSnowComplete4x3WidgetProvider.class;
    }

    @Override
    protected int layoutResId() {
        return R.layout.widget_barisnow_complete_4x3;
    }

    @Override
    protected int refreshRequestCode() {
        return 1302;
    }
}
'''
write('android-app/app/src/main/java/com/barisnow/app/BariSnowComplete4x3WidgetProvider.java', provider)

manifest = 'android-app/app/src/main/AndroidManifest.xml'
s = read(manifest)
receiver = '''\n        <receiver
            android:name=".BariSnowComplete4x3WidgetProvider"
            android:exported="false"
            android:label="@string/widget_complete_4x3_name">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
                <action android:name="com.barisnow.app.ACTION_WIDGET_REFRESH" />
            </intent-filter>
            <meta-data
                android:name="android.appwidget.provider"
                android:resource="@xml/barisnow_widget_complete_4x3_info" />
        </receiver>\n'''
if '.BariSnowComplete4x3WidgetProvider' not in s:
    anchor = '        <receiver\n            android:name=".BariSnowDailyWidgetProvider"'
    pos = s.find(anchor)
    if pos < 0:
        raise RuntimeError('No se encontró ancla de receiver diario')
    s = s[:pos] + receiver + '\n' + s[pos:]
write(manifest, s)

strings = 'android-app/app/src/main/res/values/strings.xml'
s = read(strings)
if 'widget_complete_4x3_name' not in s:
    s = s.replace('    <string name="widget_complete_name">BariSnow · Completo</string>\n',
                  '    <string name="widget_complete_name">BariSnow · Completo 4×4</string>\n'
                  '    <string name="widget_complete_4x3_name">BariSnow · Completo 4×3</string>\n')
else:
    s = s.replace('BariSnow · Completo</string>', 'BariSnow · Completo 4×4</string>')
write(strings, s)

base = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(base)
if 'BariSnowComplete4x3WidgetProvider.class' not in s:
    needle = '        sendRefresh(context, BariSnowWidgetProvider.class);\n'
    s = s.replace(needle, needle + '        sendRefresh(context, BariSnowComplete4x3WidgetProvider.class);\n', 1)
write(base, s)

gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+31\b', 'versionCode 32', s, count=1)
s = s.replace("versionName '1.4.19'", "versionName '1.4.20'")
s = re.sub(r'// BariSnow 1\.4\.19[^\n]*',
           '// BariSnow 1.4.20 agrega un segundo widget completo en formato 4x3.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.20', s)
write(client, s)

print('Widget completo 4x3 adicional BariSnow 1.4.20 aplicado.')
