# Viaje Bahía Blanca — Android

App Android que carga la versión viva del planificador publicado en GitHub Pages:

https://agent75-ai.github.io/pronostico_nieve_Barilo/viaje-bahia-blanca/

## Sincronización con la web

- La app carga el mismo sitio publicado, por lo que las mejoras de interfaz y lógica web aparecen en Android sin publicar una nueva APK.
- Los enlaces compartidos del planificador (`#b=...`) se pueden abrir dentro de la app.
- La carga de capturas para OCR usa el selector de imágenes de Android.
- Los enlaces externos, como Google Maps y OpenStreetMap, se abren con el sistema Android.

El planificador actual guarda el estado en `localStorage`. Eso mantiene el estado dentro de la app, pero un navegador de escritorio no comparte automáticamente ese almacenamiento. Para pasar un presupuesto entre dispositivos se puede usar el botón Compartir. La sincronización cloud automática entre PC y teléfono requiere configurar un backend autenticado como Firebase o Supabase.

## Compilación

Configuración actual:
- package: `com.agent75.viajebahiablanca`
- minSdk: 24
- targetSdk: 36
- compileSdk: 36
- Android Gradle Plugin: 9.3.0
- Gradle: 9.5.0

El workflow `.github/workflows/viaje-bahia-blanca-android.yml` compila automáticamente un APK debug y lo publica como artifact de GitHub Actions.
