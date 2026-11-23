import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, DialogoConfirmar, EncabezadoPagina, EstadoVacio, Tarjeta } from "@/components/ui";
import { cancelarReserva, obtenerMisReservas } from "../services/reservas.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";
import TarjetaViaje from "../components/TarjetaViaje.jsx";
import { fechaLarga, hora12, pesos } from "../components/formatoTrayecto.js";
import { usarEnfoqueEnMovil, volverDesde } from "../components/navegacionViajes.js";

// Cancelación de reservas (E04-HU08) · /reservas/cancelar[?reserva=<id>]
// El pasajero elige una de sus reservas confirmadas, pulsa «Cancelar reserva» y confirma.
// El backend libera el cupo y avisa al conductor por correo. Si el trayecto ya inició,
// la cancelación no se permite y se explica el motivo.

const MENSAJE_INICIADO = "No puedes cancelar la reserva porque el trayecto ya inició.";

export default function CancelarReserva() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [volver] = useState(() => volverDesde(location.state, "pasajero"));
  const [parametros, setParametros] = useSearchParams();
  const seleccionId = parametros.get("reserva") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando", reservas: [] });
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const detalle = useRef(null);

  const reservas = carga.reservas;
  const seleccionada = reservas.find((reserva) => reserva.id === seleccionId) ?? null;
  usarEnfoqueEnMovil(detalle, seleccionada?.id);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMisReservas();
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!respuesta.ok) {
        setCarga({ estado: "error", reservas: [], mensaje: respuesta.mensaje });
        return;
      }
      setCarga({ estado: "listo", reservas: respuesta.reservas ?? [], mensaje: respuesta.mensaje });
    } catch {
      setCarga({
        estado: "error",
        reservas: [],
        mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      });
    }
  }, [navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setConfirmando(false);
    setAviso(null);
  }, [seleccionId]);

  function seleccionar(id) {
    setResultado(null);
    setParametros(id ? { reserva: id } : {});
  }

  // Criterio 3: con el trayecto iniciado no se pide confirmación; se explica por qué no se puede.
  function pedirCancelacion() {
    if (!seleccionada || enviando) return;
    if (seleccionada.iniciado) {
      setAviso(MENSAJE_INICIADO);
      return;
    }
    setAviso(null);
    setConfirmando(true);
  }

  async function confirmar() {
    if (!seleccionada) return;
    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await cancelarReserva(seleccionada.id);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setConfirmando(false);
      if (respuesta.ok) {
        setResultado({ mensaje: respuesta.mensaje, trayecto: respuesta.trayecto });
        setParametros({});
        await cargar();
        return;
      }
      setAviso(respuesta.mensaje || "No se pudo cancelar la reserva.");
      await cargar();
    } catch {
      setAviso("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Cancelar reserva"
          intro="Si no vas a viajar, libera tu cupo para otro compañero."
          volver={volver}
        />

        {resultado ? (
          <Aviso tono="exito" icono>
            {resultado.mensaje} {textoDisponibles(resultado.trayecto)}
          </Aviso>
        ) : null}

        {carga.estado === "cargando" ? <Cargando>Cargando tus reservas…</Cargando> : null}

        {carga.estado === "error" ? (
          <Aviso tono="error">{carga.mensaje || "No se pudieron cargar tus reservas."}</Aviso>
        ) : null}

        {carga.estado === "listo" && reservas.length === 0 ? (
          <EstadoVacio
            mensaje={carga.mensaje || "No tienes reservas confirmadas."}
            accion={{ texto: "Buscar trayecto", to: "/trayectos/buscar" }}
          />
        ) : null}

        {carga.estado === "listo" && reservas.length > 0 ? (
          <div className="publicar-grid">
            <section className="perfil-lado" aria-labelledby="mis-reservas">
              <h2 id="mis-reservas" className="titulo-lado">
                Tus reservas confirmadas ({reservas.length})
              </h2>
              <ul className="buscar-resultados lista-seleccion">
                {reservas.map((reserva) => {
                  const activa = reserva.id === seleccionId;
                  return (
                    <li key={reserva.id}>
                      <TarjetaViaje
                        viaje={reserva}
                        estado={reserva.iniciado ? "Iniciado" : "Confirmada"}
                        tono={reserva.iniciado ? "neutro" : "exito"}
                        detalle={`${reserva.conductor_nombre} · 1 cupo · ${pesos(reserva.aporte_sugerido)} COP`}
                        activa={activa}
                        acciones={
                          <Boton
                            variante={activa ? "primario" : "secundario"}
                            onClick={() => seleccionar(reserva.id)}
                            aria-pressed={activa}
                          >
                            {activa ? "Seleccionada" : "Seleccionar"}
                          </Boton>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="perfil-lado lado-fijo" ref={detalle}>
              {!seleccionada ? (
                <p className="pista-lado">Selecciona la reserva que quieres cancelar.</p>
              ) : (
                <Tarjeta titulo="Reserva seleccionada" className="reservar-detalle" aria-live="polite">
                  <p>
                    <strong>
                      {seleccionada.origen} → {seleccionada.sede_destino}
                    </strong>
                  </p>
                  <p>
                    {fechaLarga(seleccionada.fecha)} · Salida a las {hora12(seleccionada.hora)}
                  </p>
                  <p>Conductor: {seleccionada.conductor_nombre}</p>

                  {aviso ? <Aviso tono="error">{aviso}</Aviso> : null}

                  <Boton variante="peligro" onClick={pedirCancelacion} disabled={enviando}>
                    Cancelar reserva
                  </Boton>
                  <p className="pista-lado">Te pediremos confirmación antes de cancelarla.</p>
                </Tarjeta>
              )}
            </aside>
          </div>
        ) : null}

        <DialogoConfirmar
          abierto={confirmando}
          titulo="¿Seguro que quieres cancelar esta reserva?"
          textoConfirmar="Sí, cancelar reserva"
          textoEnviando="Cancelando…"
          textoCancelar="No, mantenerla"
          peligro
          enviando={enviando}
          onConfirmar={confirmar}
          onCancelar={() => setConfirmando(false)}
        >
          <p>Tu cupo quedará libre para otro pasajero y avisaremos al conductor por correo.</p>
        </DialogoConfirmar>
      </main>

      <Pie />
    </div>
  );
}

function textoDisponibles(trayecto) {
  if (!trayecto) return "";
  const disponibles = trayecto.cupos_disponibles;
  return `El trayecto ahora tiene ${disponibles} ${disponibles === 1 ? "cupo disponible" : "cupos disponibles"}.`;
}
