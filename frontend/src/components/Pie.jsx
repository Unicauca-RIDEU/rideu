import { Link } from "react-router-dom";

// Pie común a todas las pantallas, con enlace a la sección de ayuda.
export default function Pie() {
  return (
    <footer className="pie">
      <p>RideU · Hecho para la comunidad Unicauca</p>
      <p>
        <Link className="pie-enlace" to="/ayuda">
          ¿Necesitas ayuda?
        </Link>{" "}
        · Privacidad y condiciones
      </p>
    </footer>
  );
}
