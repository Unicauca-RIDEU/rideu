import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { obtenerSesion, tokenSesion } from "../services/auth.js";

export default function RutaProtegida() {
  const [estado, setEstado] = useState(tokenSesion() ? "cargando" : "sin-sesion");
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    if (estado !== "cargando") return undefined;
    let activo = true;
    obtenerSesion()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.ok) {
          setUsuario(respuesta.usuario);
          setEstado("con-sesion");
        } else {
          setEstado("sin-sesion");
        }
      })
      .catch(() => {
        if (activo) setEstado("sin-sesion");
      });
    return () => {
      activo = false;
    };
  }, [estado]);

  if (estado === "sin-sesion") return <Navigate to="/login" replace />;
  if (estado === "cargando") return null;
  return <Outlet context={{ usuario }} />;
}
