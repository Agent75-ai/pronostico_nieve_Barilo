from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(text, encoding="utf-8")


MAIN_LAYOUT = r'''<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:orientation="vertical"
    android:padding="10dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="52dp"
        android:gravity="center_vertical"
        android:orientation="horizontal">

        <TextView
            android:layout_width="34dp"
            android:layout_height="match_parent"
            android:gravity="center"
            android:includeFontPadding="false"
            android:text="❄"
            android:textColor="#B9E3FF"
            android:textSize="25sp" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:orientation="vertical">

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:fontFamily="sans-serif-medium"
                android:includeFontPadding="false"
                android:text="BariSnow"
                android:textColor="#EEF7FC"
                android:textSize="18sp" />

            <TextView
                android:id="@+id/widget_zone"
                android:layout_width="match_parent"
                android:layout_height="wrap_content"
                android:ellipsize="end"
                android:includeFontPadding="false"
                android:maxLines="1"
                android:text="Barrio Lago Moreno"
                android:textColor="#A9BAC7"
                android:textSize="13sp" />
        </LinearLayout>

        <TextView
            android:id="@+id/widget_updated"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:layout_marginRight="2dp"
            android:ellipsize="end"
            android:gravity="center_vertical|right"
            android:includeFontPadding="false"
            android:maxLines="1"
            android:text="Actualizando…"
            android:textColor="#A9BAC7"
            android:textSize="11sp" />

        <TextView
            android:id="@+id/widget_refresh"
            android:layout_width="38dp"
            android:layout_height="38dp"
            android:gravity="center"
            android:includeFontPadding="false"
            android:text="↻"
            android:textColor="#DDF6FF"
            android:textSize="22sp" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1.55"
        android:background="@drawable/widget_hour_panel"
        android:baselineAligned="false"
        android:orientation="horizontal"
        android:padding="8dp">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center_horizontal|center_vertical"
            android:orientation="vertical"
            android:paddingLeft="2dp"
            android:paddingRight="2dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="Ahora" android:textColor="#79B8FF" android:textSize="16sp" />
            <TextView android:id="@+id/now_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:includeFontPadding="false" android:text="—" android:textColor="#A9BAC7" android:textSize="13sp" />
            <TextView android:id="@+id/now_icon" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="7dp" android:includeFontPadding="false" android:text="❄" android:textSize="30sp" />
            <TextView android:id="@+id/now_state" android:layout_width="match_parent" android:layout_height="42dp" android:layout_marginTop="5dp" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#5DB7FF" android:textSize="15sp" />
            <TextView android:id="@+id/now_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="4dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="21sp" />
            <TextView android:id="@+id/now_feels" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="5dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="Sens. —" android:textColor="#73B9FF" android:textSize="13sp" />
            <TextView android:id="@+id/now_rate" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="–" android:textColor="#D4E4EE" android:textSize="14sp" />
        </LinearLayout>

        <TextView android:layout_width="1dp" android:layout_height="match_parent" android:layout_marginTop="8dp" android:layout_marginBottom="8dp" android:background="#29485D" android:text="" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center_horizontal|center_vertical"
            android:orientation="vertical"
            android:paddingLeft="2dp"
            android:paddingRight="2dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="+1 hora" android:textColor="#79B8FF" android:textSize="16sp" />
            <TextView android:id="@+id/plus1_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:includeFontPadding="false" android:text="—" android:textColor="#A9BAC7" android:textSize="13sp" />
            <TextView android:id="@+id/plus1_icon" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="7dp" android:includeFontPadding="false" android:text="❄" android:textSize="30sp" />
            <TextView android:id="@+id/plus1_state" android:layout_width="match_parent" android:layout_height="42dp" android:layout_marginTop="5dp" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#5DB7FF" android:textSize="15sp" />
            <TextView android:id="@+id/plus1_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="4dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="21sp" />
            <TextView android:id="@+id/plus1_feels" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="5dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="Sens. —" android:textColor="#73B9FF" android:textSize="13sp" />
            <TextView android:id="@+id/plus1_rate" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="–" android:textColor="#D4E4EE" android:textSize="14sp" />
        </LinearLayout>

        <TextView android:layout_width="1dp" android:layout_height="match_parent" android:layout_marginTop="8dp" android:layout_marginBottom="8dp" android:background="#29485D" android:text="" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center_horizontal|center_vertical"
            android:orientation="vertical"
            android:paddingLeft="2dp"
            android:paddingRight="2dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="+2 horas" android:textColor="#79B8FF" android:textSize="16sp" />
            <TextView android:id="@+id/plus2_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:includeFontPadding="false" android:text="—" android:textColor="#A9BAC7" android:textSize="13sp" />
            <TextView android:id="@+id/plus2_icon" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="7dp" android:includeFontPadding="false" android:text="❄" android:textSize="30sp" />
            <TextView android:id="@+id/plus2_state" android:layout_width="match_parent" android:layout_height="42dp" android:layout_marginTop="5dp" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#5DB7FF" android:textSize="15sp" />
            <TextView android:id="@+id/plus2_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="4dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="21sp" />
            <TextView android:id="@+id/plus2_feels" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="5dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="Sens. —" android:textColor="#73B9FF" android:textSize="13sp" />
            <TextView android:id="@+id/plus2_rate" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="–" android:textColor="#D4E4EE" android:textSize="14sp" />
        </LinearLayout>

        <TextView android:layout_width="1dp" android:layout_height="match_parent" android:layout_marginTop="8dp" android:layout_marginBottom="8dp" android:background="#29485D" android:text="" />

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center_horizontal|center_vertical"
            android:orientation="vertical"
            android:paddingLeft="2dp"
            android:paddingRight="2dp">
            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="+3 horas" android:textColor="#79B8FF" android:textSize="16sp" />
            <TextView android:id="@+id/plus3_clock" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="2dp" android:includeFontPadding="false" android:text="—" android:textColor="#A9BAC7" android:textSize="13sp" />
            <TextView android:id="@+id/plus3_icon" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="7dp" android:includeFontPadding="false" android:text="❄" android:textSize="30sp" />
            <TextView android:id="@+id/plus3_state" android:layout_width="match_parent" android:layout_height="42dp" android:layout_marginTop="5dp" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:gravity="center" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#5DB7FF" android:textSize="15sp" />
            <TextView android:id="@+id/plus3_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:layout_marginTop="4dp" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="21sp" />
            <TextView android:id="@+id/plus3_feels" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="5dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="Sens. —" android:textColor="#73B9FF" android:textSize="13sp" />
            <TextView android:id="@+id/plus3_rate" android:layout_width="match_parent" android:layout_height="wrap_content" android:layout_marginTop="8dp" android:gravity="center" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="1" android:text="–" android:textColor="#D4E4EE" android:textSize="14sp" />
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_marginTop="8dp"
        android:layout_weight="0.95"
        android:baselineAligned="false"
        android:orientation="horizontal">

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_marginRight="4dp"
            android:layout_weight="1"
            android:background="@drawable/widget_day_panel"
            android:orientation="vertical"
            android:padding="10dp">

            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="Mañana" android:textColor="#79B8FF" android:textSize="17sp" />

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="6dp" android:layout_weight="1.1" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day1_icon" android:layout_width="42dp" android:layout_height="wrap_content" android:gravity="center" android:includeFontPadding="false" android:text="❄" android:textSize="28sp" />
                <TextView android:id="@+id/day1_state" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_marginLeft="6dp" android:layout_weight="1" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#EEF7FC" android:textSize="15sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="4dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Temperatura" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day1_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="17sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="3dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Sensación térmica" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day1_feels" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#73B9FF" android:textSize="17sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="3dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day1_metric_label" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Nieve" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day1_snow" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#D8EEF9" android:textSize="17sp" />
            </LinearLayout>
        </LinearLayout>

        <LinearLayout
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_marginLeft="4dp"
            android:layout_weight="1"
            android:background="@drawable/widget_day_panel"
            android:orientation="vertical"
            android:padding="10dp">

            <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="Pasado mañana" android:textColor="#79B8FF" android:textSize="17sp" />

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="6dp" android:layout_weight="1.1" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day2_icon" android:layout_width="42dp" android:layout_height="wrap_content" android:gravity="center" android:includeFontPadding="false" android:text="❄" android:textSize="28sp" />
                <TextView android:id="@+id/day2_state" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_marginLeft="6dp" android:layout_weight="1" android:ellipsize="end" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:maxLines="2" android:text="—" android:textColor="#EEF7FC" android:textSize="15sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="4dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Temperatura" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day2_temp" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#F4FAFD" android:textSize="17sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="3dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Sensación térmica" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day2_feels" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#73B9FF" android:textSize="17sp" />
            </LinearLayout>

            <LinearLayout android:layout_width="match_parent" android:layout_height="0dp" android:layout_marginTop="3dp" android:layout_weight="0.78" android:gravity="center_vertical" android:orientation="horizontal">
                <TextView android:id="@+id/day2_metric_label" android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:includeFontPadding="false" android:text="Nieve" android:textColor="#A9BAC7" android:textSize="13sp" />
                <TextView android:id="@+id/day2_snow" android:layout_width="wrap_content" android:layout_height="wrap_content" android:fontFamily="sans-serif-medium" android:includeFontPadding="false" android:text="—" android:textColor="#D8EEF9" android:textSize="17sp" />
            </LinearLayout>
        </LinearLayout>
    </LinearLayout>
</LinearLayout>
'''

HOUR_PANEL = '''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#E80A2030" />
    <corners android:radius="20dp" />
    <stroke android:width="1dp" android:color="#35556B" />
</shape>
'''

DAY_PANEL = '''<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#D90A2030" />
    <corners android:radius="18dp" />
    <stroke android:width="1dp" android:color="#2D4A5E" />
</shape>
'''

WIDGET_INFO = '''<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="320dp"
    android:minHeight="300dp"
    android:minResizeWidth="280dp"
    android:minResizeHeight="260dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_barisnow"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:targetCellWidth="5"
    android:targetCellHeight="5" />
'''

write('android-app/app/src/main/res/layout/widget_barisnow.xml', MAIN_LAYOUT)
write('android-app/app/src/main/res/drawable/widget_hour_panel.xml', HOUR_PANEL)
write('android-app/app/src/main/res/drawable/widget_day_panel.xml', DAY_PANEL)
write('android-app/app/src/main/res/xml/barisnow_widget_info.xml', WIDGET_INFO)

# Presentación en formato natural para reducir masa visual y evitar truncados agresivos.
provider = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWidgetProvider.java'
s = read(provider)
s = s.replace('views.setTextViewText(stateId, hour.state);', 'views.setTextViewText(stateId, displayState(hour.state));')
s = s.replace('views.setTextViewText(stateId, day.state);', 'views.setTextViewText(stateId, displayState(day.state));')
if 'protected static String displayState(String state)' not in s:
    marker = '    private static boolean isRainState(String state) {'
    helper = '''    protected static String displayState(String state) {
        if (state == null || state.isEmpty()) return "—";
        String lower = state.toLowerCase(new Locale("es", "AR"));
        return lower.substring(0, 1).toUpperCase(new Locale("es", "AR")) + lower.substring(1);
    }

'''
    if marker not in s:
        raise RuntimeError('No se encontró punto de inserción para displayState')
    s = s.replace(marker, helper + marker, 1)
write(provider, s)

# Versión 1.4.16. La operación es idempotente una vez publicada.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+27\b', 'versionCode 28', s, count=1)
s = s.replace("versionName '1.4.15'", "versionName '1.4.16'")
s = re.sub(r'// BariSnow 1\.4\.15[^\n]*',
           '// BariSnow 1.4.16 implementa el widget premium 5x5 aprobado.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.16', s)
write(client, s)

print('Diseño premium 5x5 BariSnow 1.4.16 aplicado.')
