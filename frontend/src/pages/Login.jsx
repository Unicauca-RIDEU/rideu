import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Aviso, Boton } from "@/components/ui";
import AuthLayout from "../components/AuthLayout.jsx";
import CampoCorreo, { MENSAJE_SOLO_USUARIO, correoCompleto } from "../components/CampoCorreo.jsx";
import {
  IconoCandado,
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
  const [verOlvido, setVerOlvido] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setMensaje("");
  }

  function cambiarCorreo(usuario) {
    setDatos((actual) => ({ ...actual, correo: usuario }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const usuarioCorreo = datos.correo.trim().toLowerCase();
    if (!usuarioCorreo || !datos.contrasena) {
      setMensaje("Ingresa tu correo institucional y tu contraseña.");
      return;
    }
    if (usuarioCorreo.includes("@")) {
      setMensaje(MENSAJE_SOLO_USUARIO);
      return;
    }
    const correo = correoCompleto(usuarioCorreo);

    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await iniciarSesion({ correo, contrasena: datos.contrasena });
      if (!respuesta.ok) {
        if (respuesta.status === 403 && respuesta.codigo === "EMAIL_NOT_VERIFIED") {
          setMensaje("Debes verificar tu correo institucional para acceder");
          return;
        }
        if (respuesta.status === 401) {
          setMensaje("Correo o contraseña incorrectos");
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
    <AuthLayout compacto>
      <div className="acceso">
        <p className="kicker">Qué bueno verte de nuevo</p>
        <h2>Volvamos a la U</h2>
        <p className="ayuda">Inicia sesión y comparte tu próximo trayecto.</p>

        {mensaje ? <Aviso tono="error">{mensaje}</Aviso> : null}

        <form className="formulario" onSubmit={enviar} noValidate>
          <CampoCorreo valor={datos.correo} onCambiar={cambiarCorreo} />

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

          {/* RideU aún no tiene recuperación de contraseña: el enlace lo explica en vez de no hacer nada. */}
          <button
            type="button"
            className="olvido"
            aria-expanded={verOlvido}
            aria-controls="nota-olvido"
            onClick={() => setVerOlvido((actual) => !actual)}
          >
            ¿Olvidaste tu contraseña?
          </button>
          {verOlvido ? (
            <div id="nota-olvido">
              <Aviso>
                La recuperación de contraseña todavía no está disponible en RideU. Si no recuerdas tu
                contraseña, consulta la <Link to="/ayuda">ayuda</Link>.
              </Aviso>
            </div>
          ) : null}

          <Boton type="submit" icono={<IconoFlecha />} cargando={enviando} textoCargando="Iniciando sesión…">
            Iniciar sesión
          </Boton>
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
