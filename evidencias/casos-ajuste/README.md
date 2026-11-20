# Casos de ajuste

Evidencia fotográfica de las pruebas unitarias que fallaron en su primera ejecución y de su resultado después de la corrección, separada por sprint.

| Carpeta | Casos | Historias |
| --- | --- | --- |
| [sprint-01](sprint-01/) | CU-01 a CU-13 | HU01, HU02 |
| [sprint-02](sprint-02/) | CU-14 a CU-19 | HU03, HU06 |
| [sprint-03](sprint-03/) | CU-20 a CU-30 | HU01 a HU04 (correcciones y mejoras), HU09 |
| [sprint-04](sprint-04/) | CU-31 y CU-32 | HU07 (pruebas del historial que fallaron al integrar las reservas) |
| [sprint-05](sprint-05/) | CU-33 a CU-39 | HU05 (pruebas y suites existentes que fallaron al integrar la edición y cancelación de trayectos) |

En `sprint-05/`, `ejecucion-inicial-sprint-05.txt` es la salida de la primera ejecución y `ejecucion-ajuste-hu05.txt` la de después del ajuste. Las capturas `error-CUNN.png` y `ejecucion-inicial-sprint-05.png` se tomaron en un xterm al volver a ejecutar el código reconstruido tal como estaba en esa primera ejecución; su resultado coincide con `ejecucion-inicial-sprint-05.txt`. Las capturas `solved-CUNN.png` muestran el código corregido.

Cada carpeta `CU-NN` contiene:

- `error-CUNN.png`: captura de la terminal con la prueba fallando.
- `solved-CUNN.png`: captura de la terminal con la prueba pasando tras la corrección.

El detalle de cada caso (prueba, criterio, esperado, obtenido y corrección) está en [`Pruebas_Unitarias_RideU.xlsx`](../../documentacion/pruebas-unitarias/Pruebas_Unitarias_RideU.xlsx).
