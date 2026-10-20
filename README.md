# Ride U

Página web de Ride U. El stack es React (Vite) en el frontend, Node.js con Express en el backend y PostgreSQL como base de datos.

El registro crea la cuenta en «Sin verificar» y envía el enlace de verificación. Con `MAIL_MODE=console` el enlace se imprime en la terminal del backend. Todavía no hay pantallas.

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

Ajusta `DATABASE_URL` en `.env` y crea la base `rideu`. Luego crea la tabla:

```bash
npm run db:migrate --prefix backend
```

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

Para comprobar el build del frontend:

```bash
npm run build --prefix frontend
```

## Estructura

```text
.
├── backend/          API en Node.js y Express
│   └── src/
│       ├── config/       Lectura de variables de entorno
│       ├── controllers/  Registro de usuarios
│       ├── middleware/   Middleware de Express (vacío)
│       ├── models/       Acceso a PostgreSQL (usuarios)
│       ├── routes/       Rutas HTTP de autenticación
│       ├── app.js        Instancia de Express y rutas /api/auth
│       └── server.js     Arranque del proceso HTTP
├── frontend/         Interfaz en React con Vite
│   ├── public/           Archivos estáticos servidos tal cual
│   └── src/
│       ├── assets/       Imágenes y archivos estáticos importados
│       ├── components/   Componentes reutilizables (vacío)
│       ├── pages/        Vistas de la aplicación (vacío)
│       ├── services/     Llamadas al backend (vacío)
│       ├── styles/       CSS global
│       ├── App.jsx       Componente raíz
│       └── main.jsx      Punto de entrada de React
├── .env.example      Plantilla de variables de entorno
└── .gitignore
```
