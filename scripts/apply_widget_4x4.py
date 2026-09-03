from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


# El diseño visual premium lo aplica primero apply_widget_readability.py.
# Este parche fija el tamaño final aprobado como 4x4 sin alterar su composición.
info = 'android-app/app/src/main/res/xml/barisnow_widget_info.xml'
s = read(info)
s = re.sub(r'android:minWidth="[^"]+"', 'android:minWidth="280dp"', s, count=1)
s = re.sub(r'android:minHeight="[^"]+"', 'android:minHeight="300dp"', s, count=1)
s = re.sub(r'android:minResizeWidth="[^"]+"', 'android:minResizeWidth="260dp"', s, count=1)
s = re.sub(r'android:minResizeHeight="[^"]+"', 'android:minResizeHeight="260dp"', s, count=1)
s = re.sub(r'android:targetCellWidth="[^"]+"', 'android:targetCellWidth="4"', s, count=1)
s = re.sub(r'android:targetCellHeight="[^"]+"', 'android:targetCellHeight="4"', s, count=1)
write(info, s)

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+28\b', 'versionCode 29', s, count=1)
s = s.replace("versionName '1.4.16'", "versionName '1.4.17'")
s = re.sub(r'// BariSnow 1\.4\.16[^\n]*',
           '// BariSnow 1.4.17 implementa el widget premium aprobado en formato 4x4.', s, count=1)
write(gradle, s)

client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.17', s)
write(client, s)

print('Widget premium 4x4 BariSnow 1.4.17 aplicado.')
