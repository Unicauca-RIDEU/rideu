# Ride U

Aplicación web de trayectos compartidos para la comunidad de la Universidad del Cauca. El acceso es exclusivo con correo institucional `@unicauca.edu.co`.

El stack es React (Vite) en el frontend, Node.js con Express en el backend y PostgreSQL como base de datos.

## Estado del proyecto

`develop` es la rama de integración: ahí se sube el progreso de cada sprint.

| Sprint | Fechas (2026) | Historias | Estado en `develop` |
| --- | --- | --- | --- |
| Sprint 1 | 9 oct – 22 oct | HU01 Registro con correo institucional · HU02 Inicio de sesión validado | Implementadas |
| Sprint 2 | 23 oct – 5 nov | HU03 Registrar vehículo y licencia · HU06 Buscar trayectos disponibles | Implementadas |
| Sprint 3 | 6 nov – 19 nov | HU04 Publicar trayecto · HU09 Consultar historial de trayectos y reservas | En curso: HU04 con código base, HU09 pendiente, correcciones de HU01 y HU03 hechas |
| Sprint 4 | 20 nov – 3 dic | HU07 Reservar cupo · HU10 y HU11 Contacto por WhatsApp | Pendientes |
| Sprint 5 | 4 dic – 17 dic | HU05 Editar o cancelar trayecto · HU08 Cancelar reserva | Pendientes |

El backlog, las historias, los casos de prueba y el plan de riesgos están en [`documentacion/`](documentacion/). Las evidencias de las pruebas unitarias están en [`evidencias/`](evidencias/).

## Requisitos

- Node.js 20 o superior
- npm 10 o superior
- PostgreSQL 16 o superior

## Instalación

Desde la raíz del repositorio:

```bash
cp .env.example .env
npm install --prefix backend
npm install --prefix frontend
```

Ajusta `DATABASE_URL` en `.env` y crea la base `rideu`. Luego crea las tablas:

```bash
npm run db:migrate --prefix backend
```

La migración ejecuta en orden todos los archivos de `backend/sql/` y se puede repetir sin perder datos.

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

## API

Las rutas con sesión exigen el encabezado `Authorization: Bearer <token>`; el token lo entrega el inicio de sesión.

| Método y ruta | Historia | Sesión | Descripción |
| --- | --- | --- | --- |
| `POST /api/auth/registro` | HU01 | No | Crea la cuenta en estado «Sin verificar» y envía el enlace de verificación |
| `POST /api/auth/verificacion` | HU01 | No | Pasa la cuenta a «Verificada» con el token del enlace |
| `POST /api/auth/login` | HU02 | No | Inicia sesión y devuelve el token |
| `GET /api/auth/sesion` | HU02 | Sí | Devuelve el usuario de la sesión |
| `POST /api/vehiculos` | HU03 | Sí | Registra vehículo y licencia y deja la cuenta «Habilitado»; si ya lo está, los actualiza |
| `GET /api/trayectos/publicacion` | HU04 | Sí | Datos para la pantalla de publicación |
| `POST /api/trayectos` | HU04 | Sí | Publica un trayecto |
| `GET /api/trayectos?sedeDestinoId=&fecha=&horaDesde=` | HU06 | Sí | Trayectos disponibles con cupos, ordenados por hora de salida |
| `GET /api/sedes` | HU06 | Sí | Sedes de destino |

## Estructura

```text
.
├── backend/              API en Node.js y Express
│   ├── sql/                  Migraciones SQL numeradas
│   ├── src/
│   │   ├── config/           Variables de entorno y conexión a PostgreSQL
│   │   ├── controllers/      Manejo de cada petición HTTP
│   │   ├── db/               Ejecución de las migraciones
│   │   ├── middleware/       Validación de la sesión
│   │   ├── models/           Consultas a PostgreSQL
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
