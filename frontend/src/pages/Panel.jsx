import { Link, useOutletContext } from "react-router-dom";
import { IconoAuto, IconoEscudo } from "../components/Iconos.jsx";

export default function Panel() {
  const { usuario } = useOutletContext();
  const primerNombre = usuario?.nombre?.split(" ")[0] ?? "";

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
        <div className="panel-accesos">
          <Link className="acceso-publicar" to="/trayectos/buscar">
            <strong>Buscar trayecto</strong>
            <small>Encuentra tu camino</small>
          </Link>
          <Link className="acceso-publicar" to="/trayectos/publicar">
            <strong>Publicar trayecto</strong>
            <small>Comparte tus cupos</small>
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
