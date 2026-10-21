import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import {
  IconoCandado,
  IconoCorreo,
  IconoEscudo,
  IconoFlecha,
  IconoOjo,
} from "../components/Iconos.jsx";
import { iniciarSesion } from "../services/auth.js";

export default function Login() {
  const navigate = useNavigate();
  const [datos, setDatos] = useState({ correo: "", contrasena: "" });
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const correoEscrito = datos.correo.trim().toLowerCase();
    const correo = correoEscrito.includes("@") ? correoEscrito : `${correoEscrito}@unicauca.edu.co`;
    if (!correoEscrito || !datos.contrasena) {
      setMensaje("Ingresa tu correo institucional y tu contraseña.");
      return;
    }

    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await iniciarSesion({ correo, contrasena: datos.contrasena });
      if (!respuesta.ok) {
        if (respuesta.status === 403 && respuesta.codigo === "EMAIL_NOT_VERIFIED") {
          setMensaje("Debes verificar tu correo institucional para acceder");
          return;
        }
        setMensaje(respuesta.mensaje || "No se pudo iniciar sesión.");
        return;
      }
      navigate("/panel", { replace: true });
    } catch {
      setMensaje("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <div className="acceso">
        <p className="kicker">Qué bueno verte de nuevo</p>
        <h2>Volvamos a la U</h2>
        <p className="ayuda">Inicia sesión y comparte tu próximo trayecto.</p>

        {mensaje ? (
          <p className="aviso aviso-error" role="alert">
            {mensaje}
          </p>
        ) : null}

        <form className="formulario" onSubmit={enviar} noValidate>
          <label>
            Correo institucional
            <span className="control">
              <IconoCorreo />
              <input
                name="correo"
                autoComplete="email"
                inputMode="email"
                placeholder="nombre.apellido@unicauca.edu.co"
                value={datos.correo}
                onChange={cambiar}
              />
            </span>
          </label>

          <label>
            Contraseña
            <span className="control">
              <IconoCandado />
              <input
                name="contrasena"
                type={verContrasena ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Ingresa tu contraseña"
                value={datos.contrasena}
                onChange={cambiar}
              />
              <button
                type="button"
                className="ojo"
                onClick={() => setVerContrasena((actual) => !actual)}
                aria-label={verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <IconoOjo oculto={!verContrasena} />
              </button>
            </span>
          </label>

          <button type="button" className="olvido">
            ¿Olvidaste tu contraseña?
          </button>

          <button className="boton" type="submit" disabled={enviando}>
            <IconoFlecha />
            {enviando ? "Iniciando sesión…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="cambio">
          ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
        <p className="confianza">
          <IconoEscudo />
          Tu correo institucional nos conecta con confianza.
        </p>
      </div>
    </AuthLayout>
  );
}
