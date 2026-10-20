import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { IconoFlecha } from "../components/Iconos.jsx";
import { verificarCorreo } from "../services/auth.js";

export default function Verificacion() {
  const [parametros] = useSearchParams();
  const token = parametros.get("token")?.trim() ?? "";
  const [estado, setEstado] = useState(token ? "cargando" : "error");
  const [mensaje, setMensaje] = useState(
    token ? "" : "El enlace de verificación no es válido.",
  );

  useEffect(() => {
    if (!token) return undefined;
    let activo = true;
    verificarCorreo(token)
      .then((respuesta) => {
        if (!activo) return;
        setMensaje(respuesta.mensaje || "No se pudo verificar la cuenta.");
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
    <AuthLayout>
      <p className="kicker">Correo institucional</p>
      <h2>{estado === "exito" ? "Cuenta verificada" : "Verificación"}</h2>
      {estado === "cargando" ? <p className="ayuda">Estamos confirmando tu enlace.</p> : null}
      {mensaje ? (
        <p className={estado === "exito" ? "aviso aviso-exito" : "aviso aviso-error"} role="alert">
          {mensaje}
        </p>
      ) : null}
      {estado === "exito" ? (
        <Link className="boton" to="/login">
          <IconoFlecha />
          Ir a iniciar sesión
        </Link>
      ) : null}
    </AuthLayout>
  );
}
