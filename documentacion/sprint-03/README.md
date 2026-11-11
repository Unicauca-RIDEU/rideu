# Sprint 3 — Publicar trayecto, historial y correcciones

**Fechas:** 6 nov – 19 nov de 2026.

## Alcance del sprint

| Épica | Historia | Ruta | Estado |
| --- | --- | --- | --- |
| E02 | **HU04 · Publicar trayecto** | `/trayectos/publicar` | Evaluada: sus 5 criterios tienen pruebas unitarias y casos funcionales ejecutados, con evidencia. Se agregó el criterio 6 (trayecto duplicado). |
| E04 | **HU09 · Consultar historial de trayectos y reservas** | `/historial` | Trayectos publicados: hecho y probado. Reservas: en el Sprint 4 con HU07. Estado «Cancelado»: con HU05. |
| E01, E02 | **Correcciones y mejoras de HU01, HU02, HU03 y HU04** | `/registro/verificacion`, `/panel`, `/perfil/vehiculo`, `/trayectos/publicar` | Hechas (este documento). |

## Defectos corregidos (primera ronda)

Los defectos se encontraron en la auditoría del 9 de noviembre de 2026, sobre el código de `develop`.

| Defecto | Caso | Historia | Gravedad | Cómo se reproduce | Resultado esperado | Resultado real | Corrección |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | CU-21 | HU03 | Alta | Con una cuenta «Habilitado», abrir `/perfil/vehiculo` e intentar guardar de nuevo. | El conductor puede actualizar su vehículo y renovar su licencia. | El botón «Guardar vehículo» estaba deshabilitado y `POST /api/vehiculos` respondía 403. Con la licencia vencida no había forma de volver a publicar. | La cuenta «Habilitado» actualiza su vehículo y su licencia (HTTP 200). |
| D2 | CU-22 | HU03 | Media | Registrar el vehículo con la placa `abc123`. | La placa se guarda con un único formato. | Se guardaba `abc123`; la restricción de placa única no reconocía `ABC 123` como la misma placa. | La placa se guarda siempre como `ABC 123`. |
| D3 | CU-20 | HU01 | Media | Verificar la cuenta, registrar el vehículo y abrir otra vez el enlace de verificación. | «Este enlace de verificación ya fue usado.» | «El enlace de verificación expiró.» | Todo estado distinto de «Sin verificar» se informa como enlace usado. |
| D4 | CU-23 | HU03 | Media | Registrar, entre las 19:00 y las 23:59 de Colombia, una licencia que vence ese mismo día, con el servidor en UTC. | La licencia se acepta: vence hoy en Colombia. | «La licencia no está vigente», porque se usaba la fecha del servidor. | La vigencia se compara con la fecha de Colombia. |

Ramas: `bugfix/E01-HU01-enlace-verificacion-usado` (D3) y `bugfix/E02-HU03-actualizar-vehiculo-licencia` (D1, D2 y D4), integradas en `develop`.

## Pruebas unitarias de la primera ronda

Cada defecto tuvo tres momentos: la prueba se escribió y se ejecutó contra el código sin corregir, se volvió a ejecutar tras el ajuste y al final se ejecutó la suite completa.

| Momento | Resultado | Evidencia |
| --- | --- | --- |
| 1. Ejecución inicial | 8 pruebas fallaron | `evidencias/casos-ajuste/sprint-03/CU-20` … `CU-23` (`error-CUNN.png`) |
| 2. Después del ajuste | Las 8 pasan | `evidencias/casos-ajuste/sprint-03/CU-20` … `CU-23` (`solved-CUNN.png`) |
| 3. Ejecución final de toda la suite | 236 de 236 pasan · cobertura de líneas 97,52 % | Reemplazada por la ejecución final de la segunda ronda (254 pruebas) |

Porcentaje de pruebas fallidas en la ejecución inicial, medido sobre lo ejecutado:

- Sobre las 10 pruebas nuevas del sprint: 8 fallaron (**80 %**).
- Sobre la suite completa en ese momento (235 pruebas): 8 fallaron (**3,4 %**).

Ningún fallo fue inducido: las pruebas fallaron porque el defecto existía en el código.

Las capturas `error-CUNN.png` y `solved-CUNN.png` son fotografías de una terminal. Se tomaron el 10 de noviembre de 2026 volviendo a ejecutar cada prueba sobre el commit anterior a la corrección y sobre el commit corregido. Junto a ellas se conserva, como `.txt`, la salida de la ejecución original.

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

## Pruebas funcionales de la primera ronda

Se ejecutaron en Chromium contra la aplicación real (frontend, backend y PostgreSQL), una vez sobre la versión anterior a las correcciones (`b435f59`) y otra sobre `develop` corregido. Fecha de ejecución: 9 de noviembre de 2026.

**Precondiciones:** base de datos recién migrada; cuenta `laura.gomez@unicauca.edu.co` registrada y verificada; sesión iniciada desde `/login`.

| Caso | Historia · criterio | Pasos | Datos | Resultado esperado | Obtenido antes | Obtenido después | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RU-E002-HU03-CP05 | HU03 · CA-HU03-01 | 1. Abrir `/perfil/vehiculo`. 2. Diligenciar el formulario. 3. «Guardar vehículo». | Placa `abc123`, Mazda 3 · 2020, Rojo, 4 pasajeros, B1, vence 15/01/2027 | El perfil muestra «Habilitado». | «Habilitado» | «Habilitado» | Pasó |
| RU-E002-HU03-CP06 | HU03 · CA-HU03-01 | 1. Volver a abrir `/perfil/vehiculo` con la cuenta «Habilitado». 2. Diligenciar con la licencia renovada. 3. «Guardar vehículo». | Placa `ABC 123`, vence 20/06/2031 | Se actualizan los datos y la cuenta sigue «Habilitado». | Botón deshabilitado; no se envía nada; la licencia sigue venciendo el 2027-01-15 | HTTP 200, «Vehículo y licencia actualizados.»; la licencia vence el 2031-06-20 | Pasó (antes: Falló) |
| RU-E002-HU03-CP07 | HU03 · CA-HU03-03 | Consultar la placa guardada en la base de datos. | — | `ABC 123` | `abc123` | `ABC 123` (leída tras el paso anterior, en el que se escribió `ABC 123`; la conversión de `abc123` la cubren UT-144 a UT-146) | Pasó (antes: Falló) |
| RU-E001-HU01-CP15 | HU01 · CA-HU01-12 | Abrir de nuevo el enlace de verificación con la cuenta «Habilitado». | Token del registro | «Este enlace de verificación ya fue usado.» | «El enlace de verificación expiró.» | «Este enlace de verificación ya fue usado.» | Pasó (antes: Falló) |

Evidencia: capturas de antes y después de la corrección en cada caso del Word [`RideU_TEST_TestCases_Sprint03_v1.1.docx`](../pruebas-funcionales/sprint-03/RideU_TEST_TestCases_Sprint03_v1.1.docx); la salida del navegador y la consulta a la base de datos están en su Anexo A (A.1 y A.2).

D4 no tiene caso funcional: depende de la hora del servidor y solo se comprobó con pruebas unitarias.

Estos casos todavía no están en el registro de casos de prueba (`documentacion/pruebas-funcionales`); los debe incorporar el tester.

## Evaluación de HU04 · Publicar trayecto

El código de HU04 llegó a `develop` en el Sprint 2 como base técnica de HU06, sin casos funcionales ni evidencias. En este sprint se evaluó contra sus criterios.

**Pruebas unitarias.** 80 pruebas de HU04 (validación, modelo, rutas y sedes) quedaron registradas en el Excel como UT-153 a UT-232. En su primera ejecución registrada (9 de noviembre de 2026) pasaron todas: 0 % de fallos. No hay registro de cómo se ejecutaron cuando se escribieron en el Sprint 2.

**Pruebas funcionales.** Ejecutadas en Chromium contra la aplicación real; la ejecución final, con el código ya revisado, es del 10 de noviembre de 2026.

Precondiciones: base de datos recién migrada; `laura.gomez@unicauca.edu.co` «Habilitado» con un vehículo de 4 pasajeros; `carlos.mera@unicauca.edu.co` «Verificada» sin vehículo; sesión iniciada desde `/login`.

| Caso | Criterio | Pasos | Datos | Resultado esperado | Resultado obtenido | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RU-E002-HU04-CP01 | CA-HU04-01 Publicación válida | Abrir `/trayectos/publicar`, diligenciar y «Publicar trayecto». | Bello Horizonte → sede 1, 2026-11-20, 07:00, 3 cupos, 2500 COP | Crea el trayecto y lo muestra como disponible. | «Trayecto publicado. Ya está disponible para los pasajeros.», tarjeta «Disponible»; 1 fila en la base; aparece en la búsqueda de HU06. | Pasó | `HU04-CP01-publicacion-valida.png` |
| RU-E002-HU04-CP02 | CA-HU04-02 Campos vacíos | Dejar el formulario vacío y «Publicar trayecto». | — | Señala los campos faltantes y no publica. | «Completa los campos obligatorios.» y cada campo marcado. | Pasó | `HU04-CP02-campos-vacios.png` |
| RU-E002-HU04-CP03 | CA-HU04-03 Cupos en cero o negativos | Publicar con cupos 0 y con cupos −1. | cupos 0; cupos −1 | Rechaza con mensaje de validación. | «Ingresa al menos 1 cupo.» en ambos intentos. | Pasó | `HU04-CP03a-cupos-cero.png`, `HU04-CP03b-cupos-negativos.png` |
| RU-E002-HU04-CP04 | CA-HU04-04 Cupos sobre la capacidad | Publicar con más cupos que la capacidad. | cupos 5, capacidad 4 | Rechaza e informa la capacidad máxima. | «La capacidad máxima es 4.» | Pasó | `HU04-CP04-cupos-sobre-capacidad.png` |
| RU-E002-HU04-CP05 | CA-HU04-05 Conductor no habilitado | Con la cuenta sin vehículo, abrir `/trayectos/publicar`. | — | Impide publicar y dirige a `/perfil/vehiculo`. | «Conductor no habilitado. No puedes publicar trayectos.», formulario bloqueado y botón «Ir a registrar vehículo». | Pasó | `HU04-CP05-conductor-no-habilitado.png` |
| RU-E002-HU04-CP06 | CA-HU04-06 Trayecto duplicado | Publicar otra vez el mismo trayecto. | Mismos datos de CP01 | Rechaza el duplicado. | «Ya tienes un trayecto publicado para esa fecha y hora.»; sigue habiendo 1 fila. | Pasó | `HU04-CP06-trayecto-duplicado.png` |

Evidencia: capturas en cada caso del Word [`RideU_TEST_TestCases_Sprint03_v1.1.docx`](../pruebas-funcionales/sprint-03/RideU_TEST_TestCases_Sprint03_v1.1.docx); la salida del navegador y la consulta a la base de datos están en su Anexo A (A.3).

## Mejoras de robustez (segunda ronda)

No incumplían ningún criterio, pero debilitaban el proyecto. Cada una tuvo prueba inicial fallida, ajuste y ejecución final.

| Caso | Historia | Qué se hizo | Criterio |
| --- | --- | --- | --- |
| CU-24 | HU03 | Textos oficiales: «La licencia de conducción no está vigente.», «Este campo es obligatorio.» y «La placa debe tener tres letras y tres números.», en la API y en la pantalla. | CA-HU03-02, CA-HU03-03 |
| CU-25 | HU03 | La capacidad del vehículo no puede bajar de los cupos de un trayecto publicado que aún no ha salido (409). | CA-HU03-05 (nuevo) |
| CU-26 | HU03 | `GET /api/vehiculos` y formulario precargado con los datos actuales al actualizar. | CA-HU03-04 (nuevo) |
| — | HU03 | Migración `007_normalizar_placas.sql`: pasa al formato `ABC 123` las placas guardadas antes; no borra ni fusiona filas. | CA-HU03-03 |
| CU-27 | HU04 | Un conductor no puede publicar dos trayectos en la misma fecha y hora (409). | CA-HU04-06 (nuevo) |
| CU-28 | HU02 | `POST /api/auth/logout`, botón «Cerrar sesión» en el panel y borrado de las sesiones vencidas al iniciar sesión. | CA-HU02-07 (nuevo) |
| CU-29 | — | Las rutas inexistentes de `/api` responden 404 en JSON. | Sin criterio de historia |

Ramas: `bugfix/E02-HU03-mensajes-y-datos-del-vehiculo`, `bugfix/E02-HU04-trayecto-duplicado` y `bugfix/E01-HU02-cierre-de-sesion`, integradas en `develop`.

### Pruebas unitarias de la segunda ronda

| Momento | Resultado | Evidencia |
| --- | --- | --- |
| 1. Ejecución inicial | 27 pruebas fallaron (18 en HU03, 3 en HU04, 6 en HU02) | `evidencias/casos-ajuste/sprint-03/CU-24` … `CU-29` (`error-CUNN.png`) |
| 2. Después del ajuste | Las 27 pasan | `evidencias/casos-ajuste/sprint-03/CU-24` … `CU-29` (`solved-CUNN.png`) |
| 3. Ejecución final de toda la suite | 254 de 254 pasan · cobertura de líneas 97,70 % | `evidencias/ss/sprint-03/ejecucion-final-cobertura.txt` |

Porcentaje real de fallos iniciales de esta ronda: 27 de las 251 pruebas de la suite (**10,8 %**). De las 27, 15 son pruebas nuevas y 12 son pruebas existentes cuyo resultado esperado cambió (textos oficiales y orden de las consultas). Sumando las dos rondas del sprint: 35 fallos iniciales sobre 251 pruebas (**13,9 %**). No se indujo ningún fallo.

Las pruebas nuevas están en el Excel como UT-233 a UT-248; las tres últimas se añadieron tras la revisión independiente y pasaron desde su primera ejecución. Dos pruebas de `GET /api/vehiculos` comparten título con pruebas ya registradas y no tienen fila propia.

### Pruebas funcionales de la segunda ronda

Misma ejecución y precondiciones que la evaluación de HU04.

| Caso | Historia · criterio | Pasos | Resultado esperado | Resultado obtenido | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- | --- |
| RU-E002-HU03-CP02 (repetición) | HU03 · CA-HU03-02 | Registrar con licencia vencida el 15/01/2020. | «La licencia de conducción no está vigente.» y estado «No habilitado». | El mismo texto; estado «No habilitado». | Pasó (antes: Falló) | `HU03-CP02-licencia-vencida.png` |
| RU-E002-HU03-CP03 (repetición) | HU03 · CA-HU03-03 | Guardar el formulario vacío. | «Este campo es obligatorio.» en cada campo y «Completa los campos obligatorios.» | Los dos textos, en los 7 campos. | Pasó (antes: Falló) | `HU03-CP03-campos-vacios.png` |
| RU-E002-HU03-CP04 (repetición) | HU03 · CA-HU03-03 | Guardar con la placa `ABC 12`. | «La placa debe tener tres letras y tres números.» | El mismo texto. | Pasó (antes: Falló) | `HU03-CP04-placa-invalida.png` |
| RU-E002-HU03-CP08 | HU03 · CA-HU03-04 | Abrir `/perfil/vehiculo` con la cuenta «Habilitado». | El formulario muestra los datos actuales. | Placa `ABC 123`, Mazda, 3 · 2020, Rojo, 4, B1, 15 / 01 / 2027. | Pasó | `HU03-CP08-datos-precargados.png` |
| RU-E002-HU03-CP09 | HU03 · CA-HU03-05 | Con un trayecto publicado de 3 cupos, bajar la capacidad a 2 y guardar. | Rechaza el cambio e indica los cupos publicados. | «Tienes un trayecto publicado con 3 cupos. La capacidad del vehículo no puede ser menor.»; la capacidad sigue en 4. | Pasó | `HU03-CP09-capacidad-menor-que-cupos.png` |
| RU-E001-HU02-CP07 | HU02 · CA-HU02-07 | En `/panel`, «Cerrar sesión»; después abrir `/panel`. | Va a `/login` y `/panel` vuelve a exigir sesión. | Redirige a `/login` las dos veces; 0 sesiones del usuario en la base. | Pasó | `HU02-CP07-cierre-de-sesion.png` |
| Regresión HU06 | HU06 · CA-HU06-01 | Buscar sede 1, 2026-11-20, desde las 06:00. | Aparece el trayecto publicado. | 1 trayecto: 07:00, Bello Horizonte, 3 cupos. | Pasó | `navegador.txt` |
| Ruta inexistente | — | `GET /api/ruta-inexistente`. | 404 en JSON. | 404, `application/json`, «La ruta solicitada no existe.» | Pasó | `navegador.txt` |
| Migración 007 | HU03 · CA-HU03-03 | Dejar una placa como `abc123` y ejecutar `npm run db:migrate`. | La placa queda `ABC 123`. | `ABC 123`. | Pasó | `base-de-datos.txt` |
| Sesiones vencidas | HU02 | Vencer la sesión en la base e iniciar sesión. | La sesión vencida se borra. | Queda 1 sesión, 0 vencidas. | Pasó | `base-de-datos.txt` |

Los tres casos de HU03 que estaban en «Falló» en el registro del tester (CP02 a CP04) pasan con los textos oficiales. Falta que el tester los repita y actualice su registro.

## Revisión independiente

**Primera ronda (D1 a D4).** Veredicto: aprobado con observaciones, sin hallazgos críticos ni altos. Las observaciones quedaron atendidas en el sprint:

| Observación | Cómo se atendió |
| --- | --- |
| La pantalla no avisaba que la actualización se había aplicado | Muestra «Vehículo y licencia actualizados.» |
| El aviso de error no se limpiaba al escribir | Corregido |
| Las pruebas del modelo no comprobaban el usuario de los `UPDATE` | Se comprueban los parámetros |
| Faltaba la prueba de placa duplicada al actualizar | UT-152 |
| Formulario vacío al actualizar | CU-26: datos precargados |
| Capacidad por debajo de los cupos publicados | CU-25: se rechaza con 409 |
| Placas antiguas sin formato | Migración 007 |

**Segunda ronda (CU-24 a CU-29).** Veredicto: aprobado con observaciones, sin hallazgos críticos ni altos. El revisor ejecutó la suite completa; el SQL y la interfaz los revisó por lectura.

| Observación | Gravedad | Estado |
| --- | --- | --- |
| La precarga del formulario podía sobrescribir lo que la persona ya había escrito y no avisaba si fallaba | Media | Atendida: solo precarga si el formulario está vacío, avisa si falla y lleva a `/login` si la sesión venció |
| Dos publicaciones simultáneas del mismo conductor pueden saltarse la comprobación de trayecto duplicado | Media | Pendiente: requiere un índice único en la base de datos, y antes hay que revisar que no existan duplicados |
| Si fallaba el borrado de sesiones vencidas, fallaba el inicio de sesión | Baja | Atendida: el fallo se registra y la sesión se crea |
| Faltaban pruebas de capacidad igual a los cupos y sin trayectos | Baja | Atendida: UT-246 y UT-247 |
| La migración 007 no toca placas con espacios sobrantes ni lista los pares duplicados | Baja | Pendiente: consulta de diagnóstico para el responsable |
| El cierre de sesión no muestra estado de espera y solo está en el panel | Baja | Pendiente |
| Otras pruebas sugeridas (orden del borrado de sesiones, 404 con otros métodos) | Baja | Pendiente |

## Pendientes conocidos

- Los casos funcionales del sprint están en `documentacion/pruebas-funcionales/sprint-03`. Se ejecutaron de forma automatizada en Chromium; falta la firma del tester.
- La comprobación de trayecto duplicado se hace en la API; no hay una restricción única en la base de datos, así que dos peticiones simultáneas podrían crear el duplicado.
- No hay pruebas automatizadas del frontend; la interfaz se verifica con las pruebas funcionales.
- El cierre de sesión cierra solo la sesión actual, no las abiertas en otros dispositivos.

## HU09 · Consultar historial de trayectos y reservas

### Alcance aprobado

El responsable aprobó el 10 de noviembre de 2026:

1. Entregar en el Sprint 3 los trayectos publicados por el usuario y completar las reservas en el Sprint 4, con HU07.
2. Un trayecto cuya fecha y hora de salida ya pasaron se muestra como «Completado»; el resto, como «Pendiente».
3. Agregar al backlog la dependencia de HU09 con HU07 y HU05 (Backlog v1.6).

El estado «Cancelado» se mostrará cuando exista HU05.

### Implementación

| Capa | Cambio |
| --- | --- |
| Modelo | `listarTrayectosDeConductor` en `models/trayecto.js`: trayectos del usuario, del más reciente al más antiguo, con el estado calculado en hora de Colombia. |
| API | `GET /api/historial` (con sesión): `{ mensaje, total, trayectos, reservas }`. `reservas` va vacío hasta HU07. |
| Frontend | Pantalla `/historial` (ruta protegida) y acceso desde el panel. |
| Base de datos | Sin cambios. |

Rama: `feature/E04-HU09-historial`, integrada en `develop`.

### Pruebas unitarias

| Momento | Resultado | Evidencia |
| --- | --- | --- |
| 1. Ejecución inicial | Las 8 pruebas nuevas fallaron: la historia aún no estaba implementada | `evidencias/casos-ajuste/sprint-03/CU-30/error-CU30.png` |
| 2. Después de implementar | Las 8 pasan | `evidencias/casos-ajuste/sprint-03/CU-30/solved-CU30.png` |
| 3. Ejecución final de toda la suite | 262 de 262 pasan · cobertura de líneas 97,76 % | `evidencias/ss/sprint-03/ejecucion-final-cobertura.txt` |

Fallos iniciales de HU09: 8 de las 262 pruebas ejecutadas (**3,1 %**). En todo el Sprint 3: 43 fallos iniciales sobre 262 pruebas (**16,4 %**). Las pruebas se escribieron antes que el código; ningún fallo fue inducido.

Las pruebas están en el Excel como UT-249 a UT-256.

### Pruebas funcionales

Ejecutadas en Chromium contra la aplicación real el 10 de noviembre de 2026. El detalle de cada caso está en `documentacion/pruebas-funcionales/sprint-03`.

| Caso | Criterio | Resultado esperado | Resultado obtenido | Estado | Evidencia |
| --- | --- | --- | --- | --- | --- |
| RU-E004-HU09-CP01 | CA-HU09-01 Historial con actividad | Lista de la actividad con su estado. | 2 trayectos: 2026-11-20 07:00 «Pendiente» y 2026-11-05 06:30 «Completado», en ese orden; «Aún no tienes reservas.» | Pasó | `HU09-CP01-historial-con-actividad.png` |
| RU-E004-HU09-CP02 | CA-HU09-02 Historial sin actividad | Mensaje de que aún no hay registros. | «Aún no tienes registros en tu historial.» | Pasó | `HU09-CP02-historial-sin-actividad.png` |
| RU-E004-HU09-CP03 | CA-HU09-01 Sin sesión | Redirige a `/login`. | Redirigió a `/login`. | Pasó | `HU09-CP03-sin-sesion.png` |
| RU-E004-HU09-CP04 | CA-HU09-01 Aislamiento entre usuarios | Un usuario no ve los trayectos de otro. | 0 trayectos visibles para el usuario sin actividad. | Pasó | `HU09-CP02-historial-sin-actividad.png` |

Evidencia: capturas en cada caso del Word [`RideU_TEST_TestCases_Sprint03_v1.1.docx`](../pruebas-funcionales/sprint-03/RideU_TEST_TestCases_Sprint03_v1.1.docx); la salida del navegador y la consulta a la base de datos están en su Anexo A (A.4). El trayecto pasado se preparó cambiando su fecha en la base de datos, porque la aplicación no permite publicar en el pasado.

### Revisión independiente

Veredicto: aprobado con observaciones, sin hallazgos críticos ni altos.

| Observación | Gravedad | Estado |
| --- | --- | --- |
| La regla «Completado / Pendiente» y el orden solo se comprueban como texto SQL en las unitarias | Media | Atendida con las pruebas funcionales contra PostgreSQL real (CP01 y CP04) |
| Una respuesta sin lista de trayectos dejaba la pantalla en blanco | Baja | Atendida: se muestra el aviso de error |
| El aviso de error decía «Inténtalo de nuevo» sin ofrecer cómo | Baja | Atendida: indica recargar la página |
| Con HU05, un trayecto cancelado y pasado saldría «Completado» | Baja | Anotado en el modelo para HU05 |
| La fecha se muestra como `2026-11-20`, distinto de la búsqueda | Baja | Pendiente |
| Faltan pruebas del controlador en archivo propio y con token vencido | Baja | Pendiente |

### Pendiente de HU09

- Reservas del usuario en el historial (Sprint 4, con HU07).
- Estado «Cancelado» (Sprint 5, con HU05).
- Caso funcional de un trayecto del mismo día, antes y después de la hora actual.
