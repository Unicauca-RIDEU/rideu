import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cerrarSesion } from "../services/auth.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

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
      <EncabezadoSesion usuario={usuario} activo="Inicio" />

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
          <Link className="acceso-publicar" to="/trayectos/editar">
            <strong>Mis trayectos</strong>
            <small>Edita o cancela tus trayectos</small>
          </Link>
          <Link className="acceso-publicar" to="/reservas/cancelar">
            <strong>Mis reservas</strong>
            <small>Cancela una reserva y libera tu cupo</small>
          </Link>
          <Link className="acceso-publicar" to="/historial">
            <strong>Historial</strong>
            <small>Tus trayectos y reservas</small>
          </Link>
        </div>
      </main>

      <Pie />
    </div>
  );
}
