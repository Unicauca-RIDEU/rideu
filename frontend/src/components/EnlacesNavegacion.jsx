import { Link } from "react-router-dom";

// Navegación principal del encabezado. «activo» indica la sección a la que pertenece la pantalla.
const ENLACES = [
  { nombre: "Inicio", ruta: "/panel" },
  { nombre: "Buscar", ruta: "/trayectos/buscar" },
  { nombre: "Publicar", ruta: "/trayectos/publicar" },
  { nombre: "Historial", ruta: "/historial" },
];

export default function EnlacesNavegacion({ activo }) {
  return (
    <nav className="nav-enlaces" aria-label="Navegación principal">
      {ENLACES.map((enlace) => (
        <Link
          key={enlace.nombre}
          to={enlace.ruta}
          className={enlace.nombre === activo ? "nav-enlace nav-activo" : "nav-enlace"}
          aria-current={enlace.nombre === activo ? "page" : undefined}
        >
          {enlace.nombre}
        </Link>
      ))}
    </nav>
  );
}
