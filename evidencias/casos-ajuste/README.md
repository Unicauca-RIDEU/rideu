# Casos de ajuste

Evidencia fotográfica de las pruebas unitarias que fallaron en su primera ejecución y de su resultado después de la corrección, separada por sprint.

| Carpeta | Casos | Historias |
| --- | --- | --- |
| [sprint-01](sprint-01/) | CU-01 a CU-13 | HU01, HU02 |
| [sprint-02](sprint-02/) | CU-14 a CU-19 | HU03, HU06 |
| [sprint-03](sprint-03/) | CU-20 a CU-30 | HU01 a HU04 (correcciones y mejoras), HU09 |

Cada carpeta `CU-NN` contiene:

- `error-CUNN.png`: captura de la terminal con la prueba fallando.
- `solved-CUNN.png`: captura de la terminal con la prueba pasando tras la corrección.

El detalle de cada caso (prueba, criterio, esperado, obtenido y corrección) está en [`Pruebas_Unitarias_RideU.xlsx`](../Pruebas_Unitarias_RideU.xlsx).
