import { Link } from "react-router-dom";
import { IconoAuto } from "./Iconos.jsx";

// Diseño de las pantallas de acceso (inicio de sesión, registro y verificación):
// solo la marca y un panel centrado con el formulario.
export default function AuthLayout({ children }) {
  return (
    <div className="pantalla pantalla-solo-panel">
      <header className="barra">
        <Link to="/registro" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
      </header>
      <main className="contenido-solo-panel">
        <section className="panel">{children}</section>
      </main>
    </div>
  );
}
