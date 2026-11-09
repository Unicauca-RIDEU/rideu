# Sprint 3 — Publicar trayecto, historial y correcciones

**Fechas:** 6 nov – 19 nov de 2026.

## Alcance del sprint

| Épica | Historia | Ruta | Estado |
| --- | --- | --- | --- |
| E02 | **HU04 · Publicar trayecto** | `/trayectos/publicar` | Código base y pruebas unitarias en `develop` desde el Sprint 2. Pendiente: casos funcionales y evidencias de sus 5 criterios. |
| E04 | **HU09 · Consultar historial de trayectos y reservas** | `/historial` | Pendiente. |
| E01, E02 | **Correcciones de HU01 y HU03** | `/registro/verificacion`, `/perfil/vehiculo` | Hechas (este documento). |

## Defectos corregidos

Los defectos se encontraron en la auditoría del 9 de noviembre de 2026, sobre el código de `develop`.

| Defecto | Caso | Historia | Gravedad | Cómo se reproduce | Resultado esperado | Resultado real | Corrección |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | CU-21 | HU03 | Alta | Con una cuenta «Habilitado», abrir `/perfil/vehiculo` e intentar guardar de nuevo. | El conductor puede actualizar su vehículo y renovar su licencia. | El botón «Guardar vehículo» estaba deshabilitado y `POST /api/vehiculos` respondía 403. Con la licencia vencida no había forma de volver a publicar. | La cuenta «Habilitado» actualiza su vehículo y su licencia (HTTP 200). |
| D2 | CU-22 | HU03 | Media | Registrar el vehículo con la placa `abc123`. | La placa se guarda con un único formato. | Se guardaba `abc123`; la restricción de placa única no reconocía `ABC 123` como la misma placa. | La placa se guarda siempre como `ABC 123`. |
| D3 | CU-20 | HU01 | Media | Verificar la cuenta, registrar el vehículo y abrir otra vez el enlace de verificación. | «Este enlace de verificación ya fue usado.» | «El enlace de verificación expiró.» | Todo estado distinto de «Sin verificar» se informa como enlace usado. |
| D4 | CU-23 | HU03 | Media | Registrar, entre las 19:00 y las 23:59 de Colombia, una licencia que vence ese mismo día, con el servidor en UTC. | La licencia se acepta: vence hoy en Colombia. | «La licencia no está vigente», porque se usaba la fecha del servidor. | La vigencia se compara con la fecha de Colombia. |

Ramas: `bugfix/E01-HU01-enlace-verificacion-usado` (D3) y `bugfix/E02-HU03-actualizar-vehiculo-licencia` (D1, D2 y D4), integradas en `develop`.

## Pruebas unitarias

Cada defecto tuvo tres momentos: la prueba se escribió y se ejecutó contra el código sin corregir, se volvió a ejecutar tras el ajuste y al final se ejecutó la suite completa.

| Momento | Resultado | Evidencia |
| --- | --- | --- |
| 1. Ejecución inicial | 8 pruebas fallaron | `evidencias/casos-ajuste/CU-20` … `CU-23` (`error-CUNN.txt`) |
| 2. Después del ajuste | Las 8 pasan | `evidencias/casos-ajuste/CU-20` … `CU-23` (`solved-CUNN.txt`) |
| 3. Ejecución final de toda la suite | 236 de 236 pasan · cobertura de líneas 97,52 % | `evidencias/sprint-3/unitarias/ejecucion-final.txt` |

Porcentaje de pruebas fallidas en la ejecución inicial, medido sobre lo ejecutado:

- Sobre las 10 pruebas nuevas del sprint: 8 fallaron (**80 %**).
- Sobre la suite completa en ese momento (235 pruebas): 8 fallaron (**3,4 %**).

Ningún fallo fue inducido: las pruebas fallaron porque el defecto existía en el código.

| ID | Historia | Criterio | Datos de entrada | Resultado esperado | Resultado inicial | Estado final | Defecto | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UT-143 | HU01 | CA-HU01-12 | Token de una cuenta «Habilitado» | motivo `usado` | motivo `expirado` | Pasa | D3 | CU-20 |
| UT-144 | HU03 | CA-HU03-03 | placa `abc 123` | `ABC 123` | `abc 123` | Pasa | D2 | CU-22 |
| UT-145 | HU03 | CA-HU03-03 | placa `ABC123` | `ABC 123` | `ABC123` | Pasa | D2 | CU-22 |
| UT-146 | HU03 | CA-HU03-03 | placa `aBc  123` | `ABC 123` | `aBc 123` | Pasa | D2 | CU-22 |
| UT-147 | HU03 | CA-HU03-01 | Licencia que vence el 2030-03-09, a las 21:00 de ese día en Colombia | Se acepta | Se rechaza | Pasa | D4 | CU-23 |
| UT-148 | HU03 | CA-HU03-02 | Licencia que venció el 2030-03-08, mismo instante | Se rechaza | Se rechaza (pasó) | Pasa | — | — |
| UT-149 | HU03 | CA-HU03-01 | Cuenta «Habilitado» con vehículo y licencia | `UPDATE` de ambos y `COMMIT` | `ROLLBACK`, motivo `no_verificada` | Pasa | D1 | CU-21 |
| UT-150 | HU03 | CA-HU03-01 | Cuenta «Habilitado» sin vehículo ni licencia | Se crean ambos | `ROLLBACK`, motivo `no_verificada` | Pasa | D1 | CU-21 |
| UT-151 | HU03 | CA-HU03-01 | `POST /api/vehiculos` con actualización | HTTP 200 | HTTP 201 | Pasa | D1 | CU-21 |
| UT-152 | HU03 | CA-HU03-03 | Actualizar con la placa de otro vehículo | `ROLLBACK` y error de placa duplicada | Pasó (se añadió tras la revisión) | Pasa | — | — |

La prueba UT-104 («debería responder 403 para una cuenta en estado Habilitado») se retiró: describía el comportamiento que D1 corrige.

El registro completo está en [`evidencias/Pruebas_Unitarias_RideU.xlsx`](../../evidencias/Pruebas_Unitarias_RideU.xlsx), sección «Sprint 3» de cada hoja.

## Pruebas funcionales

Se ejecutaron en Chromium contra la aplicación real (frontend, backend y PostgreSQL), una vez sobre la versión anterior a las correcciones (`b435f59`) y otra sobre `develop` corregido. Fecha de ejecución: 9 de noviembre de 2026.

**Precondiciones:** base de datos recién migrada; cuenta `laura.gomez@unicauca.edu.co` registrada y verificada; sesión iniciada desde `/login`.

| Caso | Historia · criterio | Pasos | Datos | Resultado esperado | Obtenido antes | Obtenido después | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RU-E002-HU03-CP05 | HU03 · CA-HU03-01 | 1. Abrir `/perfil/vehiculo`. 2. Diligenciar el formulario. 3. «Guardar vehículo». | Placa `abc123`, Mazda 3 · 2020, Rojo, 4 pasajeros, B1, vence 15/01/2027 | El perfil muestra «Habilitado». | «Habilitado» | «Habilitado» | Pasó |
| RU-E002-HU03-CP06 | HU03 · CA-HU03-01 | 1. Volver a abrir `/perfil/vehiculo` con la cuenta «Habilitado». 2. Diligenciar con la licencia renovada. 3. «Guardar vehículo». | Placa `ABC 123`, vence 20/06/2031 | Se actualizan los datos y la cuenta sigue «Habilitado». | Botón deshabilitado; no se envía nada; la licencia sigue venciendo el 2027-01-15 | HTTP 200, «Vehículo y licencia actualizados.»; la licencia vence el 2031-06-20 | Pasó (antes: Falló) |
| RU-E002-HU03-CP07 | HU03 · CA-HU03-03 | Consultar la placa guardada en la base de datos. | — | `ABC 123` | `abc123` | `ABC 123` (leída tras el paso anterior, en el que se escribió `ABC 123`; la conversión de `abc123` la cubren UT-144 a UT-146) | Pasó (antes: Falló) |
| RU-E001-HU01-CP15 | HU01 · CA-HU01-12 | Abrir de nuevo el enlace de verificación con la cuenta «Habilitado». | Token del registro | «Este enlace de verificación ya fue usado.» | «El enlace de verificación expiró.» | «Este enlace de verificación ya fue usado.» | Pasó (antes: Falló) |

Evidencia: capturas del navegador, salida del navegador y consulta a la base de datos en [`evidencias/sprint-3/funcionales/antes`](../../evidencias/sprint-3/funcionales/antes/) y [`despues`](../../evidencias/sprint-3/funcionales/despues/).

D4 no tiene caso funcional: depende de la hora del servidor y solo se comprobó con pruebas unitarias.

Estos casos todavía no están en el registro de casos de prueba (`documentacion/TestCases`); los debe incorporar el tester.

## Revisión independiente

Se revisaron el código y las pruebas de las correcciones. Veredicto: **aprobado con observaciones**, sin hallazgos críticos ni altos.

Atendido en este sprint:

- La pantalla no avisaba que la actualización se había aplicado: ahora muestra «Vehículo y licencia actualizados.».
- El aviso de error no se limpiaba al escribir con la cuenta «Habilitado».
- Las pruebas del modelo no comprobaban que los `UPDATE` usan el usuario de la sesión.
- Faltaba la prueba de placa duplicada al actualizar (UT-152).

Pendiente de decisión:

| Observación | Detalle | Propuesta |
| --- | --- | --- |
| Formulario vacío al actualizar | Para renovar la licencia hay que volver a escribir todos los datos del vehículo. | Precargar los datos actuales del conductor. |
| Capacidad y trayectos publicados | Se puede bajar la capacidad del vehículo por debajo de los cupos de un trayecto ya publicado. | Rechazar el cambio o dejarlo documentado como regla aceptada. |
| Placas antiguas | Las placas guardadas antes de la corrección conservan su formato original. | Migración que las normalice, revisando antes posibles duplicados. |

## Otros pendientes conocidos

- Tres casos funcionales de HU03 siguen en «Falló» (RU-E002-HU03-CP02 a CP04): el texto de los mensajes no coincide con el esperado por el caso de prueba. Las historias no fijan un texto exacto; falta decidir cuál es el oficial.
- Se puede publicar dos veces el mismo trayecto idéntico; ningún criterio lo prohíbe.
- Las rutas inexistentes de `/api` responden HTML en lugar de JSON.
- No hay cierre de sesión ni limpieza de sesiones vencidas.
