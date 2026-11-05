# Sprint 2 — Vehículo del conductor y búsqueda de trayectos

## Alcance del sprint

| Épica | Historia | Ruta | Criterios de aceptación |
| --- | --- | --- | --- |
| E02 | **HU03 · Registrar vehículo y licencia** | `/perfil/vehiculo` | 1. Guardar vehículo y licencia deja la cuenta en «Habilitado».<br>2. Licencia vencida → «La licencia no está vigente» y estado «No habilitado».<br>3. Campos vacíos o placa inválida → se señalan y no se registra. |
| E03 | **HU06 · Buscar trayectos disponibles** | `/trayectos/buscar` | 1. Trayectos activos coincidentes por sede, fecha y hora, ordenados por hora de salida.<br>2. Sin coincidencias → «No hay resultados disponibles».<br>3. Se excluyen los trayectos sin cupos disponibles. |

## Nota sobre HU04 (Publicar trayecto)

**E02-HU04 · Publicar trayecto no pertenece a este sprint.** Está implementada en esta rama solo como
**base técnica de HU06**: la búsqueda necesita trayectos publicados y reutiliza piezas de HU04.

| Pieza de HU04 | Por qué está en el sprint 2 |
| --- | --- |
| Tablas `sedes` y `trayectos` (`backend/sql/004_sedes.sql`, `005_trayectos.sql`) | La búsqueda consulta esas tablas y la migración de HU06 (`006_cupos_disponibles.sql`) modifica `trayectos`. |
| `backend/src/models/sede.js` | Selector de sedes (`GET /api/sedes`) y validación de la sede de destino. |
| `backend/src/models/trayecto.js` y `backend/src/validation/trayecto.js` | La consulta y los filtros de búsqueda viven en esos módulos. |
| `POST /api/trayectos` y `/trayectos/publicar` | Es la forma de crear los trayectos que luego se buscan. |
| Login para cuentas «Habilitado» (`authController.js`) | Necesario para HU03: sin él, un conductor que registra su vehículo no puede volver a iniciar sesión. |

La dependencia también aparece en el backlog (hoja «Trazabilidad»): HU06 depende de HU05 y HU05 de HU04.
La evaluación de HU04 (criterios, casos de prueba y pruebas unitarias) corresponde a su propio sprint.

## Base de datos

| Migración | Historia | Cambio |
| --- | --- | --- |
| `002_vehiculos_licencias.sql` | HU03 | Tablas `vehiculos` y `licencias` |
| `003_estado_habilitado.sql` | HU03 | Estado «Habilitado» en `usuarios` |
| `006_cupos_disponibles.sql` | HU06 | Columna `trayectos.cupos_disponibles` (inicia igual a `cupos`; entre 0 y `cupos`) e índice de búsqueda |

## API

| Método y ruta | Historia | Descripción |
| --- | --- | --- |
| `POST /api/vehiculos` | HU03 | Registra vehículo y licencia del usuario de la sesión |
| `GET /api/trayectos?sedeDestinoId=&fecha=&horaDesde=` | HU06 | Trayectos activos con cupos, ordenados por hora de salida |
| `GET /api/sedes` | HU06 | Sedes de destino para el filtro |

Todas exigen `Authorization: Bearer <token>`.

## Pruebas unitarias del sprint

- **76 pruebas** del sprint (HU03: 41 · HU06: 35) dentro de una suite de **227 pruebas** en verde.
- **6 casos de ajuste**, uno por criterio de aceptación: **CU-14 a CU-16** (HU03) y **CU-17 a CU-19** (HU06).
  En la primera ejecución fallaron 8 pruebas; tras la corrección todas pasan.
- Evidencia: [`evidencias/Pruebas_Unitarias_RideU.xlsx`](../../evidencias/Pruebas_Unitarias_RideU.xlsx)
  (sección «Sprint 2» de cada hoja) y [`evidencias/casos-ajuste/CU-14` … `CU-19`](../../evidencias/casos-ajuste/)
  con las capturas `error-CUxx.png` y `solved-CUxx.png`.

| Caso | HU · criterio | Falla controlada |
| --- | --- | --- |
| CU-14 | HU03 · 1 | La cuenta no pasaba a «Habilitado» al registrar el vehículo |
| CU-15 | HU03 · 2 | Se aceptaban licencias vencidas |
| CU-16 | HU03 · 3 | Se aceptaba la placa «ABC 12» |
| CU-17 | HU06 · 1 | Los resultados no se ordenaban por hora de salida |
| CU-18 | HU06 · 2 | Nunca se mostraba «No hay resultados disponibles» |
| CU-19 | HU06 · 3 | Aparecían trayectos sin cupos |

### Cómo ejecutarlas

```bash
cd backend
npm install
npm test
```

En Windows (PowerShell) el script `npm test` no funciona porque usa la sintaxis `NODE_OPTIONS=…` de Linux y Mac. Usar:

```powershell
cd backend
$env:NODE_OPTIONS="--experimental-vm-modules"
npx jest --runInBand
```
