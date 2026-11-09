# RideU — Reglas de trabajo del proyecto

Este archivo guía el trabajo asistido en el repositorio. Lo marcado como **Por confirmar** no está decidido y no debe darse por hecho.

## 1. Proyecto

RideU es una aplicación web de trayectos compartidos para la comunidad de la Universidad del Cauca, con acceso exclusivo mediante correo `@unicauca.edu.co`. Es un proyecto académico gestionado con Scrum: 5 épicas y 11 historias de usuario (HU01–HU11).

`develop` es la rama de integración donde se sube el progreso.

## 2. Arquitectura y tecnologías

| Capa | Tecnología |
| --- | --- |
| Frontend | React 19, Vite 6, react-router-dom 7, JavaScript (ESM), CSS global |
| Backend | Node.js >= 20 (ESM), Express 4, `pg`, `bcryptjs`, `nodemailer` |
| Base de datos | PostgreSQL 16, SQL plano en `backend/sql/` |
| Pruebas | Jest 30 y supertest en el backend |

- Flujo del backend: `routes → controllers → validation / models → services`.
- Sesión: token opaco enviado como `Authorization: Bearer`, guardado como hash SHA-256 en la tabla `sesiones`, con vigencia de 7 días. Contraseñas con bcrypt.
- En desarrollo, Vite redirige `/api` al backend en `localhost:3000`.
- No hay integración continua, linter, pruebas de frontend ni despliegue configurados.

## 3. Estructura del repositorio

```text
backend/sql/              Migraciones numeradas e idempotentes
backend/src/routes/       Rutas Express
backend/src/controllers/  Manejo de la petición y la respuesta
backend/src/validation/   Reglas puras, sin acceso a datos
backend/src/models/       Consultas SQL parametrizadas
backend/src/services/     Correo
backend/src/middleware/   requiereSesion
backend/tests/            Pruebas Jest, en espejo de src/
frontend/src/pages/       Pantallas
frontend/src/components/  Componentes compartidos
frontend/src/services/    Llamadas al backend
documentacion/            Backlog, historias, casos de prueba, riesgos, diseño
evidencias/               Excel de pruebas unitarias y capturas
```

## 4. Comandos

```bash
npm install --prefix backend
npm install --prefix frontend
npm run db:migrate --prefix backend      # aplica backend/sql en orden
npm run dev --prefix backend             # http://localhost:3000
npm run dev --prefix frontend            # http://localhost:5173
npm test --prefix backend                # pruebas unitarias (Jest)
npm run test:coverage --prefix backend   # con cobertura
npm run build --prefix frontend          # comprobación del build
```

La configuración se lee de `.env` en la raíz (plantilla en `.env.example`).

## 5. Convenciones de programación

- Identificadores, mensajes al usuario y comentarios en español.
- Módulos ESM, comillas dobles, punto y coma, sangría de 2 espacios.
- Las validaciones son funciones puras que devuelven `{ ok: true, datos }` o `{ ok: false, mensaje, errores: [{ campo, mensaje }] }`.
- Los controladores responden JSON con `mensaje` y usan: 400 validación, 401 sin sesión, 403 sin permiso, 404 no existe, 409 conflicto, 500 error interno.
- El usuario se toma siempre de la sesión (`req.usuario`), nunca del cuerpo de la petición.
- SQL siempre parametrizado; las escrituras múltiples van en una transacción.
- Las fechas y horas de negocio se evalúan en hora de Colombia (UTC-5).
- Cada cambio de esquema es un archivo nuevo `NNN_descripcion.sql`, idempotente y sin borrado de tablas ni de datos.
- No se agregan dependencias sin justificación y aprobación.

## 6. Organización Scrum

Documentos vigentes: Product Backlog v1.3 (`documentacion/Backlogs/`) e Historias de usuario v1.1 (`documentacion/UserStories/`). Ante una diferencia entre ambos, se consulta al responsable antes de asumir.

### Plan de sprints

| Sprint | Fechas (2026) | Historias |
| --- | --- | --- |
| Sprint 1 | 9 oct – 22 oct | HU01, HU02 |
| Sprint 2 | 23 oct – 5 nov | HU03, HU06 |
| Sprint 3 | 6 nov – 19 nov | HU04, HU09 |
| Sprint 4 | 20 nov – 3 dic | HU07, HU10, HU11 |
| Sprint 5 | 4 dic – 17 dic | HU05, HU08 |

### Historias

| HU | Épica | Nombre | Prioridad | SP | Depende de |
| --- | --- | --- | --- | --- | --- |
| HU01 | E01 | Registro con correo institucional | Alta | 13 | — |
| HU02 | E01 | Inicio de sesión validado | Alta | 5 | HU01 |
| HU03 | E02 | Registrar vehículo y licencia | Alta | 8 | HU02 |
| HU04 | E02 | Publicar trayecto | Alta | 13 | HU03 |
| HU05 | E02 | Editar o cancelar trayecto | Media | 13 | HU04 |
| HU06 | E03 | Buscar trayectos disponibles | Alta | 8 | — |
| HU07 | E04 | Reservar cupo en trayecto | Alta | 13 | HU06 |
| HU08 | E04 | Cancelar reserva | Media | 8 | HU07 |
| HU09 | E04 | Consultar historial de trayectos y reservas | Baja | 5 | — |
| HU10 | E05 | Contacto WhatsApp para el pasajero | Media | 3 | HU07 |
| HU11 | E05 | Contacto WhatsApp para el conductor | Baja | 3 | HU04, HU07 |

### Identificadores

| Elemento | Formato | Ejemplo |
| --- | --- | --- |
| Épica | `E0X` | `E02` |
| Historia | `RU-E00X-HUXX` | `RU-E002-HU04` |
| Criterio de aceptación | `CA-HUXX-NN` | `CA-HU04-03` |
| Caso de prueba funcional | `RU-E00X-HUXX-CPNN` | `RU-E002-HU04-CP01` |
| Prueba unitaria | `UT-NN` | `UT-89` |
| Caso de ajuste (prueba que falló y se corrigió) | `CU-NN` | `CU-14` |

### Reglas

- Se trabaja sprint por sprint y solo sobre historias aprobadas.
- No se cambian requisitos, criterios, prioridades ni estimaciones aprobados sin autorización.
- No se duplican historias ni identificadores; los identificadores existentes se conservan.
- Los criterios nuevos se redactan de forma verificable, con Given / When / Then cuando corresponda.

## 7. Reglas de implementación

Antes de desarrollar una historia: revisar la historia y sus criterios, identificar dependencias, inspeccionar la arquitectura y proponer los cambios. Se desarrolla solo después de aprobar el plan.

- Cambios mínimos y acordes a las convenciones; sin reestructurar el proyecto.
- Se conservan los cambios de los demás integrantes.
- No se da por implementado algo porque exista un documento o una pantalla: se verifica el código y su comportamiento.

## 8. Estrategia de pruebas

### Unitarias

- Jest en `backend/tests/`, con la base de datos simulada.
- Al menos una prueba por criterio de aceptación de la historia.
- Umbral de cobertura del 70 % por carpeta (`backend/jest.config.js`).
- Registro por prueba: identificador, historia, criterio, datos de entrada, resultado esperado, resultado obtenido, estado, defecto relacionado y evidencia.

### Funcionales

- Desde la perspectiva del usuario, en el navegador y con el backend real.
- Cubren flujos positivos y negativos, validaciones, reglas de negocio, permisos, persistencia, integración, navegación, casos límite y regresión.
- Cada caso tiene precondiciones, pasos, datos, resultado esperado, resultado obtenido y estado.

### Integridad de los resultados

- Se conservan tres momentos: ejecución inicial, ejecución después del ajuste y ejecución final de toda la suite.
- El porcentaje de pruebas fallidas iniciales se mide sobre las pruebas realmente ejecutadas y se informa el valor real, sea o no el 30 %.
- No se introducen errores artificiales, no se manipulan resultados y no se inventan fallos.
- Una prueba que no se ejecutó no se marca como aprobada.
- Cada defecto registra cómo reproducirlo, gravedad, resultado esperado, resultado real y propuesta de corrección.

## 9. Auditoría documental

- Antes de cerrar un sprint se contrastan backlog, historias, casos de prueba, README y evidencias con el código.
- Cada hallazgo indica archivo, problema, corrección propuesta, prioridad y documentos relacionados.
- Los documentos aprobados no se modifican sin autorización. Un cambio en un documento versionado se guarda como versión nueva y la anterior se conserva.

## 10. Gestión de evidencias

- Solo evidencias auténticas, tomadas de ejecuciones reales. No se generan capturas simuladas ni se alteran resultados.
- Si una captura no se puede tomar con las herramientas disponibles, se informa al responsable para que la realice.
- Pruebas unitarias: registro en `evidencias/Pruebas_Unitarias_RideU.xlsx` y capturas en `evidencias/casos-ajuste/CU-NN/` (`error-CUNN.png` y `solved-CUNN.png`).
- Pruebas funcionales: registro en `documentacion/TestCases/`.
- **Por confirmar:** carpeta para las capturas de pruebas funcionales y de la ejecución final, organizadas por sprint, tipo de prueba e historia.

## 11. Definition of Done

**Por confirmar** (propuesta pendiente de aprobación del equipo):

1. Todos los criterios de aceptación de la historia están verificados.
2. Las pruebas unitarias y funcionales están ejecutadas, registradas y con evidencia.
3. La suite completa pasa y el frontend compila.
4. No quedan defectos críticos ni altos abiertos.
5. Se hizo una revisión independiente del código y de las pruebas.
6. La documentación y la trazabilidad están actualizadas.
7. El responsable aprobó la historia.

Un sprint no se da por terminado con defectos críticos sin resolver o pruebas obligatorias pendientes.

## 12. Git

### Ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama principal |
| `develop` | Integración; recibe el progreso |
| `SPRINT-NN` | Entrega de cada sprint, con etiqueta `v0.N` |
| `feature/E0X-HUXX-nombre` | Desarrollo de una historia |
| `bugfix/E0X-HUXX-nombre` | Corrección de un defecto de una historia |

No se crean ramas con otros esquemas de nombre.

### Commits

- Formato: `tipo(HUXX): descripción` en español, con `feat`, `fix`, `test`, `docs` o `chore`.
- Autor y confirmador: `juansmeneses <juansmeneses@unicauca.edu.co>`, indicado en cada commit sin modificar la configuración de identidad de Git.
- Nunca se agrega `Co-Authored-By` ni firmas de herramientas de IA en commits, Pull Requests, código o documentación.
- No se hace commit, push ni merge sin autorización del responsable.
- No se reescribe el historial ni se fuerza un push.

## 13. Seguridad

- No se modifican `.env` ni credenciales, y no se suben secretos al repositorio.
- No se borran archivos sin autorización.
- No se ejecutan migraciones destructivas.
- En la base de datos solo se guardan hashes de contraseñas y de tokens.
- Los mensajes de error de autenticación no revelan qué dato es incorrecto.

## 14. Forma de trabajo

Primero se analiza, después se propone, se espera la aprobación y finalmente se ejecuta. En cada informe se distingue lo verificado, lo propuesto y lo pendiente. No se inventan fechas, requisitos, resultados ni evidencias.
