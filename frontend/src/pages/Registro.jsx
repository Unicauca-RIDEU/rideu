import { useState } from "react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import {
  IconoCandado,
  IconoCorreo,
  IconoFlecha,
  IconoOjo,
  IconoTelefono,
  IconoUsuario,
} from "../components/Iconos.jsx";
import { registrarUsuario } from "../services/auth.js";

const MENSAJE_DOMINIO = "Solo se permite el correo institucional @unicauca.edu.co.";

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

  const muestraDominio = !datos.correo.includes("@");

  return (
    <AuthLayout>
      <p className="kicker">Tu comunidad, más cerca</p>
      <h2>Crea tu cuenta</h2>
      <p className="ayuda">El primer paso para compartir el camino a la U.</p>

      {mensaje ? (
        <p className={exito ? "aviso aviso-exito" : "aviso aviso-error"} role="alert">
          {mensaje}
        </p>
      ) : null}

      {exito ? null : (
        <form className="formulario" onSubmit={enviar} noValidate>
          <label>
            Nombre completo
            <span className={errores.nombre ? "control control-error" : "control"}>
              <IconoUsuario />
              <input
                name="nombre"
                autoComplete="name"
                placeholder="Tu nombre y apellido"
                value={datos.nombre}
                onChange={cambiar}
                aria-invalid={Boolean(errores.nombre)}
              />
            </span>
            {errores.nombre ? <small>{errores.nombre}</small> : null}
          </label>

          <label>
            Correo institucional
            <span className={errores.correo ? "control control-error" : "control"}>
              <IconoCorreo />
              <input
                name="correo"
                autoComplete="email"
                inputMode="email"
                placeholder="nombre.apellido"
                value={datos.correo}
                onChange={cambiar}
                aria-invalid={Boolean(errores.correo)}
              />
              {muestraDominio ? <em>@unicauca.edu.co</em> : null}
            </span>
            {errores.correo ? (
              <small>{errores.correo}</small>
            ) : (
              <small className="pista">Usa tu correo de la Universidad del Cauca.</small>
            )}
          </label>

          <label>
            Contraseña
            <span className={errores.contrasena ? "control control-error" : "control"}>
              <IconoCandado />
              <input
                name="contrasena"
                type={verContrasena ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Crea una contraseña"
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
            WhatsApp
            <span className={errores.whatsapp ? "control control-error" : "control"}>
              <IconoTelefono />
              <b>+57</b>
              <input
                name="whatsapp"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Tu número de celular"
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
          <button className="boton" type="submit" disabled={enviando}>
            <IconoFlecha />
            {enviando ? "Registrando…" : "Registrarse"}
          </button>
        </form>
      )}

      <p className="cambio">
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </AuthLayout>
  );
}

function validar(datos) {
  const errores = {};
  const nombre = datos.nombre.trim();
  const correoEscrito = datos.correo.trim().toLowerCase();
  const correo = correoEscrito.includes("@") ? correoEscrito : correoEscrito ? `${correoEscrito}@unicauca.edu.co` : "";
  const celular = datos.whatsapp.replace(/\D/g, "").replace(/^57/, "");

  if (!nombre) errores.nombre = "El nombre completo es obligatorio.";
  else if (nombre.length < 3 || nombre.length > 120) {
    errores.nombre = "El nombre completo debe tener entre 3 y 120 caracteres.";
  }

  if (!correoEscrito) errores.correo = "El correo institucional es obligatorio.";
  else if (!/^[^\s@]+@unicauca\.edu\.co$/.test(correo)) errores.correo = MENSAJE_DOMINIO;

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
