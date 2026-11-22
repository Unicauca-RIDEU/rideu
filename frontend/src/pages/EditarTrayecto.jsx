import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, DialogoConfirmar, EncabezadoPagina, EstadoVacio, Tarjeta } from "@/components/ui";
import { IconoFlecha } from "../components/Iconos.jsx";
import { cancelarTrayecto, editarTrayecto, obtenerMisTrayectos } from "../services/trayectos.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";
import BotonCancelar, { hayCambios } from "../components/BotonCancelar.jsx";
import TarjetaViaje from "../components/TarjetaViaje.jsx";
import { pesos } from "../components/formatoTrayecto.js";
import { usarEnfoqueEnMovil, volverDesde } from "../components/navegacionViajes.js";
import { datosParaRepetir } from "../services/trayectosFrecuentes.js";

// Edición y cancelación de trayectos (E02-HU05) · /trayectos/editar[?trayecto=<id>]
// El conductor elige uno de sus trayectos vigentes y cambia su fecha, hora o cupos, o lo cancela.
// Si el trayecto tiene reservas confirmadas, la cancelación pide confirmación con el número
// de pasajeros afectados; el backend cancela sus reservas y les avisa por correo.

export default function EditarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [volver] = useState(() => volverDesde(location.state, "conductor"));
  const detalle = useRef(null);
  const [parametros, setParametros] = useSearchParams();
  const seleccionId = parametros.get("trayecto") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando", trayectos: [] });
  const [formulario, setFormulario] = useState({ fecha: "", hora: "", cupos: "" });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const trayectos = carga.trayectos;
  const seleccionado = trayectos.find((trayecto) => trayecto.id === seleccionId) ?? null;
  usarEnfoqueEnMovil(detalle, seleccionado?.id);

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMisTrayectos();
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!respuesta.ok) {
        setCarga({ estado: "error", trayectos: [], mensaje: respuesta.mensaje });
        return;
      }
      setCarga({ estado: "listo", trayectos: respuesta.trayectos ?? [], mensaje: respuesta.mensaje });
    } catch {
      setCarga({
        estado: "error",
        trayectos: [],
        mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      });
    }
  }, [navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al elegir otro trayecto, el formulario arranca con sus datos actuales.
  useEffect(() => {
    if (seleccionado) {
      setFormulario({
        fecha: seleccionado.fecha,
        hora: seleccionado.hora,
        cupos: String(seleccionado.cupos),
      });
    }
    setErrores({});
    setAviso(null);
    setConfirmacion(null);
    // Solo se reinicia al cambiar de trayecto, no cada vez que se recarga la lista.
  }, [seleccionId, seleccionado?.id]);

  function seleccionar(id) {
    setResultado(null);
    setParametros(id ? { trayecto: id } : {});
  }

  function cambiar(evento) {
    const { name, value } = evento.target;
    setFormulario((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: undefined }));
  }

  async function guardar(evento) {
    evento.preventDefault();
    if (!seleccionado || enviando) return;
    setEnviando(true);
    setAviso(null);
    setResultado(null);
    try {
      const cupos = formulario.cupos === "" ? "" : Number(formulario.cupos);
      const respuesta = await editarTrayecto(seleccionado.id, {
        fecha: formulario.fecha,
        hora: formulario.hora,
        cupos,
      });
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (respuesta.ok) {
        setResultado({ tipo: "editado", mensaje: respuesta.mensaje });
        await cargar();
        return;
      }
      setErrores(erroresPorCampo(respuesta.errores));
      setAviso(respuesta.mensaje || "No se pudieron guardar los cambios.");
      if (respuesta.status === 404 || respuesta.codigo === "TRAYECTO_CANCELADO" || respuesta.codigo === "TRAYECTO_INICIADO") {
        await cargar();
      }
    } catch {
      setAviso("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  // Criterio 1: sin reservas, «Cancelar trayecto» cancela de inmediato.
  // Criterio 2: con reservas, primero se muestra cuántos pasajeros se verán afectados.
  function pedirCancelacion() {
    if (!seleccionado || enviando) return;
    setAviso(null);
    if (seleccionado.cupos_reservados > 0) {
      setConfirmacion({ pasajeros: seleccionado.cupos_reservados });
      return;
    }
    cancelar(false);
  }

  async function cancelar(confirmar) {
    if (!seleccionado) return;
    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await cancelarTrayecto(seleccionado.id, { confirmar });
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (respuesta.ok) {
        setConfirmacion(null);
        setResultado({ tipo: "cancelado", mensaje: respuesta.mensaje });
        setParametros({});
        await cargar();
        return;
      }
      if (respuesta.codigo === "CONFIRMACION_REQUERIDA") {
        // Alguien reservó mientras tanto: se pide confirmar con el número actualizado.
        setConfirmacion({ pasajeros: respuesta.pasajerosAfectados });
        await cargar();
        return;
      }
      setConfirmacion(null);
      setAviso(respuesta.mensaje || "No se pudo cancelar el trayecto.");
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
          titulo="Editar o cancelar trayecto"
          intro="Mantén tu oferta al día si cambian tus planes."
          volver={volver}
        />

        {resultado ? (
          <Aviso tono="exito" icono>
            {resultado.mensaje}
          </Aviso>
        ) : null}

        {carga.estado === "cargando" ? <Cargando>Cargando tus trayectos…</Cargando> : null}

        {carga.estado === "error" ? (
          <Aviso tono="error">{carga.mensaje || "No se pudieron cargar tus trayectos."}</Aviso>
        ) : null}

        {carga.estado === "listo" && trayectos.length === 0 ? (
          <EstadoVacio
            mensaje={carga.mensaje || "No tienes trayectos vigentes para editar o cancelar."}
            accion={{ texto: "Publicar trayecto", to: "/trayectos/publicar" }}
          />
        ) : null}

        {carga.estado === "listo" && trayectos.length > 0 ? (
          <div className="publicar-grid">
            <section className="perfil-lado" aria-labelledby="mis-trayectos">
              <h2 id="mis-trayectos" className="titulo-lado">
                Tus trayectos vigentes ({trayectos.length})
              </h2>
              <ul className="buscar-resultados lista-seleccion">
                {trayectos.map((trayecto) => {
                  const activo = trayecto.id === seleccionId;
                  const reservas = trayecto.cupos_reservados;
                  return (
                    <li key={trayecto.id}>
                      <TarjetaViaje
                        viaje={trayecto}
                        estado={trayecto.estado}
                        tono="exito"
                        detalle={`${reservas} de ${trayecto.cupos} ${trayecto.cupos === 1 ? "cupo reservado" : "cupos reservados"} · ${pesos(trayecto.aporte_sugerido)} COP`}
                        activa={activo}
                        acciones={
                          <>
                            <Boton
                              variante={activo ? "primario" : "secundario"}
                              onClick={() => seleccionar(trayecto.id)}
                              aria-pressed={activo}
                            >
                              {activo ? "Seleccionado" : "Seleccionar"}
                            </Boton>
                            <Link
                              className="enlace-secundario"
                              to="/trayectos/publicar"
                              state={{ repetir: datosParaRepetir(trayecto) }}
                            >
                              Repetir trayecto
                            </Link>
                          </>
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="perfil-lado lado-fijo" ref={detalle}>
              {!seleccionado ? (
                <p className="pista-lado">Selecciona un trayecto para editarlo o cancelarlo.</p>
              ) : (
                <>
                  <form className="tarjeta publicar-form" onSubmit={guardar} noValidate>
                    <h2>Editar trayecto</h2>
                    <p className="pista-lado">
                      {seleccionado.origen} → {seleccionado.sede_destino}
                    </p>
                    <fieldset className="publicar-campos" disabled={enviando}>
                      <Campo etiqueta="Fecha" error={errores.fecha}>
                        <input name="fecha" type="date" value={formulario.fecha} onChange={cambiar} required />
                      </Campo>
                      <Campo etiqueta="Hora de salida" error={errores.hora}>
                        <input name="hora" type="time" value={formulario.hora} onChange={cambiar} required />
                      </Campo>
                      <Campo
                        etiqueta="Cupos ofrecidos"
                        extra={textoLimites(seleccionado)}
                        error={errores.cupos}
                      >
                        <input
                          name="cupos"
                          type="number"
                          min={Math.max(1, seleccionado.cupos_reservados)}
                          max={seleccionado.cupos_maximos}
                          step="1"
                          value={formulario.cupos}
                          onChange={cambiar}
                          required
                        />
                      </Campo>
                    </fieldset>
                    {aviso && !confirmacion ? <Aviso tono="error">{aviso}</Aviso> : null}
                    <Boton
                      className="boton-guardar"
                      type="submit"
                      icono={<IconoFlecha />}
                      cargando={enviando}
                      textoCargando="Guardando…"
                    >
                      Guardar cambios
                    </Boton>
                    <BotonCancelar
                      hayCambios={hayCambios(formulario, {
                        fecha: seleccionado.fecha,
                        hora: seleccionado.hora,
                        cupos: seleccionado.cupos,
                      })}
                      onCancelar={() => seleccionar("")}
                      disabled={enviando}
                    >
                      Cancelar edición
                    </BotonCancelar>
                  </form>

                  <Tarjeta titulo="Cancelar trayecto" className="reservar-detalle zona-peligro" aria-live="polite">
                    <p className="pista-lado">
                      {seleccionado.cupos_reservados > 0
                        ? "Se cancelarán las reservas confirmadas y se avisará a los pasajeros."
                        : "El trayecto dejará de aparecer en los resultados de búsqueda."}
                    </p>
                    <Boton
                      variante="secundario"
                      className="boton-contorno-peligro"
                      onClick={pedirCancelacion}
                      disabled={enviando}
                    >
                      Cancelar trayecto
                    </Boton>
                  </Tarjeta>
                </>
              )}
            </aside>
          </div>
        ) : null}

        {/* Criterio 2: con reservas confirmadas se indica cuántos pasajeros se verán afectados. */}
        <DialogoConfirmar
          abierto={Boolean(confirmacion)}
          titulo={
            confirmacion
              ? `Este trayecto tiene ${textoPasajeros(confirmacion.pasajeros)} con reserva confirmada.`
              : ""
          }
          textoConfirmar="Sí, cancelar trayecto"
          textoEnviando="Cancelando…"
          textoCancelar="No, mantenerlo"
          peligro
          enviando={enviando}
          onConfirmar={() => cancelar(true)}
          onCancelar={() => setConfirmacion(null)}
        >
          {confirmacion ? (
            <p>
              Si lo cancelas, {confirmacion.pasajeros === 1 ? "su reserva se cancelará" : "sus reservas se cancelarán"} y
              les avisaremos por correo.
            </p>
          ) : null}
        </DialogoConfirmar>
      </main>

      <Pie />
    </div>
  );
}

function Campo({ etiqueta, extra, error, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">
        {etiqueta}
        {extra ? <small className="campo-extra">{extra}</small> : null}
      </span>
      <span className={["caja", error ? "caja-error" : ""].filter(Boolean).join(" ")}>{children}</span>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function erroresPorCampo(errores) {
  const porCampo = {};
  for (const error of errores ?? []) {
    if (!porCampo[error.campo]) porCampo[error.campo] = error.mensaje;
  }
  return porCampo;
}

function textoLimites(trayecto) {
  const minimo = Math.max(1, trayecto.cupos_reservados);
  return `Entre ${minimo} y ${trayecto.cupos_maximos}`;
}

function textoPasajeros(total) {
  return total === 1 ? "1 pasajero" : `${total} pasajeros`;
}
