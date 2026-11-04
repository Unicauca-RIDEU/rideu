import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { IconoAuto, IconoCheck, IconoFlecha } from "../components/Iconos.jsx";
import { obtenerDatosPublicacion, publicarTrayecto } from "../services/trayectos.js";

const NAV = ["Inicio", "Buscar", "Publicar", "Historial"];
const RUTA_VEHICULO = "/perfil/vehiculo";
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const formatoPesos = new Intl.NumberFormat("es-CO");

const vacio = {
  origen: "",
  sedeDestinoId: "",
  fecha: "",
  hora: "",
  cupos: "",
  aporteSugerido: "",
};

export default function PublicarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [carga, setCarga] = useState({ estado: "cargando" });
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [publicado, setPublicado] = useState(null);

  useEffect(() => {
    let activo = true;
    obtenerDatosPublicacion()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok) {
          setCarga({ estado: "error", mensaje: respuesta.mensaje });
          return;
        }
        setCarga({ estado: "listo", ...respuesta });
        if (respuesta.habilitado) {
          setDatos((actual) => ({ ...actual, cupos: String(respuesta.cuposMaximos) }));
        }
      })
      .catch(() => {
        if (activo) setCarga({ estado: "error" });
      });
    return () => {
      activo = false;
    };
  }, [navigate]);

  const nombre = carga.conductor?.nombre || usuario?.nombre || "Tu perfil";
  const siglas = iniciales(nombre);
  const bloqueado = carga.estado === "listo" && !carga.habilitado;
  const cuposMaximos = carga.cuposMaximos ?? 0;
  const sedes = carga.sedes ?? [];

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
    setMensaje("");
  }

  function ajustarCupos(delta) {
    const actual = Number.parseInt(datos.cupos, 10);
    const base = Number.isInteger(actual) ? actual : 0;
    const siguiente = Math.min(Math.max(base + delta, 1), Math.max(cuposMaximos, 1));
    setDatos((previo) => ({ ...previo, cupos: String(siguiente) }));
    setErrores((previo) => ({ ...previo, cupos: "" }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();
    if (bloqueado) {
      navigate(RUTA_VEHICULO);
      return;
    }

    const validacion = validar(datos, cuposMaximos);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      setMensaje(validacion.mensaje);
      return;
    }

    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await publicarTrayecto(validacion.datos);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (respuesta.status === 403) {
        setCarga((actual) => ({
          ...actual,
          habilitado: false,
          motivo: respuesta.motivo,
          mensaje: respuesta.mensaje,
          redireccion: respuesta.redireccion,
        }));
        return;
      }
      if (!respuesta.ok) {
        if (Number.isInteger(respuesta.cuposMaximos)) {
          setCarga((actual) => ({ ...actual, cuposMaximos: respuesta.cuposMaximos }));
        }
        setErrores(erroresPorCampo(respuesta.errores));
        setMensaje(respuesta.mensaje || "No se pudo publicar el trayecto.");
        return;
      }
      setErrores({});
      setPublicado(respuesta.trayecto);
    } catch {
      setMensaje("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  function publicarOtro() {
    setPublicado(null);
    setDatos({ ...vacio, cupos: String(cuposMaximos) });
    setErrores({});
    setMensaje("");
  }

  const sedeElegida = sedes.find((sede) => String(sede.id) === String(datos.sedeDestinoId));
  const vistaPrevia = publicado
    ? {
        fecha: publicado.fecha,
        hora: publicado.hora,
        origen: publicado.origen,
        destino: publicado.sede_destino,
        cupos: publicado.cupos,
        aporte: publicado.aporte_sugerido,
      }
    : {
        fecha: datos.fecha,
        hora: datos.hora,
        origen: datos.origen.trim(),
        destino: sedeElegida?.nombre,
        cupos: enteroOVacio(datos.cupos),
        aporte: aporteNumerico(datos.aporteSugerido),
      };

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
          {NAV.map((item) => (
            <span key={item} className={item === "Publicar" ? "nav-activo" : undefined}>
              {item}
            </span>
          ))}
          <span className="perfil-usuario">
            <span className="avatar" aria-hidden="true">
              {siglas}
            </span>
            <strong>{nombre}</strong>
          </span>
        </div>
      </header>

      <main className="perfil-cuerpo">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <p className="perfil-ruta">/trayectos/publicar</p>
        <h1>Publicar trayecto</h1>
        <p className="perfil-intro">Tu camino a la U puede ser el de alguien más.</p>

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando tus datos…</p> : null}
        {carga.estado === "error" ? (
          <p className="aviso aviso-error" role="alert">
            {carga.mensaje || "No se pudieron cargar los datos para publicar. Inténtalo de nuevo."}
          </p>
        ) : null}

        {carga.estado === "listo" ? (
          <div className="publicar-grid">
            <form className="tarjeta publicar-form" onSubmit={enviar} noValidate>
              <h2>Detalles del trayecto</h2>
              <p className="pista">
                {bloqueado
                  ? "Conductor no habilitado. No puedes publicar trayectos."
                  : "Todos los campos son obligatorios."}
              </p>

              {publicado ? (
                <p className="nota-ok nota-publicado" role="status">
                  <span className="nota-icono" aria-hidden="true">
                    <IconoCheck />
                  </span>
                  Trayecto publicado. Ya está disponible para los pasajeros.
                </p>
              ) : null}
              {mensaje && !publicado ? (
                <p className="aviso aviso-error" role="alert">
                  {mensaje}
                </p>
              ) : null}

              <fieldset className="publicar-campos" disabled={bloqueado || Boolean(publicado) || enviando}>
                <Campo etiqueta="Origen" error={errores.origen}>
                  <input
                    name="origen"
                    placeholder="Ej.: Bello Horizonte"
                    value={datos.origen}
                    onChange={cambiar}
                    aria-invalid={Boolean(errores.origen)}
                  />
                </Campo>

                <Campo etiqueta="Sede de destino" error={errores.sedeDestinoId}>
                  <select
                    name="sedeDestinoId"
                    value={datos.sedeDestinoId}
                    onChange={cambiar}
                    aria-invalid={Boolean(errores.sedeDestinoId)}
                  >
                    <option value="">Selecciona la sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>

                <div className="campos-fila">
                  <Campo etiqueta="Fecha" error={errores.fecha}>
                    <input
                      type="date"
                      name="fecha"
                      value={datos.fecha}
                      onChange={cambiar}
                      aria-invalid={Boolean(errores.fecha)}
                    />
                  </Campo>
                  <Campo etiqueta="Hora" error={errores.hora}>
                    <input
                      type="time"
                      name="hora"
                      value={datos.hora}
                      onChange={cambiar}
                      aria-invalid={Boolean(errores.hora)}
                    />
                  </Campo>
                </div>

                <Campo
                  etiqueta="Cupos"
                  extra={cuposMaximos > 0 ? `Máx. ${cuposMaximos}` : null}
                  error={errores.cupos}
                  claseCaja="caja-cupos"
                >
                  <button
                    type="button"
                    className="paso"
                    aria-label="Quitar un cupo"
                    onClick={() => ajustarCupos(-1)}
                  >
                    −
                  </button>
                  <input
                    name="cupos"
                    inputMode="numeric"
                    value={datos.cupos}
                    onChange={cambiar}
                    aria-invalid={Boolean(errores.cupos)}
                  />
                  <button
                    type="button"
                    className="paso"
                    aria-label="Agregar un cupo"
                    onClick={() => ajustarCupos(1)}
                  >
                    +
                  </button>
                </Campo>

                <Campo etiqueta="Aporte sugerido por persona" error={errores.aporteSugerido} sufijo="COP">
                  <input
                    name="aporteSugerido"
                    inputMode="numeric"
                    placeholder="Ej.: 2.500"
                    value={datos.aporteSugerido}
                    onChange={cambiar}
                    aria-invalid={Boolean(errores.aporteSugerido)}
                  />
                </Campo>
              </fieldset>

              <p className="pista">
                {bloqueado
                  ? carga.mensaje
                  : "Un aporte para compartir los gastos del camino. Valores de referencia: $2.000 a $5.000 COP."}
              </p>

              {bloqueado ? (
                <Link className="boton boton-guardar" to={carga.redireccion || RUTA_VEHICULO}>
                  <IconoFlecha />
                  Ir a registrar vehículo
                </Link>
              ) : publicado ? (
                <button className="boton boton-guardar" type="button" onClick={publicarOtro}>
                  <IconoFlecha />
                  Publicar otro trayecto
                </button>
              ) : (
                <button className="boton boton-guardar" type="submit" disabled={enviando}>
                  <IconoFlecha />
                  {enviando ? "Publicando…" : "Publicar trayecto"}
                </button>
              )}
            </form>

            <aside className="perfil-lado">
              <section className="tarjeta tarjeta-persona">
                <div className="persona-fila">
                  <div className="persona">
                    <span className="avatar" aria-hidden="true">
                      {siglas}
                    </span>
                    <span>
                      <strong>{nombre}</strong>
                      <small>Como conductor</small>
                    </span>
                  </div>
                  <p className={carga.habilitado ? "chip chip-ok" : "chip"}>
                    <i />
                    {carga.habilitado ? "Habilitado" : "No habilitado"}
                  </p>
                </div>
                {carga.vehiculo ? (
                  <div>
                    <p className="resumen-vehiculo">{resumenVehiculo(carga.vehiculo)}</p>
                    <p className="resumen-vehiculo">
                      Capacidad: {carga.vehiculo.capacidadPasajeros} pasajeros
                    </p>
                  </div>
                ) : (
                  <p className="resumen-vehiculo">Sin vehículo registrado.</p>
                )}
              </section>

              <h2 className="titulo-lado">Vista previa de tu tarjeta</h2>
              <TarjetaPrevia
                vista={vistaPrevia}
                nombre={nombre}
                siglas={siglas}
                publicado={Boolean(publicado)}
              />
              <p className="pista-lado">
                {textoVistaPrevia({ bloqueado, publicado, errores, vista: vistaPrevia, cuposMaximos, carga })}
              </p>

              <section className="consejo">
                <strong>Comparte un punto de encuentro claro</strong>
                <span>
                  Indica una referencia conocida de Popayán y llega unos minutos antes de la salida.
                </span>
              </section>
            </aside>
          </div>
        ) : null}
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}

function Campo({ etiqueta, extra, error, sufijo, claseCaja = "", children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">
        {etiqueta}
        {extra ? <small className="campo-extra">{extra}</small> : null}
      </span>
      <span className={["caja", claseCaja, error ? "caja-error" : ""].filter(Boolean).join(" ")}>
        {children}
        {sufijo ? <em aria-hidden="true">{sufijo}</em> : null}
      </span>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function TarjetaPrevia({ vista, nombre, siglas, publicado }) {
  const completa = vista.fecha && vista.hora;
  return (
    <article className="tarjeta tarjeta-previa" aria-label="Vista previa del trayecto">
      <div className="previa-cabecera">
        <strong>{completa ? fechaCorta(vista.fecha, vista.hora) : "Fecha y hora pendientes"}</strong>
        <p className={publicado ? "chip chip-ok" : "chip"}>
          <i />
          {publicado ? "Disponible" : "Vista previa"}
        </p>
      </div>
      <ol className="previa-ruta">
        <li>{vista.origen || "Origen pendiente"}</li>
        <li>{vista.destino || "Destino pendiente"}</li>
      </ol>
      <div className="previa-pie">
        <span className="avatar" aria-hidden="true">
          {siglas}
        </span>
        <span className="previa-conductor">
          <strong>{nombre}</strong>
          <small>
            {Number.isInteger(vista.cupos) ? `${vista.cupos} cupos` : "Cupos por confirmar"} ·{" "}
            {publicado ? "Disponible" : "Sin publicar"}
          </small>
        </span>
        <span className="previa-precio">
          <strong>{Number.isInteger(vista.aporte) ? `$${formatoPesos.format(vista.aporte)}` : "Por definir"}</strong>
          <small>COP / persona</small>
        </span>
      </div>
    </article>
  );
}

function textoVistaPrevia({ bloqueado, publicado, errores, vista, cuposMaximos, carga }) {
  if (bloqueado) {
    return "Publicación bloqueada. Debes habilitar tu perfil de conductor antes de publicar.";
  }
  if (publicado) {
    return "Tu trayecto ya está disponible para los pasajeros.";
  }
  if (errores.cupos) {
    return `No puedes publicar: los cupos deben ser mayores que 0 y menores o iguales a ${cuposMaximos}.`;
  }
  const completa =
    vista.origen && vista.destino && vista.fecha && vista.hora && vista.cupos !== "" && vista.aporte !== "";
  if (!completa) {
    return "Completa los campos obligatorios para generar la vista previa de tu trayecto.";
  }
  const capacidad = carga.vehiculo?.capacidadPasajeros;
  return `Así verá la comunidad tu trayecto al publicarlo. Ofreces ${vista.cupos} cupos de ${capacidad} pasajeros.`;
}

function validar(datos, cuposMaximos) {
  const errores = {};
  const origen = datos.origen.trim().replace(/\s+/g, " ");
  const sedeDestinoId = Number.parseInt(datos.sedeDestinoId, 10);
  const cupos = enteroOVacio(datos.cupos);
  const aporte = aporteNumerico(datos.aporteSugerido);

  if (!origen) errores.origen = "Este campo es obligatorio";
  if (!datos.sedeDestinoId) errores.sedeDestinoId = "Este campo es obligatorio";
  if (!datos.fecha) errores.fecha = "Este campo es obligatorio";
  if (!datos.hora) errores.hora = "Este campo es obligatorio";
  if (datos.fecha && datos.hora && !esFuturaEnColombia(datos.fecha, datos.hora)) {
    errores.fecha = "La fecha y la hora de salida deben ser posteriores al momento actual.";
  }

  if (!datos.cupos.trim()) errores.cupos = "Este campo es obligatorio";
  else if (!Number.isInteger(cupos)) errores.cupos = "Los cupos deben ser un número entero.";
  else if (cupos <= 0) errores.cupos = "Ingresa al menos 1 cupo.";
  else if (cupos > cuposMaximos) errores.cupos = `La capacidad máxima es ${cuposMaximos}.`;

  if (!datos.aporteSugerido.trim()) errores.aporteSugerido = "Este campo es obligatorio";
  else if (!Number.isInteger(aporte)) {
    errores.aporteSugerido = "El aporte sugerido debe ser un número entero mayor o igual a 0.";
  }

  const campos = Object.keys(errores);
  return {
    ok: campos.length === 0,
    errores,
    mensaje: campos.length === 1 ? errores[campos[0]] : "Completa los campos obligatorios.",
    datos: {
      origen,
      sedeDestinoId,
      fecha: datos.fecha,
      hora: datos.hora,
      cupos,
      aporteSugerido: aporte,
    },
  };
}

// Colombia usa UTC-5 todo el año.
function esFuturaEnColombia(fecha, hora) {
  return new Date(`${fecha}T${hora}:00-05:00`).getTime() > Date.now();
}

function enteroOVacio(valor) {
  const texto = String(valor ?? "").trim();
  if (!/^-?\d+$/.test(texto)) return texto === "" ? "" : Number.NaN;
  return Number(texto);
}

// Acepta "2500", "2.500" o "$2.500".
function aporteNumerico(valor) {
  const texto = String(valor ?? "").trim().replace(/^\$\s*/, "");
  if (texto === "") return "";
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(texto)) return Number.NaN;
  return Number(texto.replace(/\./g, ""));
}

function fechaCorta(fecha, hora) {
  const [, mes, dia] = fecha.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${dia} ${MESES[mes - 1]} · ${hora12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

function resumenVehiculo(vehiculo) {
  const modelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ");
  return [modelo, vehiculo.color, vehiculo.placa].filter(Boolean).join(" · ");
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function erroresPorCampo(errores = []) {
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}
