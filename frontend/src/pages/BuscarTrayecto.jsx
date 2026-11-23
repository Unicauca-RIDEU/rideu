import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, EncabezadoPagina } from "@/components/ui";
import { IconoFlecha } from "../components/Iconos.jsx";
import TarjetaTrayecto from "../components/TarjetaTrayecto.jsx";
import { fechaLarga } from "../components/formatoTrayecto.js";
import { listarTrayectosDisponibles, obtenerSedes } from "../services/trayectos.js";
import {
  alternarFavorita,
  busquedasFavoritas,
  busquedasRecientes,
  esFavorita,
  registrarBusqueda,
} from "../services/trayectosFrecuentes.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Búsqueda de trayectos (E03-HU06) · /trayectos/buscar[?sedeDestinoId=&fecha=&horaDesde=]
// Al entrar se listan todos los trayectos próximos con cupos, agrupados por día.
// Los filtros van en un panel aparte, son opcionales y viven en la URL para conservarlos
// al recargar o al volver desde la reserva.

// Cada cuánto se repite la consulta en segundo plano para mostrar los cupos al día (E04-HU07).
const INTERVALO_ACTUALIZACION_MS = 10000;
const CAMPOS = ["sedeDestinoId", "fecha", "horaDesde"];
const SIN_FILTROS = { sedeDestinoId: "", fecha: "", horaDesde: "" };

export default function BuscarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const [sedes, setSedes] = useState([]);
  const [filtros, setFiltros] = useState(() => filtrosDe(parametros));
  const [listado, setListado] = useState({ estado: "cargando" });
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [recientes, setRecientes] = useState(() => busquedasRecientes(usuario?.id));
  const [favoritas, setFavoritas] = useState(() => busquedasFavoritas(usuario?.id));
  const resultados = useRef(null);

  const consulta = parametros.toString();
  const aplicados = filtrosDe(parametros);
  const cantidadAplicados = CAMPOS.filter((campo) => aplicados[campo]).length;

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

  // Cada vez que cambian los filtros de la URL se vuelve a consultar, y mientras la pantalla
  // siga abierta se repite sin borrar los resultados para reflejar los cupos que otros reservan.
  useEffect(() => {
    const actuales = filtrosDe(new URLSearchParams(consulta));
    setFiltros(actuales);
    let activo = true;
    setListado((anterior) => ({ ...anterior, estado: "cargando" }));

    function consultar(primera) {
      listarTrayectosDisponibles(actuales)
        .then((respuesta) => {
          if (!activo) return;
          if (respuesta.status === 401) {
            navigate("/login", { replace: true });
            return;
          }
          if (respuesta.ok) setListado({ estado: "listo", ...respuesta });
          else if (primera) setListado({ estado: "error", mensaje: respuesta.mensaje || "No se pudieron cargar los trayectos." });
        })
        .catch(() => {
          if (activo && primera) {
            setListado({ estado: "error", mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo." });
          }
        });
    }

    consultar(true);
    const temporizador = setInterval(() => consultar(false), INTERVALO_ACTUALIZACION_MS);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [consulta, navigate]);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
  }

  function aplicar(valores) {
    const limpios = Object.fromEntries(CAMPOS.filter((campo) => valores[campo]).map((campo) => [campo, valores[campo]]));
    setParametros(limpios);
    setPanelAbierto(false);
    // Solo se recuerda como reciente una búsqueda con sede y hora (los atajos guardan ambas).
    if (limpios.sedeDestinoId && limpios.horaDesde) {
      setRecientes(registrarBusqueda(usuario?.id, atajoDe(limpios, sedes)));
    }
    resultados.current?.focus({ preventScroll: true });
  }

  function buscar(evento) {
    evento.preventDefault();
    aplicar(filtros);
  }

  function quitar(campo) {
    aplicar({ ...aplicados, [campo]: "" });
  }

  function usarAtajo(atajo) {
    aplicar({ sedeDestinoId: String(atajo.sedeDestinoId), fecha: filtros.fecha, horaDesde: atajo.horaDesde });
  }

  function cambiarFavorita() {
    setFavoritas(alternarFavorita(usuario?.id, atajoDe(aplicados, sedes)));
  }

  const puedeSerFavorita = Boolean(aplicados.sedeDestinoId && aplicados.horaDesde);
  const actualEsFavorita = puedeSerFavorita && esFavorita(favoritas, aplicados);

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Buscar" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Buscar trayecto"
          intro="Todos los trayectos próximos con cupos libres. Filtra por sede, fecha u hora si lo necesitas."
          volver={{ texto: "Volver al panel", to: "/panel" }}
        />

        <div className="buscar-layout">
          <aside className="buscar-lateral">
            <button
              className="boton-filtros"
              type="button"
              aria-expanded={panelAbierto}
              aria-controls="panel-filtros"
              onClick={() => setPanelAbierto((valor) => !valor)}
            >
              Filtros{cantidadAplicados > 0 ? ` (${cantidadAplicados})` : ""}
              <span aria-hidden="true">{panelAbierto ? "▴" : "▾"}</span>
            </button>

            <form
              id="panel-filtros"
              className={panelAbierto ? "tarjeta panel-filtros panel-filtros-abierto" : "tarjeta panel-filtros"}
              onSubmit={buscar}
              noValidate
            >
              <h2>Filtros</h2>
              <Campo etiqueta="Sede de destino">
                <select name="sedeDestinoId" value={filtros.sedeDestinoId} onChange={cambiar}>
                  <option value="">Todas las sedes</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nombre}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etiqueta="Fecha" pista="Vacío: cualquier día">
                <input type="date" name="fecha" min={hoyEnColombia()} value={filtros.fecha} onChange={cambiar} />
              </Campo>
              <Campo etiqueta="Hora desde" pista="Vacío: a cualquier hora">
                <input type="time" name="horaDesde" value={filtros.horaDesde} onChange={cambiar} />
              </Campo>
              <Boton className="boton-buscar" type="submit" icono={<IconoFlecha />}>
                Buscar
              </Boton>
              {cantidadAplicados > 0 ? (
                <button className="enlace-secundario boton-limpiar" type="button" onClick={() => aplicar(SIN_FILTROS)}>
                  Limpiar filtros
                </button>
              ) : null}

              <Atajos favoritas={favoritas} recientes={recientes} sedes={sedes} onUsar={usarAtajo} />
            </form>
          </aside>

          <section className="buscar-zona" aria-live="polite" aria-labelledby="total-trayectos" tabIndex={-1} ref={resultados}>
            <Resultados
              listado={listado}
              aplicados={aplicados}
              sedes={sedes}
              consulta={consulta}
              onQuitar={quitar}
              onLimpiar={() => aplicar(SIN_FILTROS)}
              favorita={
                puedeSerFavorita ? (
                  <button className="boton-favorita" type="button" onClick={cambiarFavorita} aria-pressed={actualEsFavorita}>
                    {actualEsFavorita ? "★ Búsqueda favorita" : "☆ Guardar como favorita"}
                  </button>
                ) : null
              }
            />
          </section>
        </div>
      </main>

      <Pie />
    </div>
  );
}

function Resultados({ listado, aplicados, sedes, consulta, onQuitar, onLimpiar, favorita }) {
  if (listado.estado === "error") return <Aviso tono="error">{listado.mensaje}</Aviso>;
  if (!listado.trayectos) return <Cargando>Cargando trayectos…</Cargando>;

  const { total, trayectos, mensaje } = listado;
  const activos = chipsDe(aplicados, sedes);
  return (
    <>
      <div className="buscar-cabecera">
        <div>
          <h2 className="buscar-total" id="total-trayectos">
            {total} {total === 1 ? "trayecto disponible" : "trayectos disponibles"}
          </h2>
          <p className="buscar-subtitulo">
            {activos.length === 0 ? "Todas las sedes y fechas · " : ""}Ordenados por fecha y hora de salida
            {listado.estado === "cargando" ? " · actualizando…" : ""}
          </p>
        </div>
        {favorita}
      </div>

      {activos.length > 0 ? (
        <ul className="filtros-activos" aria-label="Filtros aplicados">
          {activos.map((chip) => (
            <li key={chip.campo}>
              <button type="button" className="chip chip-filtro" onClick={() => onQuitar(chip.campo)}>
                {chip.texto} <span aria-hidden="true">×</span>
                <span className="sr-only">(quitar filtro)</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {total === 0 ? (
        <div className="tarjeta buscar-vacio">
          <IlustracionRuta />
          <h3>{mensaje}</h3>
          {activos.length > 0 ? (
            <>
              <p>Prueba con otra sede, fecha u hora.</p>
              <Boton className="boton-cambiar" onClick={onLimpiar}>
                Limpiar filtros
              </Boton>
            </>
          ) : (
            <p>Aún no hay trayectos publicados. Vuelve más tarde.</p>
          )}
        </div>
      ) : (
        porDia(trayectos).map(([fecha, delDia]) => (
          <section key={fecha} className="buscar-dia" aria-label={etiquetaDia(fecha)}>
            <h3 className="buscar-dia-titulo">
              {etiquetaDia(fecha)} <span>({delDia.length})</span>
            </h3>
            <ul className="buscar-resultados">
              {delDia.map((trayecto) => (
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
          </section>
        ))
      )}
    </>
  );
}

function Atajos({ favoritas, recientes, sedes, onUsar }) {
  const soloRecientes = recientes.filter((item) => !esFavorita(favoritas, item));
  if (favoritas.length === 0 && soloRecientes.length === 0) return null;
  return (
    <div className="buscar-atajos">
      {favoritas.length > 0 ? <GrupoAtajos titulo="Favoritas" lista={favoritas} sedes={sedes} onUsar={onUsar} estrella /> : null}
      {soloRecientes.length > 0 ? <GrupoAtajos titulo="Recientes" lista={soloRecientes} sedes={sedes} onUsar={onUsar} /> : null}
    </div>
  );
}

function GrupoAtajos({ titulo, lista, sedes, onUsar, estrella = false }) {
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
            title="Aplicar esta búsqueda"
          >
            {estrella ? "★ " : ""}
            {nombreSede(atajo, sedes)} · desde {atajo.horaDesde}
          </button>
        ))}
      </div>
    </div>
  );
}

function Campo({ etiqueta, pista, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      <span className="caja">{children}</span>
      {pista ? <small className="pista">{pista}</small> : null}
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

function filtrosDe(parametros) {
  return Object.fromEntries(CAMPOS.map((campo) => [campo, parametros.get(campo) ?? ""]));
}

function chipsDe(aplicados, sedes) {
  const chips = [];
  if (aplicados.sedeDestinoId) {
    chips.push({ campo: "sedeDestinoId", texto: nombreSede({ sedeDestinoId: aplicados.sedeDestinoId }, sedes) });
  }
  if (aplicados.fecha) chips.push({ campo: "fecha", texto: etiquetaDia(aplicados.fecha) });
  if (aplicados.horaDesde) chips.push({ campo: "horaDesde", texto: `Desde las ${aplicados.horaDesde}` });
  return chips;
}

// Agrupa la lista (ya ordenada por fecha y hora) en [fecha, trayectos] conservando el orden.
function porDia(trayectos) {
  const grupos = new Map();
  for (const trayecto of trayectos) {
    if (!grupos.has(trayecto.fecha)) grupos.set(trayecto.fecha, []);
    grupos.get(trayecto.fecha).push(trayecto);
  }
  return [...grupos.entries()];
}

function etiquetaDia(fecha) {
  const hoy = hoyEnColombia();
  const manana = new Date(Date.parse(`${hoy}T12:00:00Z`) + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const prefijo = fecha === hoy ? "Hoy · " : fecha === manana ? "Mañana · " : "";
  return `${prefijo}${fechaLarga(fecha)}`;
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

// La pantalla de reserva recibe el trayecto y los filtros, para poder volver a esta búsqueda.
function rutaDeReserva(trayectoId, consulta) {
  const parametros = new URLSearchParams(consulta);
  parametros.set("trayecto", trayectoId);
  return `/trayectos/reservar?${parametros}`;
}

function hoyEnColombia() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
