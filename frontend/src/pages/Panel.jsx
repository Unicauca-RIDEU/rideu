import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { IconoAuto, IconoEscudo } from "../components/Iconos.jsx";
import { cerrarSesion } from "../services/auth.js";

export default function Panel() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const primerNombre = usuario?.nombre?.split(" ")[0] ?? "";

  async function salir() {
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  return (
    <div className="pantalla">
      <header className="barra">
        <Link to="/panel" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
        <p className="exclusivo">
          <IconoEscudo />
          {usuario?.correo}
        </p>
      </header>

      <main className="panel-principal">
        <p className="kicker">Panel principal</p>
        <h2>Hola, {primerNombre}</h2>
        <p className="ayuda">¿Compartimos el camino a la U?</p>
        <p>
          <button className="boton-contorno" type="button" onClick={salir}>
            Cerrar sesión
          </button>
        </p>
        <div className="panel-accesos">
          <Link className="acceso-publicar" to="/trayectos/buscar">
            <strong>Buscar trayecto</strong>
            <small>Encuentra tu camino</small>
          </Link>
          <Link className="acceso-publicar" to="/trayectos/publicar">
            <strong>Publicar trayecto</strong>
            <small>Comparte tus cupos</small>
          </Link>
          <Link className="acceso-publicar" to="/historial">
            <strong>Historial</strong>
            <small>Tus trayectos y reservas</small>
          </Link>
        </div>
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}
