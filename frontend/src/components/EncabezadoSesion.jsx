import { Link } from "react-router-dom";
import EnlacesNavegacion from "./EnlacesNavegacion.jsx";
import { IconoAuto } from "./Iconos.jsx";

// Encabezado de las pantallas con sesión: marca, navegación principal y persona conectada.
export default function EncabezadoSesion({ usuario, activo }) {
  const nombre = usuario?.nombre?.trim() || "Tu perfil";
  return (
    <header className="barra perfil-barra">
      <Link to="/panel" className="marca">
        <span className="marca-icono">
          <IconoAuto />
        </span>
        <span>
          <strong>RideU</strong>
          <small>Universidad del Cauca</small>
        </span>
      </Link>
      <div className="perfil-nav">
        <EnlacesNavegacion activo={activo} />
        <span className="perfil-usuario" title={usuario?.correo}>
          <span className="avatar" aria-hidden="true">
            {iniciales(nombre)}
          </span>
          <strong>{nombre}</strong>
        </span>
      </div>
    </header>
  );
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
