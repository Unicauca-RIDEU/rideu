import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { Boton, Cargando, Tarjeta, tonoDeEstado } from "@/components/ui";
import { cerrarSesion, obtenerSesion } from "../services/auth.js";
import { obtenerHistorial } from "../services/historial.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";
import TarjetaViaje from "../components/TarjetaViaje.jsx";
import { IconoFlecha } from "../components/Iconos.jsx";
import { pesos } from "../components/formatoTrayecto.js";

// Panel principal (/panel): lo primero que ve la persona al iniciar sesión.
// Muestra su próximo viaje con la acción que necesita y las dos tareas principales: buscar y publicar.
export default function Panel() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [proximos, setProximos] = useState({ estado: "cargando", lista: [] });
  const [saliendo, setSaliendo] = useState(false);
  const [estado, setEstado] = useState(usuario?.estado);
  const primerNombre = usuario?.nombre?.split(" ")[0] ?? "";
  const habilitado = estado === "Habilitado";

  // La sesión se carga una vez al entrar; si la persona registró su vehículo después,
  // se vuelve a consultar para ofrecerle publicar en lugar de registrar el vehículo.
  useEffect(() => {
    let activo = true;
    obtenerSesion()
      .then((respuesta) => {
        if (activo && respuesta.ok && respuesta.usuario?.estado) setEstado(respuesta.usuario.estado);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    let activo = true;
    obtenerHistorial()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok) {
          setProximos({ estado: "error", lista: [] });
          return;
        }
        setProximos({ estado: "listo", lista: viajesProximos(respuesta) });
      })
      .catch(() => {
        if (activo) setProximos({ estado: "error", lista: [] });
      });
    return () => {
      activo = false;
    };
  }, [navigate]);

  // Criterio CA-HU02-07: el cierre de sesión también está disponible en el panel.
  async function salir() {
    setSaliendo(true);
    await cerrarSesion();
    navigate("/login", { replace: true });
  }

  const [siguiente, ...restantes] = proximos.lista;

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Inicio" />

      <main className="perfil-cuerpo panel-cuerpo">
        <p className="kicker">Panel principal</p>
        <h1>Hola, {primerNombre}</h1>
        <p className="perfil-intro">¿Compartimos el camino a la U?</p>

        <div className="panel-grid">
          <section aria-labelledby="proximo-viaje" className="panel-proximo">
            <h2 id="proximo-viaje" className="titulo-lado">
              Tu próximo viaje
            </h2>
            {proximos.estado === "cargando" ? <Cargando>Buscando tu próximo viaje…</Cargando> : null}
            {proximos.estado === "error" ? (
              <p className="pista-lado">
                No pudimos cargar tus viajes. Puedes consultarlos en el <Link to="/historial">historial</Link>.
              </p>
            ) : null}
            {proximos.estado === "listo" && !siguiente ? (
              <Tarjeta className="panel-sin-viajes">
                <p>No tienes viajes próximos.</p>
                <p className="pista-lado">Busca un trayecto hacia tu sede o publica el tuyo.</p>
              </Tarjeta>
            ) : null}
            {siguiente ? (
              <>
                <TarjetaViaje
                  viaje={siguiente.datos}
                  estado={siguiente.rol === "pasajero" ? "Tu reserva" : "Tu trayecto"}
                  tono={tonoDeEstado(siguiente.datos.estado_historial)}
                  detalle={detalleDe(siguiente)}
                  acciones={accionDe(siguiente)}
                />
                <Link className="enlace-secundario panel-mas" to="/historial">
                  {restantes.length > 0
                    ? `Ver ${restantes.length === 1 ? "1 viaje próximo más" : `${restantes.length} viajes próximos más`} en el historial`
                    : "Ver todo el historial"}
                </Link>
              </>
            ) : null}
          </section>

          <section aria-label="Acciones principales" className="panel-acciones">
            <Link className="panel-accion panel-accion-principal" to="/trayectos/buscar">
              <span>
                <strong>Buscar trayecto</strong>
                <small>Encuentra quién va a tu sede y reserva tu cupo.</small>
              </span>
              <IconoFlecha />
            </Link>
            {habilitado ? (
              <Link className="panel-accion" to="/trayectos/publicar">
                <span>
                  <strong>Publicar trayecto</strong>
                  <small>Comparte los cupos libres de tu vehículo.</small>
                </span>
                <IconoFlecha />
              </Link>
            ) : (
              <Link className="panel-accion" to="/perfil/vehiculo">
                <span>
                  <strong>¿Tienes vehículo?</strong>
                  <small>Registra tu vehículo y tu licencia para publicar trayectos.</small>
                </span>
                <IconoFlecha />
              </Link>
            )}

            <nav className="panel-gestion" aria-label="Gestionar mis viajes">
              <Link to="/reservas/cancelar">Mis reservas</Link>
              {habilitado ? <Link to="/trayectos/editar">Mis trayectos</Link> : null}
              <Link to="/historial">Historial</Link>
            </nav>
          </section>
        </div>

        <p className="panel-salir">
          <button className="boton-texto" type="button" onClick={salir} disabled={saliendo}>
            {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </p>
      </main>

      <Pie />
    </div>
  );
}

// Reservas y trayectos pendientes, del más cercano al más lejano.
function viajesProximos({ reservas = [], trayectos = [] }) {
  const lista = [
    ...reservas
      .filter((reserva) => reserva.estado_historial === "Pendiente" && reserva.estado === "Confirmada")
      .map((datos) => ({ rol: "pasajero", datos })),
    ...trayectos
      .filter((trayecto) => trayecto.estado_historial === "Pendiente")
      .map((datos) => ({ rol: "conductor", datos })),
  ];
  return lista.sort((a, b) =>
    `${a.datos.fecha} ${a.datos.hora}`.localeCompare(`${b.datos.fecha} ${b.datos.hora}`),
  );
}

function detalleDe({ rol, datos }) {
  if (rol === "pasajero") return `Con ${datos.conductor_nombre} · ${pesos(datos.aporte_sugerido)} COP`;
  const pasajeros = datos.cupos - datos.cupos_disponibles;
  return `${pasajeros} de ${datos.cupos} ${datos.cupos === 1 ? "cupo reservado" : "cupos reservados"} · ${pesos(datos.aporte_sugerido)} COP`;
}

function accionDe({ rol, datos }) {
  const id = encodeURIComponent(datos.id);
  if (rol === "pasajero") {
    return <Boton to={`/reservas/contacto-conductor?reserva=${id}`}>Contactar al conductor</Boton>;
  }
  const pasajeros = datos.cupos - datos.cupos_disponibles;
  if (pasajeros > 0) {
    return <Boton to={`/trayectos/pasajeros/contacto?trayecto=${id}`}>Contactar pasajeros</Boton>;
  }
  return (
    <Boton variante="secundario" to={`/trayectos/editar?trayecto=${id}`}>
      Editar o cancelar
    </Boton>
  );
}
