# BariSnow · fenómenos de precipitación

BariSnow 1.4.1 amplía la clasificación nival existente a una clasificación unificada de precipitación.

## Categorías líquidas

- SIN PRECIPITACIÓN
- LLOVIZNA
- LLOVIZNA CONGELANTE
- LLUVIA DÉBIL
- LLUVIA MODERADA
- LLUVIA FUERTE
- LLUVIA CONGELANTE
- CHAPARRÓN DE LLUVIA
- CHAPARRÓN FUERTE
- TORMENTA

## Categorías nivales y mixtas conservadas

- COPOS AISLADOS
- CHAPARRÓN DE NIEVE
- NIEVE HÚMEDA
- LLUVIA Y NIEVE
- NIEVA
- NEVADA ACUMULABLE

## Criterios

- Los códigos WMO de cada modelo se usan para distinguir llovizna, lluvia, lluvia congelante, chaparrones y tormentas.
- La tasa líquida horaria se usa para separar intensidades cuando el código no aporta suficiente detalle.
- `rain`, `showers` y `precipitation` se mantienen separados para no confundir lluvia continua con chaparrones.
- La clasificación web conserva las cuatro fuentes y ponderaciones BariSnow existentes.
- La incertidumbre se comunica separadamente mediante acuerdo multimodelo.
- La nieve y la mezcla tienen prioridad cuando la señal nival supera los umbrales BariSnow.
- El estado actual usa los campos `current` de alta frecuencia y los códigos meteorológicos disponibles.

La capa de lluvia no elimina ni debilita el clasificador de nieve existente: lo complementa para que BariSnow describa el fenómeno dominante completo.
