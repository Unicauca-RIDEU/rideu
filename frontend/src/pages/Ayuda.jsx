import { Link, useNavigate } from "react-router-dom";
import { IconoAuto, IconoEscudo } from "../components/Iconos.jsx";
import Pie from "../components/Pie.jsx";
import { tokenSesion } from "../services/auth.js";

// Ayuda y preguntas frecuentes. Es pública: se llega desde el pie de cualquier pantalla.
// Las respuestas describen las reglas que aplica la aplicación.

const SECCIONES = [
  {
    titulo: "Cuenta y acceso",
    preguntas: [
      {
        pregunta: "¿Quién puede usar RideU?",
        respuesta:
          "Solo personas de la comunidad Unicauca con correo institucional @unicauca.edu.co.",
      },
      {
        pregunta: "No puedo iniciar sesión, ¿qué hago?",
        respuesta:
          "Primero verifica tu correo con el enlace que te enviamos al registrarte; sin esa verificación no puedes entrar. Si ya lo verificaste, revisa que escribiste bien el correo y la contraseña.",
      },
      {
        pregunta: "¿Cuánto dura el enlace de verificación?",
        respuesta:
          "El enlace vence 24 horas después del registro y solo se puede usar una vez.",
      },
      {
        pregunta: "¿Cuánto tiempo dura mi sesión?",
        respuesta: "La sesión se mantiene abierta 7 días o hasta que la cierres desde el panel.",
      },
    ],
  },
  {
    titulo: "Conductores",
    preguntas: [
      {
        pregunta: "¿Qué necesito para publicar un trayecto?",
        respuesta:
          "Registrar tu vehículo y tu licencia en «Mi vehículo». Al hacerlo tu cuenta queda en estado «Habilitado» y ya puedes publicar.",
      },
      {
        pregunta: "¿Cuántos cupos puedo ofrecer?",
        respuesta:
          "Como máximo los que permite la capacidad de tu vehículo; el formulario no deja superar ese límite.",
      },
      {
        pregunta: "¿Cuánto cobro de aporte?",
        respuesta:
          "El aporte es una contribución para compartir los gastos del camino. Como referencia se sugieren entre $2.000 y $5.000 COP por persona.",
      },
      {
        pregunta: "¿Puedo publicar el mismo trayecto otra vez?",
        respuesta:
          "Sí. En «Mis trayectos» usa «Repetir trayecto»: el formulario de publicación se llena con el origen, la sede, la hora, los cupos y el aporte; solo eliges la nueva fecha.",
      },
      {
        pregunta: "¿Puedo editar o cancelar un trayecto?",
        respuesta:
          "Sí, desde «Mis trayectos», mientras el trayecto no haya iniciado. Si tiene reservas confirmadas te pediremos confirmar y avisaremos a los pasajeros.",
      },
    ],
  },
  {
    titulo: "Pasajeros",
    preguntas: [
      {
        pregunta: "¿Cómo busco un trayecto?",
        respuesta:
          "En «Buscar trayecto» elige la sede de destino, la fecha y la hora desde la que puedes salir. Tus búsquedas recientes quedan guardadas para repetirlas con un clic y puedes marcar una como favorita.",
      },
      {
        pregunta: "¿Por qué no puedo reservar un trayecto?",
        respuesta:
          "Puede que esté agotado, que ya hayas reservado en él, que sea tu propio trayecto o que ya no admita reservas.",
      },
      {
        pregunta: "¿Puedo cancelar una reserva?",
        respuesta:
          "Sí, desde «Mis reservas», antes de que el trayecto inicie. Al cancelar se libera tu cupo y avisamos al conductor. La cancelación no se puede deshacer.",
      },
      {
        pregunta: "¿Cómo me comunico con el conductor?",
        respuesta:
          "Con una reserva confirmada puedes escribirle por WhatsApp desde la confirmación de la reserva o desde tu «Historial». Llega unos minutos antes de la salida y confirma el punto de encuentro.",
      },
    ],
  },
  {
    titulo: "Estados",
    preguntas: [
      {
        pregunta: "¿Qué significa cada estado del historial?",
        respuesta:
          "«Pendiente»: el trayecto aún no ha salido. «Completado»: la hora de salida ya pasó. «Cancelado» o «Cancelada»: el trayecto o la reserva se cancelaron.",
      },
    ],
  },
];

export default function Ayuda() {
  const navigate = useNavigate();
  const conSesion = Boolean(tokenSesion());
  const inicio = conSesion ? "/panel" : "/login";

  function volver() {
    if (window.history.length > 1) navigate(-1);
    else navigate(inicio);
  }

  return (
    <div className="pantalla perfil">
      <header className="barra perfil-barra">
        <Link to={inicio} className="marca">
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
          Exclusivo para la comunidad Unicauca
        </p>
      </header>

      <main className="perfil-cuerpo">
        <button className="volver volver-boton" type="button" onClick={volver}>
          ← Volver
        </button>
        <h1>Ayuda</h1>
        <p className="perfil-intro">Respuestas rápidas para usar RideU.</p>

        <div className="ayuda-secciones">
          {SECCIONES.map((seccion) => (
            <section key={seccion.titulo} className="tarjeta ayuda-seccion">
              <h2>{seccion.titulo}</h2>
              {seccion.preguntas.map((item) => (
                <details key={item.pregunta} className="ayuda-pregunta">
                  <summary>{item.pregunta}</summary>
                  <p>{item.respuesta}</p>
                </details>
              ))}
            </section>
          ))}
        </div>
      </main>

      <Pie />
    </div>
  );
}
