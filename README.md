# Ride U

Aplicación web de trayectos compartidos para la comunidad de la Universidad del Cauca. El acceso es exclusivo con correo institucional `@unicauca.edu.co`.

El stack es React (Vite) en el frontend, Node.js con Express en el backend y Oracle Database como base de datos.

## Estado del proyecto

`develop` es la rama de integración: ahí se sube el progreso de cada sprint.

| Sprint | Fechas (2026) | Historias | Estado en `develop` |
| --- | --- | --- | --- |
| Sprint 1 | 9 oct – 22 oct | HU01 Registro con correo institucional · HU02 Inicio de sesión validado | Implementadas |
| Sprint 2 | 23 oct – 5 nov | HU03 Registrar vehículo y licencia · HU06 Buscar trayectos disponibles | Implementadas |
| Sprint 3 | 6 nov – 19 nov | HU04 Publicar trayecto · HU09 Consultar historial de trayectos y reservas | En curso: HU04 evaluada; HU09 con el historial de trayectos hecho (las reservas llegan con HU07); correcciones y mejoras de HU01 a HU04 hechas |
| Sprint 4 | 20 nov – 3 dic | HU07 Reservar cupo · HU10 y HU11 Contacto por WhatsApp | Pendientes |
| Sprint 5 | 4 dic – 17 dic | HU05 Editar o cancelar trayecto · HU08 Cancelar reserva | Pendientes |

El backlog, las historias, los casos de prueba y el plan de riesgos están en [`documentacion/`](documentacion/). Las evidencias de las pruebas unitarias están en [`evidencias/`](evidencias/).

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- Oracle Database 19c o superior (sirven las ediciones gratuitas Oracle Database Free y Oracle XE 21c)

El backend usa el driver oficial `oracledb` en modo Thin: no hace falta instalar Oracle Instant Client.

## Instalación

Desde la raíz del repositorio:

```bash
cp .env.example .env
npm install --prefix backend
npm install --prefix frontend
```

### Base de datos Oracle

1. Ten una base Oracle en marcha. Para desarrollo sirve un contenedor de Oracle Database Free; por ejemplo:

   ```bash
   docker run -d --name rideu-oracle -p 1521:1521 -e ORACLE_PASSWORD=<contraseña-de-system> gvenzl/oracle-free:23-slim-faststart
   ```

2. Crea el usuario (esquema) `rideu`. Edita la contraseña en [`backend/sql/admin/crear_usuario.sql`](backend/sql/admin/crear_usuario.sql) sin guardar el cambio en Git y ejecútalo una sola vez como administrador, conectado a la base conectable (PDB):

   ```bash
   sqlplus system@localhost:1521/FREEPDB1 @backend/sql/admin/crear_usuario.sql
   ```

3. Completa en `.env` las variables de conexión:

   | Variable | Descripción | Ejemplo |
   | --- | --- | --- |
   | `DB_USER` | Usuario de la aplicación | `rideu` |
   | `DB_PASSWORD` | Contraseña de ese usuario | (no se sube al repositorio) |
   | `DB_CONNECT_STRING` | `host:puerto/servicio` de la PDB | `localhost:1521/FREEPDB1` (Free), `localhost:1521/XEPDB1` (XE) |
   | `DB_POOL_MIN`, `DB_POOL_MAX` | Opcionales: tamaño del pool de conexiones | `1` y `10` |

4. Comprueba la conexión:

   ```bash
   npm run db:check --prefix backend
   ```

5. Crea las tablas:

   ```bash
   npm run db:migrate --prefix backend
   ```

La migración ejecuta en orden alfabético todos los archivos de `backend/sql/` (de `001_usuarios.sql` a `008_indices_claves_foraneas.sql`; la carpeta `admin/` no se incluye) y se puede repetir sin perder datos. Los mismos archivos se pueden ejecutar a mano con SQL*Plus o SQLcl en ese orden; en ese caso termina con `COMMIT`.

## Ejecución

Usa dos terminales.

Backend (http://localhost:3000):

```bash
npm run dev --prefix backend
```

Frontend (http://localhost:5173):

```bash
npm run dev --prefix frontend
```

Con `MAIL_MODE=console` el enlace de verificación de la cuenta se imprime en la terminal del backend.

## Pruebas

Pruebas unitarias del backend (Jest). No necesitan base de datos:

```bash
npm test --prefix backend
```

Con informe de cobertura:

```bash
npm run test:coverage --prefix backend
```

Pruebas de integración contra Oracle real (conexión, CRUD, relaciones, restricciones, transacciones y endpoints). Usan la conexión de `.env`, crean sus propios datos y los borran; si Oracle no está disponible se omiten:

```bash
npm run test:integration --prefix backend
```

Comprobación del build del frontend:

```bash
npm run build --prefix frontend
```

## Pantallas

| Ruta | Historia | Requiere sesión |
| --- | --- | --- |
| `/registro` | HU01 | No |
| `/registro/verificacion` | HU01 | No |
| `/login` | HU02 | No |
| `/panel` | HU02 | Sí |
| `/perfil/vehiculo` | HU03 | Sí |
| `/trayectos/publicar` | HU04 | Sí |
| `/trayectos/buscar` | HU06 | Sí |
| `/historial` | HU09 | Sí |

## API

Las rutas con sesión exigen el encabezado `Authorization: Bearer <token>`; el token lo entrega el inicio de sesión. Una ruta de `/api` que no existe responde 404 en JSON.

| Método y ruta | Historia | Sesión | Descripción |
| --- | --- | --- | --- |
| `POST /api/auth/registro` | HU01 | No | Crea la cuenta en estado «Sin verificar» y envía el enlace de verificación |
| `POST /api/auth/verificacion` | HU01 | No | Pasa la cuenta a «Verificada» con el token del enlace |
| `POST /api/auth/login` | HU02 | No | Inicia sesión y devuelve el token |
| `POST /api/auth/logout` | HU02 | Sí | Cierra la sesión del token |
| `GET /api/auth/sesion` | HU02 | Sí | Devuelve el usuario de la sesión |
| `GET /api/vehiculos` | HU03 | Sí | Vehículo y licencia del usuario de la sesión |
| `POST /api/vehiculos` | HU03 | Sí | Registra vehículo y licencia y deja la cuenta «Habilitado»; si ya lo está, los actualiza |
| `GET /api/trayectos/publicacion` | HU04 | Sí | Datos para la pantalla de publicación |
| `POST /api/trayectos` | HU04 | Sí | Publica un trayecto; rechaza otro del mismo conductor en la misma fecha y hora |
| `GET /api/trayectos?sedeDestinoId=&fecha=&horaDesde=` | HU06 | Sí | Trayectos disponibles con cupos, ordenados por hora de salida |
| `GET /api/sedes` | HU06 | Sí | Sedes de destino |
| `GET /api/historial` | HU09 | Sí | Trayectos publicados por el usuario, con estado «Pendiente» o «Completado» |

## Estructura

```text
.
├── backend/              API en Node.js y Express
│   ├── sql/                  Migraciones SQL numeradas (Oracle) y admin/ con la creación del usuario
│   ├── src/
│   │   ├── config/           Variables de entorno y conexión a Oracle
│   │   ├── controllers/      Manejo de cada petición HTTP
│   │   ├── db/               Migraciones, comprobación de la conexión y pruebas de integración
│   │   ├── middleware/       Validación de la sesión
│   │   ├── models/           Consultas a Oracle
│   │   ├── routes/           Rutas HTTP
│   │   ├── services/         Envío de correo
│   │   ├── validation/       Reglas de validación de los datos
│   │   ├── app.js            Instancia de Express y rutas /api
│   │   └── server.js         Arranque del proceso HTTP
│   └── tests/                Pruebas unitarias (Jest)
├── frontend/             Interfaz en React con Vite
│   ├── public/               Archivos estáticos
│   └── src/
│       ├── components/       Componentes compartidos
│       ├── pages/            Pantallas
│       ├── services/         Llamadas al backend
│       ├── styles/           CSS global
│       ├── App.jsx           Rutas de la aplicación
│       └── main.jsx          Punto de entrada de React
├── documentacion/        Backlog, historias, casos de prueba, riesgos y diseño
├── evidencias/           Registro y capturas de las pruebas unitarias
├── .env.example          Plantilla de variables de entorno
└── CLAUDE.md             Reglas de trabajo del proyecto
```

## Ramas

| Rama | Uso |
| --- | --- |
| `main` | Rama principal del repositorio |
| `develop` | Integración; recibe el progreso de cada historia |
| `SPRINT-NN` | Entrega de cada sprint (etiquetas `v0.1`, `v0.2`…) |
| `feature/E0X-HUXX-nombre` | Desarrollo de una historia |
| `bugfix/E0X-HUXX-nombre` | Corrección de un defecto de una historia |
