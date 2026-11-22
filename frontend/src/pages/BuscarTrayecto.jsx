import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, EncabezadoPagina } from "@/components/ui";
import { IconoFlecha } from "../components/Iconos.jsx";
import TarjetaTrayecto from "../components/TarjetaTrayecto.jsx";
import { fechaLarga } from "../components/formatoTrayecto.js";
import { buscarTrayectos, obtenerSedes } from "../services/trayectos.js";
import {
  alternarFavorita,
  busquedasFavoritas,
  busquedasRecientes,
  esFavorita,
  registrarBusqueda,
} from "../services/trayectosFrecuentes.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Búsqueda de trayectos (E03-HU06) · /trayectos/buscar
// Los filtros viven en la URL para conservarlos al recargar o al volver desde otra pantalla.

// Cada cuánto se repite la búsqueda en segundo plano para mostrar los cupos al día (E04-HU07).
const INTERVALO_ACTUALIZACION_MS = 10000;

export default function BuscarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const selectorSede = useRef(null);
  const [sedes, setSedes] = useState([]);
  const [filtros, setFiltros] = useState(() => ({
    sedeDestinoId: parametros.get("sedeDestinoId") ?? "",
    fecha: parametros.get("fecha") ?? hoyEnColombia(),
    horaDesde: parametros.get("horaDesde") ?? "",
  }));
  const [errores, setErrores] = useState({});
  const [busqueda, setBusqueda] = useState({ estado: "inicial" });
  const [intento, setIntento] = useState(0);
  const [recientes, setRecientes] = useState(() => busquedasRecientes(usuario?.id));
  const [favoritas, setFavoritas] = useState(() => busquedasFavoritas(usuario?.id));

  const consulta = parametros.toString();

  useEffect(() => {
    let activo = true;
    obtenerSedes()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) navigate("/login", { replace: true });
        else if (respuesta.ok) setSedes(respuesta.sedes);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [navigate]);

  // Cada vez que cambian los filtros de la URL se repite la búsqueda.
  useEffect(() => {
    const actuales = Object.fromEntries(new URLSearchParams(consulta));
    if (!actuales.sedeDestinoId || !actuales.fecha || !actuales.horaDesde) return undefined;

    let activo = true;
    setBusqueda({ estado: "buscando" });
    buscarTrayectos(actuales)
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok) {
          setErrores(erroresPorCampo(respuesta.errores));
          setBusqueda({ estado: "error", mensaje: respuesta.mensaje || "No se pudo buscar." });
          return;
        }
        setBusqueda({ estado: "listo", ...respuesta });
      })
      .catch(() => {
        if (activo) {
          setBusqueda({
            estado: "error",
            mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
          });
        }
      });
    // Mientras la pantalla siga abierta, la búsqueda se repite sin borrar los resultados:
    // así los cupos que otras personas reservan se reflejan sin recargar la página.
    const temporizador = setInterval(() => {
      buscarTrayectos(actuales)
        .then((respuesta) => {
          if (activo && respuesta.ok) setBusqueda({ estado: "listo", ...respuesta });
        })
        .catch(() => {});
    }, INTERVALO_ACTUALIZACION_MS);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [consulta, intento, navigate]);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
  }

  function buscar(evento) {
    evento.preventDefault();
    const faltantes = {};
    if (!filtros.sedeDestinoId) faltantes.sedeDestinoId = "Selecciona la sede";
    if (!filtros.fecha) faltantes.fecha = "Selecciona la fecha";
    if (!filtros.horaDesde) faltantes.horaDesde = "Selecciona la hora";
    if (Object.keys(faltantes).length > 0) {
      setErrores(faltantes);
      return;
    }
    lanzar(filtros);
  }

  // Ejecuta la búsqueda y la recuerda entre las recientes de este usuario.
  function lanzar(valores) {
    setErrores({});
    setFiltros(valores);
    setParametros(valores);
    setIntento((actual) => actual + 1);
    setRecientes(registrarBusqueda(usuario?.id, atajoDe(valores, sedes)));
  }

  // Un atajo conserva la sede y la hora; la fecha es la que esté elegida en el formulario.
  function usarAtajo(atajo) {
    lanzar({
      sedeDestinoId: String(atajo.sedeDestinoId),
      fecha: filtros.fecha || hoyEnColombia(),
      horaDesde: atajo.horaDesde,
    });
  }

  function cambiarFavorita() {
    const actuales = Object.fromEntries(new URLSearchParams(consulta));
    if (!actuales.sedeDestinoId || !actuales.horaDesde) return;
    setFavoritas(alternarFavorita(usuario?.id, atajoDe(actuales, sedes)));
  }

  const busquedaActual = Object.fromEntries(new URLSearchParams(consulta));
  const actualEsFavorita =
    Boolean(busquedaActual.sedeDestinoId && busquedaActual.horaDesde) && esFavorita(favoritas, busquedaActual);

  function cambiarFiltros() {
    selectorSede.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Buscar" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Buscar trayecto"
          intro="Encuentra personas que comparten tu camino a la U."
          volver={{ texto: "Volver al panel", to: "/panel" }}
        />

        <form className="tarjeta buscar-filtros" onSubmit={buscar} noValidate>
          <h2>¿A qué sede vas?</h2>
          <div className="buscar-campos">
            <Campo etiqueta="Sede de destino" error={errores.sedeDestinoId}>
              <select
                ref={selectorSede}
                name="sedeDestinoId"
                value={filtros.sedeDestinoId}
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
            <Campo etiqueta="Fecha" error={errores.fecha}>
              <input
                type="date"
                name="fecha"
                value={filtros.fecha}
                onChange={cambiar}
                aria-invalid={Boolean(errores.fecha)}
              />
            </Campo>
            <Campo etiqueta="Hora desde" error={errores.horaDesde}>
              <input
                type="time"
                name="horaDesde"
                value={filtros.horaDesde}
                onChange={cambiar}
                aria-invalid={Boolean(errores.horaDesde)}
              />
            </Campo>
            <Boton
              className="boton-buscar"
              type="submit"
              icono={<IconoFlecha />}
              cargando={busqueda.estado === "buscando"}
              textoCargando="Buscando…"
            >
              Buscar
            </Boton>
          </div>
          <Atajos
            favoritas={favoritas}
            recientes={recientes}
            sedes={sedes}
            onUsar={usarAtajo}
            disabled={busqueda.estado === "buscando"}
          />
        </form>

        <section className="buscar-zona" aria-live="polite">
          <Resultados
            busqueda={busqueda}
            onCambiarFiltros={cambiarFiltros}
            consulta={consulta}
            favorita={
              <button
                className="boton-favorita"
                type="button"
                onClick={cambiarFavorita}
                aria-pressed={actualEsFavorita}
              >
                {actualEsFavorita ? "★ Búsqueda favorita" : "☆ Guardar como favorita"}
              </button>
            }
          />
        </section>

        <p className="buscar-nota">
          Solo ves trayectos con cupos libres de la comunidad Unicauca. Cada reserva es 1 cupo y el aporte se
          muestra en COP por persona.
        </p>
      </main>

      <Pie />
    </div>
  );
}

function Atajos({ favoritas, recientes, sedes, onUsar, disabled }) {
  const soloRecientes = recientes.filter((item) => !esFavorita(favoritas, item));
  if (favoritas.length === 0 && soloRecientes.length === 0) return null;
  return (
    <div className="buscar-atajos">
      {favoritas.length > 0 ? (
        <GrupoAtajos titulo="Favoritas" lista={favoritas} sedes={sedes} onUsar={onUsar} disabled={disabled} estrella />
      ) : null}
      {soloRecientes.length > 0 ? (
        <GrupoAtajos titulo="Recientes" lista={soloRecientes} sedes={sedes} onUsar={onUsar} disabled={disabled} />
      ) : null}
    </div>
  );
}

function GrupoAtajos({ titulo, lista, sedes, onUsar, disabled, estrella = false }) {
  return (
    <div className="atajos-grupo">
      <small>{titulo}</small>
      <div className="atajos-lista">
        {lista.map((atajo) => (
          <button
            key={`${atajo.sedeDestinoId}-${atajo.horaDesde}`}
            className="chip chip-atajo"
            type="button"
            onClick={() => onUsar(atajo)}
            disabled={disabled}
            title="Buscar con la fecha elegida"
          >
            {estrella ? "★ " : ""}
            {nombreSede(atajo, sedes)} · desde {atajo.horaDesde}
          </button>
        ))}
      </div>
    </div>
  );
}

function atajoDe(valores, sedes) {
  const sede = sedes.find((item) => String(item.id) === String(valores.sedeDestinoId));
  return {
    sedeDestinoId: String(valores.sedeDestinoId),
    sedeNombre: sede?.nombre ?? "",
    horaDesde: valores.horaDesde,
  };
}

function nombreSede(atajo, sedes) {
  const sede = sedes.find((item) => String(item.id) === String(atajo.sedeDestinoId));
  return sede?.nombre || atajo.sedeNombre || "Sede";
}

function Resultados({ busqueda, onCambiarFiltros, consulta, favorita }) {
  if (busqueda.estado === "inicial") {
    return <Cargando>Selecciona la sede, la fecha y la hora para ver los trayectos disponibles.</Cargando>;
  }
  if (busqueda.estado === "buscando") {
    return <Cargando>Buscando trayectos…</Cargando>;
  }
  if (busqueda.estado === "error") {
    return <Aviso tono="error">{busqueda.mensaje}</Aviso>;
  }

  const { total, trayectos, filtros, mensaje } = busqueda;
  return (
    <>
      <div className="buscar-cabecera">
        <div>
          <h2 className="buscar-total">
            {total} {total === 1 ? "trayecto disponible" : "trayectos disponibles"}
          </h2>
          <p className="buscar-subtitulo">{fechaLarga(filtros.fecha)} · Ordenados por hora de salida</p>
        </div>
        {favorita}
      </div>

      {total === 0 ? (
        <div className="tarjeta buscar-vacio">
          <IlustracionRuta />
          <h3>{mensaje}</h3>
          <p>Prueba con otra fecha u hora para encontrar un trayecto a {filtros.sedeDestino}.</p>
          <Boton className="boton-cambiar" onClick={onCambiarFiltros}>
            Cambiar filtros
          </Boton>
        </div>
      ) : (
        <ul className="buscar-resultados">
          {trayectos.map((trayecto) => (
            <li key={trayecto.id}>
              <TarjetaTrayecto
                trayecto={trayecto}
                acciones={
                  <Boton to={rutaDeReserva(trayecto.id, consulta)} icono={<IconoFlecha />}>
                    Ver y reservar
                  </Boton>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Campo({ etiqueta, error, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      <span className={error ? "caja caja-error" : "caja"}>{children}</span>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function IlustracionRuta() {
  return (
    <svg className="buscar-ilustracion" viewBox="0 0 240 90" aria-hidden="true">
      <path d="M10 80 C 60 80, 70 30, 110 40 S 180 70, 225 15" fill="none" stroke="#c9d6ea" strokeWidth="3" strokeDasharray="4 7" />
      <rect x="98" y="30" width="34" height="18" rx="6" fill="#fff" stroke="#c9d6ea" strokeWidth="2" />
      <circle cx="225" cy="15" r="7" fill="#fff" stroke="#c9d6ea" strokeWidth="2" />
    </svg>
  );
}

// La pantalla de reserva recibe el trayecto y los filtros, para poder volver a esta búsqueda.
function rutaDeReserva(trayectoId, consulta) {
  const parametros = new URLSearchParams(consulta);
  parametros.set("trayecto", trayectoId);
  return `/trayectos/reservar?${parametros}`;
}

function hoyEnColombia() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function erroresPorCampo(errores = []) {
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}
