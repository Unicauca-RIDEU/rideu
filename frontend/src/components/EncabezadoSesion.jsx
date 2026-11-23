import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import EnlacesNavegacion from "./EnlacesNavegacion.jsx";
import { IconoAuto } from "./Iconos.jsx";
import { cerrarSesion } from "../services/auth.js";

// Encabezado de las pantallas con sesión: marca, navegación principal y menú de la persona conectada
// (vehículo, ayuda y cierre de sesión). «activo» indica la sección a la que pertenece la pantalla.
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
        <MenuUsuario nombre={nombre} correo={usuario?.correo} />
      </div>
    </header>
  );
}

function MenuUsuario({ nombre, correo }) {
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const contenedor = useRef(null);
  const boton = useRef(null);
  const idMenu = useId();
  const navigate = useNavigate();

  // Se cierra al hacer clic fuera o con Esc (y el foco vuelve al botón).
  useEffect(() => {
    if (!abierto) return undefined;
    function alClicFuera(evento) {
      if (!contenedor.current?.contains(evento.target)) setAbierto(false);
    }
    function alTeclear(evento) {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      boton.current?.focus();
    }
    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  async function salir() {
    setSaliendo(true);
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  return (
    <div className="menu-usuario" ref={contenedor}>
      <button
        ref={boton}
        className="perfil-usuario menu-usuario-boton"
        type="button"
        aria-expanded={abierto}
        aria-controls={idMenu}
        title={correo}
        onClick={() => setAbierto((valor) => !valor)}
      >
        <span className="avatar" aria-hidden="true">
          {iniciales(nombre)}
        </span>
        <strong>{nombre}</strong>
        <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="m7 10 5 5 5-5H7Z" />
        </svg>
      </button>
      {abierto ? (
        <ul className="menu-usuario-lista" id={idMenu}>
          {correo ? <li className="menu-usuario-correo">{correo}</li> : null}
          <li>
            <Link to="/perfil/vehiculo" onClick={() => setAbierto(false)}>
              Mi vehículo
            </Link>
          </li>
          <li>
            <Link to="/ayuda" onClick={() => setAbierto(false)}>
              Ayuda
            </Link>
          </li>
          <li>
            <button type="button" onClick={salir} disabled={saliendo}>
              {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          </li>
        </ul>
      ) : null}
    </div>
  );
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
