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
        <p className="ayuda">Pronto podrás publicar y encontrar trayectos desde aquí.</p>
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}
