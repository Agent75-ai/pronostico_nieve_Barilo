# Corrección día/noche de BariSnow web

La web debe distinguir la condición del cielo de la condición de iluminación.

- `DESPEJADO` sólo usa luna cuando la hora pronosticada es nocturna.
- Cielo despejado durante el día se presenta como `SOLEADO` con icono solar.
- `MAYORMENTE DESPEJADO` y `PARCIALMENTE NUBLADO` usan iconos diferentes según `is_day`.
- La corrección se aplica a +1/+2/+3 h, próximas 12 h, lectura simple, barrios y resumen diario.
- La clasificación de lluvia, nieve y mezcla conserva prioridad y no se altera.
- `is_day` y `cloud_cover` horarios se consultan para la ubicación seleccionada usando la misma zona horaria de BariSnow.
