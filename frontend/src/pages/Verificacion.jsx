import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { IconoCheck, IconoEscudo, IconoFlecha } from "../components/Iconos.jsx";
import { verificarCorreo } from "../services/auth.js";

const RELATO_VERIFICACION = {
  titulo: (
    <>
      Tu comunidad.
      <br />
      Tu próximo viaje.
    </>
  ),
  texto: "Comparte tus trayectos por Popayán con personas de la Universidad del Cauca.",
};

export default function Verificacion() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token")?.trim() ?? "";
  const [estado, setEstado] = useState(token ? "cargando" : "error");
  const [mensaje, setMensaje] = useState(
    token ? "" : "El enlace de verificación no es válido.",
  );
  const [correo, setCorreo] = useState("");

  useEffect(() => {
    if (!token) return undefined;
    let activo = true;
    verificarCorreo(token)
      .then((respuesta) => {
        if (!activo) return;
        setMensaje(respuesta.mensaje || "No se pudo verificar la cuenta.");
        setCorreo(respuesta.usuario?.correo ?? "");
        setEstado(respuesta.ok ? "exito" : "error");
      })
      .catch(() => {
        if (!activo) return;
        setMensaje("No se pudo conectar con el servidor. Inténtalo de nuevo.");
        setEstado("error");
      });
    return () => {
      activo = false;
    };
  }, [token]);

  return (
    <AuthLayout titulo={RELATO_VERIFICACION.titulo} texto={RELATO_VERIFICACION.texto}>
      {estado === "exito" ? (
        <ResultadoExito correo={correo} />
      ) : (
        <ResultadoPendiente estado={estado} mensaje={mensaje} />
      )}
    </AuthLayout>
  );
}

function ResultadoExito({ correo }) {
  return (
    <div className="verificacion verificacion-exito">
      <div className="exito-marca" aria-hidden="true">
        <span className="exito-circulo">
          <IconoCheck />
        </span>
        <span className="exito-badge">
          <i />
          Verificada
        </span>
      </div>

      <h2>¡Tu correo ya está verificado!</h2>
      <p className="ayuda">
        Ya formas parte de la comunidad RideU. Inicia sesión para encontrar tu próximo trayecto.
      </p>

      {correo ? (
        <div className="correo-confirmado">
          <small>Correo institucional confirmado</small>
          <strong>{correo}</strong>
        </div>
      ) : null}

      <Link className="boton" to="/login">
        Ir a iniciar sesión
        <IconoFlecha />
      </Link>

      <p className="confianza">
        <IconoEscudo />
        Tu cuenta, un paso más segura.
      </p>
    </div>
  );
}

function ResultadoPendiente({ estado, mensaje }) {
  return (
    <div className="verificacion">
      <p className="kicker">Correo institucional</p>
      <h2>{estado === "cargando" ? "Confirmando tu correo" : "No pudimos verificar"}</h2>
      {estado === "cargando" ? (
        <p className="ayuda">Estamos confirmando tu enlace de verificación.</p>
      ) : (
        <p className="ayuda">
          Revisa el enlace del correo o vuelve a registrarte si el token ya expiró.
        </p>
      )}
      {mensaje ? (
        <p
          className={estado === "cargando" ? "aviso" : "aviso aviso-error"}
          role="alert"
        >
          {mensaje}
        </p>
      ) : null}
      {estado === "error" ? (
        <div className="verificacion-acciones">
          <Link className="boton" to="/login">
            Ir a iniciar sesión
            <IconoFlecha />
          </Link>
          <p className="cambio">
            ¿Necesitas otra cuenta? <Link to="/registro">Regístrate</Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
