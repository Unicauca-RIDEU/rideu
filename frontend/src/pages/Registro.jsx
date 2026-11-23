import { useState } from "react";
import { Link } from "react-router-dom";
import { Aviso, Boton } from "@/components/ui";
import AuthLayout from "../components/AuthLayout.jsx";
import CampoCorreo, {
  MENSAJE_DOMINIO,
  correoCompleto,
  esCorreoInstitucional,
} from "../components/CampoCorreo.jsx";
import { IconoFlecha, IconoOjo } from "../components/Iconos.jsx";
import { registrarUsuario } from "../services/auth.js";

const vacio = {
  nombre: "",
  correo: "",
  contrasena: "",
  whatsapp: "",
};

export default function Registro() {
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [verContrasena, setVerContrasena] = useState(false);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
    setMensaje("");
  }

  function cambiarCorreo(usuario) {
    setDatos((actual) => ({ ...actual, correo: usuario }));
    setErrores((actual) => ({ ...actual, correo: "" }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    const validacion = validar(datos);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      setMensaje(validacion.mensaje);
      setExito(false);
      return;
    }

    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await registrarUsuario({
        nombre: datos.nombre.trim(),
        correo: validacion.correo,
        contrasena: datos.contrasena,
        whatsapp: validacion.whatsapp,
      });
      if (!respuesta.ok) {
        setErrores(erroresPorCampo(respuesta.errores));
        setMensaje(respuesta.mensaje || "No se pudo crear la cuenta.");
        setExito(false);
        return;
      }
      setErrores({});
      setMensaje(respuesta.mensaje);
      setExito(true);
    } catch {
      setMensaje("No se pudo conectar con el servidor. Inténtalo de nuevo.");
      setExito(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <div className="acceso">
        <h2>Crea tu cuenta</h2>
        <p className="ayuda ayuda-amplia">El primer paso para compartir el camino a la U.</p>

        {mensaje && !exito ? <Aviso tono="error">{mensaje}</Aviso> : null}

        {exito ? (
          <div className="registro-listo">
            <Aviso tono="exito" icono>
              {mensaje}
            </Aviso>
            <ol className="pasos-habilitacion">
              <li>Abre el correo que te enviamos a {validar(datos).correo}.</li>
              <li>Pulsa el enlace de verificación (vence en 24 horas).</li>
              <li>Vuelve aquí e inicia sesión.</li>
            </ol>
            <Boton to="/login" icono={<IconoFlecha />}>
              Ir a iniciar sesión
            </Boton>
          </div>
        ) : (
          <form className="formulario" onSubmit={enviar} noValidate>
            <label>
              <span className={errores.nombre ? "control control-error" : "control"}>
                <input
                  name="nombre"
                  autoComplete="name"
                  placeholder="Nombre completo"
                  aria-label="Nombre completo"
                  value={datos.nombre}
                  onChange={cambiar}
                  aria-invalid={Boolean(errores.nombre)}
                />
              </span>
              {errores.nombre ? <small>{errores.nombre}</small> : null}
            </label>

            <CampoCorreo
              valor={datos.correo}
              onCambiar={cambiarCorreo}
              error={errores.correo}
              autoComplete="email"
            />

            <label>
              <span className={errores.contrasena ? "control control-error" : "control"}>
                <input
                  name="contrasena"
                  type={verContrasena ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Contraseña"
                  aria-label="Contraseña"
                  value={datos.contrasena}
                  onChange={cambiar}
                  aria-invalid={Boolean(errores.contrasena)}
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
              {errores.contrasena ? (
                <small>{errores.contrasena}</small>
              ) : (
                <small className="pista">Mínimo 8 caracteres.</small>
              )}
            </label>

            <label>
              <span className={errores.whatsapp ? "control control-error" : "control"}>
                <b>+57</b>
                <input
                  name="whatsapp"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="WhatsApp"
                  aria-label="WhatsApp"
                  value={datos.whatsapp}
                  onChange={cambiar}
                  aria-invalid={Boolean(errores.whatsapp)}
                />
              </span>
              {errores.whatsapp ? <small>{errores.whatsapp}</small> : null}
            </label>

            <p className="legal">
              Al registrarte, aceptas nuestras condiciones de uso y la política de privacidad.
            </p>
            <Boton type="submit" cargando={enviando} textoCargando="Registrando…">
              Registrarse
            </Boton>
          </form>
        )}

        <p className="cambio">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

function validar(datos) {
  const errores = {};
  const nombre = datos.nombre.trim();
  const correo = correoCompleto(datos.correo);
  const celular = datos.whatsapp.replace(/\D/g, "").replace(/^57/, "");

  if (!nombre) errores.nombre = "El nombre completo es obligatorio.";
  else if (nombre.length < 3 || nombre.length > 120) {
    errores.nombre = "El nombre completo debe tener entre 3 y 120 caracteres.";
  }

  if (!correo) errores.correo = "El correo institucional es obligatorio.";
  else if (!esCorreoInstitucional(correo)) errores.correo = MENSAJE_DOMINIO;

  if (!datos.contrasena) errores.contrasena = "La contraseña es obligatoria.";
  else if (datos.contrasena.length < 8) {
    errores.contrasena = "La contraseña debe tener al menos 8 caracteres.";
  }

  if (!datos.whatsapp.trim()) errores.whatsapp = "El número de WhatsApp es obligatorio.";
  else if (!/^3\d{9}$/.test(celular)) {
    errores.whatsapp = "Ingresa un número de celular de Colombia, de 10 dígitos y que empiece por 3.";
  }

  const campos = Object.keys(errores);
  let mensaje = "";
  if (campos.length === 1) mensaje = errores[campos[0]];
  else if (errores.correo === MENSAJE_DOMINIO) {
    mensaje = `${MENSAJE_DOMINIO} Completa también los demás campos obligatorios.`;
  } else if (campos.length > 1) mensaje = "Completa los campos obligatorios.";

  return {
    ok: campos.length === 0,
    errores,
    mensaje,
    correo,
    whatsapp: celular ? `+57${celular}` : "",
  };
}

function erroresPorCampo(errores = []) {
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}
