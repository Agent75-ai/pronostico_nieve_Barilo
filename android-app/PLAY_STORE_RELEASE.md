# BariSnow 1.4.0 · preparación Google Play

## Estado técnico

- applicationId: `com.barisnow.app`
- versionName: `1.4.0`
- versionCode: `12`
- minSdk: `23`
- compileSdk: `36`
- targetSdk: `36`
- formato de publicación: Android App Bundle (`.aab`)
- Java: 17
- AGP: 8.11.1
- Gradle CI: 8.13

La APK de GitHub Pages sigue siendo una compilación debug para instalación manual. Para Google Play se debe usar el AAB `release` firmado con una clave de subida privada.

## Firma de subida

No guardar el archivo `.jks`, contraseñas ni claves privadas dentro de este repositorio público.

Para una publicación estable se recomienda:

1. crear una clave de subida dedicada a BariSnow;
2. conservar al menos dos copias offline seguras;
3. usar Google Play App Signing al crear la app en Play Console;
4. firmar cada AAB futuro con la misma clave de subida, salvo que Google autorice un cambio de upload key.

## Flujo de build

El workflow `.github/workflows/android-apk.yml` compila:

- `assembleDebug` para la APK de instalación directa;
- `bundleRelease` para producir el AAB base de Google Play.

El AAB generado por CI no incorpora secretos de firma. Debe firmarse fuera del repositorio o configurar una estrategia de secretos antes de automatizar el release.

## AdMob

BariSnow 1.4.0 deja `BuildConfig.ADS_ENABLED=false` y no muestra anuncios. No se debe activar publicidad hasta disponer de:

- App ID real de AdMob;
- ID de unidad publicitaria real;
- política de privacidad actualizada;
- declaración Data Safety revisada;
- consentimiento/UMP cuando corresponda.

Integración de referencia actual (agosto de 2026): Google Mobile Ads SDK `com.google.android.gms:play-services-ads:25.4.0`. Durante desarrollo deben utilizarse exclusivamente IDs de prueba de Google.

Los widgets Android deben permanecer sin publicidad.

## Play Console

Antes de producción:

- crear la app BariSnow en Play Console;
- activar Play App Signing;
- cargar el AAB firmado;
- completar ficha de tienda, clasificación de contenido, público objetivo, anuncios y Data Safety;
- usar como política de privacidad la página pública `privacy.html` del sitio BariSnow;
- si la cuenta personal de desarrollador fue creada después del 13/11/2023, completar la prueba cerrada exigida por Google Play antes de solicitar producción.

## Regla de producto

La versión de Google Play debe conservar una sola fuente meteorológica funcional de BariSnow. Los widgets no deben volver a introducir un clasificador distinto del utilizado por la web/app.
