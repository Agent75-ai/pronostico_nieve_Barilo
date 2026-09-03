from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


# El layout limpio/premium se genera primero con apply_widget_readability.py.
# Este parche únicamente fija su tamaño Android como 4x4 y actualiza la versión,
# sin comprimir tipografías, iconos, interlineados ni tarjetas diarias.
info = 'android-app/app/src/main/res/xml/barisnow_widget_info.xml'
s = read(info)
s = re.sub(r'android:minWidth="[^"]+"', 'android:minWidth="280dp"', s, count=1)
s = re.sub(r'android:minHeight="[^"]+"', 'android:minHeight="300dp"', s, count=1)
s = re.sub(r'android:minResizeWidth="[^"]+"', 'android:minResizeWidth="270dp"', s, count=1)
s = re.sub(r'android:minResizeHeight="[^"]+"', 'android:minResizeHeight="285dp"', s, count=1)
s = re.sub(r'android:targetCellWidth="[^"]+"', 'android:targetCellWidth="4"', s, count=1)
s = re.sub(r'android:targetCellHeight="[^"]+"', 'android:targetCellHeight="4"', s, count=1)
write(info, s)

# Nueva versión.
gradle = 'android-app/app/build.gradle'
s = read(gradle)
s = re.sub(r'versionCode\s+30\b', 'versionCode 31', s, count=1)
s = s.replace("versionName '1.4.18'", "versionName '1.4.19'")
s = re.sub(r'// BariSnow 1\.4\.18[^\n]*',
           '// BariSnow 1.4.19 restaura el widget limpio aprobado en formato 4x4.', s, count=1)
write(gradle, s)

# Identificación HTTP de la versión actual.
client = 'android-app/app/src/main/java/com/barisnow/app/BariSnowWeatherClient.java'
s = read(client)
s = re.sub(r'BariSnowAndroidWidget/[0-9.]+', 'BariSnowAndroidWidget/1.4.19', s)
# Dos intentos deben caber dentro de la ventana del motor nativo (7,5 s).
# El límite anterior de 4,2 s podía excederla al sumar endpoint + fallback.
s = s.replace('Math.min(requestedTimeoutMs, 4200)', 'Math.min(requestedTimeoutMs, 3400)')
s = s.replace('Thread.sleep(120L);', 'Thread.sleep(80L);')
write(client, s)

print('Widget limpio 4x4 BariSnow 1.4.19 aplicado.')
