import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Aviso, Boton } from "@/components/ui";
import AuthLayout from "../components/AuthLayout.jsx";
import CampoCorreo, {
  MENSAJE_DOMINIO,
  correoCompleto,
  esCorreoInstitucional,
} from "../components/CampoCorreo.jsx";
import { IconoOjo } from "../components/Iconos.jsx";
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

  function cambiarCorreo(usuario) {
    setDatos((actual) => ({ ...actual, correo: usuario }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const correo = correoCompleto(datos.correo);
    if (!correo || !datos.contrasena) {
      setMensaje("Ingresa tu correo institucional y tu contraseña.");
      return;
    }
    if (!esCorreoInstitucional(correo)) {
      setMensaje(MENSAJE_DOMINIO);
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
    <AuthLayout>
      <div className="acceso">
        <h2>Inicia sesión</h2>
        <p className="ayuda ayuda-amplia">Viajemos a la U y comparte tu próximo trayecto.</p>

        {mensaje ? <Aviso tono="error">{mensaje}</Aviso> : null}

        <form className="formulario" onSubmit={enviar} noValidate>
          <CampoCorreo valor={datos.correo} onCambiar={cambiarCorreo} />

          <label>
            <span className="control">
              <input
                name="contrasena"
                type={verContrasena ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Contraseña"
                aria-label="Contraseña"
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

          <Boton type="submit" cargando={enviando} textoCargando="Iniciando sesión…">
            Iniciar sesión
          </Boton>
        </form>

        <p className="cambio">
          ¿Aún no tienes cuenta? <Link to="/registro">Regístrate</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
