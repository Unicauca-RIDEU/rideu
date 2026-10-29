# Dónde están las pruebas unitarias (RideU)

## Configuración y comandos

| Qué | Dónde |
|-----|--------|
| Dependencias Jest/Supertest | `backend/package.json` (`devDependencies` + scripts `test` / `test:coverage`) |
| Config Jest (ESM, coverage) | `backend/jest.config.js` |
| Ejecutar | `cd backend && npm test` |
| Cobertura | `cd backend && npm run test:coverage` |

## Suite nueva (Jest) — carpeta principal

Todo vive bajo **`backend/tests/`** (réplica de la estructura de `backend/src/`):

| Archivo de test | Funciones / módulos bajo prueba (producción) |
|-----------------|-----------------------------------------------|
| `backend/tests/validation/registro.test.js` | `validarRegistro()` en `backend/src/validation/registro.js` |
| `backend/tests/security/password.test.js` | `bcrypt.hash` / `bcrypt.compare` (bcryptjs) |
| `backend/tests/models/usuario.test.js` | `hashToken`, `crearTokenVerificacion`, `buscarPorCorreo`, `buscarCredencialesPorCorreo`, `crearUsuario`, `eliminarUsuario`, `verificarCuenta` en `backend/src/models/usuario.js` |
| `backend/tests/models/sesion.test.js` | `crearSesion`, `buscarUsuarioPorSesion` en `backend/src/models/sesion.js` |
| `backend/tests/services/correo.test.js` | `enlaceVerificacion`, `enviarCorreoVerificacion` en `backend/src/services/correo.js` |
| `backend/tests/controllers/authController.test.js` | `registrar`, `verificar`, `iniciarSesion`, `sesionActual` en `backend/src/controllers/authController.js` |
| `backend/tests/middleware/requiereSesion.test.js` | `requiereSesion` en `backend/src/middleware/requiereSesion.js` |
| `backend/tests/routes/authRoutes.test.js` | Rutas HTTP vía `createApp()` + `authRouter` (`backend/src/app.js`, `backend/src/routes/authRoutes.js`) |
| `backend/tests/helpers/http.js` | Helpers de test: `crearRespuestaMock()`, `crearRequest()` (no es producción) |

## Helpers (solo tests)

- **`crearRespuestaMock()`** / **`crearRequest()`** → `backend/tests/helpers/http.js`

## Evidencias de los 13 casos de ajuste

| Qué | Dónde |
|-----|--------|
| Excel de presentación | `evidencias/Pruebas_Unitarias_RideU.xlsx` |
| Logs fallo→éxito por caso | `evidencias/casos-ajuste/CU-01` … `CU-13` |
| Resumen JSON | `evidencias/resumen_casos_ajuste.json` |
| Script que regenera evidencias | `evidencias/generar_casos_ajuste.py` |
| Script que regenera el Excel | `evidencias/generar_excel.py` |

## Tests antiguos (Node test runner, opcionales)

Siguen en `backend/src/**/*.test.js` (algunos tocan PostgreSQL real). No los usa Jest.

```bash
cd backend && npm run test:integration
```
