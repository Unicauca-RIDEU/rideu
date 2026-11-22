import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoAuto, IconoCheck, IconoFlecha } from "../components/Iconos.jsx";
import { cancelarTrayecto, editarTrayecto, obtenerMisTrayectos } from "../services/trayectos.js";
import Pie from "../components/Pie.jsx";
import EnlacesNavegacion from "../components/EnlacesNavegacion.jsx";
import BotonCancelar, { hayCambios } from "../components/BotonCancelar.jsx";
import { datosParaRepetir } from "../services/trayectosFrecuentes.js";

// Edición y cancelación de trayectos (E02-HU05) · /trayectos/editar[?trayecto=<id>]
// El conductor elige uno de sus trayectos vigentes y cambia su fecha, hora o cupos, o lo cancela.
// Si el trayecto tiene reservas confirmadas, la cancelación pide confirmación con el número
// de pasajeros afectados; el backend cancela sus reservas y les avisa por correo.

const formatoPesos = new Intl.NumberFormat("es-CO");

export default function EditarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const seleccionId = parametros.get("trayecto") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando", trayectos: [] });
  const [formulario, setFormulario] = useState({ fecha: "", hora: "", cupos: "" });
  const [errores, setErrores] = useState({});
  const [aviso, setAviso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const nombre = usuario?.nombre || "Tu perfil";
  const trayectos = carga.trayectos;
  const seleccionado = trayectos.find((trayecto) => trayecto.id === seleccionId) ?? null;

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
      <header className="barra perfil-barra">
        <Link to="/panel" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
        <div className="perfil-nav">
          <EnlacesNavegacion activo="Publicar" />
          <span className="perfil-usuario">
            <span className="avatar" aria-hidden="true">
              {iniciales(nombre)}
            </span>
            <strong>{nombre}</strong>
          </span>
        </div>
      </header>

      <main className="perfil-cuerpo">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <h1>Editar o cancelar trayecto</h1>
        <p className="perfil-intro">Mantén tu oferta al día si cambian tus planes.</p>

        {resultado ? (
          <p className="nota-ok nota-publicado" role="status">
            <span className="nota-icono" aria-hidden="true">
              <IconoCheck />
            </span>
            {resultado.mensaje}
          </p>
        ) : null}

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando tus trayectos…</p> : null}

        {carga.estado === "error" ? (
          <p className="aviso aviso-error" role="alert">
            {carga.mensaje || "No se pudieron cargar tus trayectos."}
          </p>
        ) : null}

        {carga.estado === "listo" && trayectos.length === 0 ? (
          <>
            <p className="aviso" role="status">
              {carga.mensaje || "No tienes trayectos vigentes para editar o cancelar."}
            </p>
            <Link className="boton boton-cambiar" to="/trayectos/publicar">
              Publicar trayecto
            </Link>
          </>
        ) : null}

        {carga.estado === "listo" && trayectos.length > 0 ? (
          <div className="publicar-grid">
            <section className="perfil-lado" aria-labelledby="mis-trayectos">
              <h2 id="mis-trayectos" className="titulo-lado">
                Tus trayectos vigentes ({trayectos.length})
              </h2>
              <ul className="buscar-resultados">
                {trayectos.map((trayecto) => (
                  <li key={trayecto.id}>
                    <TarjetaEditable
                      trayecto={trayecto}
                      activo={trayecto.id === seleccionId}
                      onSeleccionar={() => seleccionar(trayecto.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <aside className="perfil-lado">
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
                    {aviso && !confirmacion ? (
                      <p className="aviso aviso-error" role="alert">
                        {aviso}
                      </p>
                    ) : null}
                    <button className="boton boton-guardar" type="submit" disabled={enviando}>
                      <IconoFlecha />
                      {enviando ? "Guardando…" : "Guardar cambios"}
                    </button>
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

                  <section className="tarjeta reservar-detalle" aria-live="polite">
                    <h2>Cancelar trayecto</h2>
                    {confirmacion ? (
                      <div className="aviso aviso-error" role="alertdialog" aria-labelledby="confirmar-cancelacion">
                        <strong id="confirmar-cancelacion">
                          Este trayecto tiene {textoPasajeros(confirmacion.pasajeros)} con reserva confirmada.
                        </strong>
                        <p>
                          Si lo cancelas, {confirmacion.pasajeros === 1 ? "su reserva se cancelará" : "sus reservas se cancelarán"}{" "}
                          y les avisaremos por correo.
                        </p>
                        <button
                          className="boton reservar-enlace"
                          type="button"
                          onClick={() => cancelar(true)}
                          disabled={enviando}
                        >
                          {enviando ? "Cancelando…" : "Sí, cancelar trayecto"}
                        </button>
                        <button
                          className="boton-contorno reservar-enlace"
                          type="button"
                          onClick={() => setConfirmacion(null)}
                          disabled={enviando}
                        >
                          No, mantenerlo
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="pista-lado">
                          {seleccionado.cupos_reservados > 0
                            ? "Se cancelarán las reservas confirmadas y se avisará a los pasajeros."
                            : "El trayecto dejará de aparecer en los resultados de búsqueda."}
                        </p>
                        <button
                          className="boton-contorno reservar-enlace"
                          type="button"
                          onClick={pedirCancelacion}
                          disabled={enviando}
                        >
                          Cancelar trayecto
                        </button>
                      </>
                    )}
                  </section>
                </>
              )}
            </aside>
          </div>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

function TarjetaEditable({ trayecto, activo, onSeleccionar }) {
  const reservas = trayecto.cupos_reservados;
  return (
    <article className="tarjeta tarjeta-previa">
      <div className="previa-cabecera">
        <strong>
          {trayecto.fecha} · {trayecto.hora}
        </strong>
        <p className="chip chip-ok">
          <i />
          {trayecto.estado}
        </p>
      </div>
      <ol className="previa-ruta">
        <li>{trayecto.origen}</li>
        <li>{trayecto.sede_destino}</li>
      </ol>
      <p className="ayuda">
        {trayecto.cupos} {trayecto.cupos === 1 ? "cupo" : "cupos"} · {reservas}{" "}
        {reservas === 1 ? "reserva confirmada" : "reservas confirmadas"} · $
        {formatoPesos.format(trayecto.aporte_sugerido)} COP por persona
      </p>
      <button
        className={activo ? "boton reservar-enlace" : "boton-contorno reservar-enlace"}
        type="button"
        onClick={onSeleccionar}
        aria-pressed={activo}
      >
        {activo ? "Seleccionado" : "Seleccionar"}
      </button>
      <Link
        className="boton-contorno reservar-enlace"
        to="/trayectos/publicar"
        state={{ repetir: datosParaRepetir(trayecto) }}
      >
        Repetir trayecto
      </Link>
    </article>
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

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
