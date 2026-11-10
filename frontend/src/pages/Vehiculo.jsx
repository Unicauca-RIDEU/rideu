import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { IconoAuto, IconoCheck } from "../components/Iconos.jsx";
import { obtenerVehiculo, registrarVehiculo } from "../services/vehiculo.js";

const NAV = ["Inicio", "Buscar", "Publicar", "Historial"];
const OBLIGATORIO = "Este campo es obligatorio.";

const vacio = {
  placa: "",
  marca: "",
  modelo: "",
  color: "",
  capacidadPasajeros: "",
  categoriaLicencia: "",
  fechaVencimientoLicencia: "",
};

export default function Vehiculo() {
  const navigate = useNavigate();
  const { usuario: usuarioSesion } = useOutletContext();
  const [usuario, setUsuario] = useState(usuarioSesion);
  const [datos, setDatos] = useState(vacio);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState("");
  const [exito, setExito] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardado, setGuardado] = useState(usuarioSesion?.estado === "Habilitado");

  // Una cuenta «Habilitado» ve sus datos actuales para poder actualizarlos.
  useEffect(() => {
    if (usuarioSesion?.estado !== "Habilitado") return undefined;
    let activo = true;
    obtenerVehiculo()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok || !respuesta.vehiculo) {
          setMensaje("No se pudieron cargar tus datos actuales. Escríbelos de nuevo para actualizarlos.");
          return;
        }
        // Solo se precarga si la persona todavía no ha escrito nada.
        setDatos((actual) => (actual !== vacio ? actual : {
          placa: respuesta.vehiculo.placa ?? "",
          marca: respuesta.vehiculo.marca ?? "",
          modelo: respuesta.vehiculo.modelo ?? "",
          color: respuesta.vehiculo.color ?? "",
          capacidadPasajeros: String(respuesta.vehiculo.capacidadPasajeros ?? ""),
          categoriaLicencia: respuesta.licencia?.categoria ?? "",
          fechaVencimientoLicencia: fechaLatina(respuesta.licencia?.fechaVencimiento),
        }));
      })
      .catch(() => {
        if (activo) {
          setMensaje("No se pudieron cargar tus datos actuales. Escríbelos de nuevo para actualizarlos.");
        }
      });
    return () => {
      activo = false;
    };
  }, [usuarioSesion?.estado, navigate]);

  const nombre = usuario?.nombre?.trim() || "Tu perfil";
  const siglas = iniciales(usuario?.nombre);
  const resumen = resumenVehiculo(datos);
  const capacidad = Number(datos.capacidadPasajeros);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setDatos((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
    setMensaje("");
  }

  async function enviar(evento) {
    evento.preventDefault();

    const validacion = validar(datos);
    if (!validacion.ok) {
      setErrores(validacion.errores);
      setMensaje(validacion.mensaje);
      setExito(false);
      return;
    }
    setEnviando(true);
    setMensaje("");
    try {
      const respuesta = await registrarVehiculo(validacion.datos);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!respuesta.ok) {
        setErrores(erroresPorCampo(respuesta.errores));
        setMensaje(respuesta.mensaje || "No se pudo guardar el vehículo.");
        setExito(false);
        return;
      }
      marcarHabilitado(respuesta.usuario ?? usuario, setUsuario);
      setErrores({});
      setMensaje(
        guardado
          ? "Vehículo y licencia actualizados."
          : "Vehículo guardado. Ya puedes publicar trayectos.",
      );
      setExito(true);
      setGuardado(true);
    } catch {
      setMensaje("No se pudo conectar con el servidor. Inténtalo de nuevo.");
      setExito(false);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla perfil">
      <header className="barra perfil-barra">
        <Link to="/perfil/vehiculo" className="marca">
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
            <span key={item}>{item}</span>
          ))}
          <span className="perfil-usuario">
            <span className="avatar" aria-hidden="true">
              {siglas}
            </span>
            <strong>{nombre}</strong>
            <Chevron />
          </span>
        </div>
      </header>

      <main className="perfil-cuerpo">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <p className="perfil-ruta">/perfil/vehiculo</p>
        <h1>Mi vehículo</h1>
        <p className="perfil-intro">Comparte el camino con tus datos al día.</p>

        <div className="perfil-grid">
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
                <p className={guardado ? "chip chip-ok" : "chip"}>
                  <i />
                  {guardado ? "Habilitado" : "No habilitado"}
                </p>
              </div>
              {resumen ? <p className="resumen-vehiculo">{resumen}</p> : null}
              {Number.isInteger(capacidad) && capacidad > 0 ? (
                <p className="resumen-vehiculo">Capacidad: {capacidad} pasajeros</p>
              ) : null}
            </section>

            {guardado ? (
              <>
                <p className="nota-ok" role="status">
                  <span className="nota-icono" aria-hidden="true">
                    <IconoCheck />
                  </span>
                  Vehículo guardado. Ya puedes publicar trayectos.
                </p>
                <button
                  className="boton-contorno"
                  type="button"
                  onClick={() => navigate("/trayectos/publicar")}
                >
                  Ir a publicar trayecto
                </button>
              </>
            ) : null}

            <p className="pista-lado">
              Tu información ayuda a la comunidad a reconocer el vehículo antes de viajar.
            </p>
          </aside>

          <form className="perfil-form" onSubmit={enviar} noValidate>
            {mensaje && !exito ? (
              <p className="aviso aviso-error" role="alert">
                {mensaje}
              </p>
            ) : null}
            {mensaje && exito ? (
              <p className="aviso aviso-exito" role="status">
                {mensaje}
              </p>
            ) : null}

            <section className="tarjeta">
              <h2>Tu vehículo</h2>
              <p className="pista">Todos los campos son obligatorios.</p>
              <div className="campos">
                <Campo
                  nombre="placa"
                  etiqueta="Placa"
                  placeholder="FKU 284"
                  valor={datos.placa}
                  error={errores.placa}
                  onChange={cambiar}
                />
                <Campo
                  nombre="marca"
                  etiqueta="Marca"
                  placeholder="Chevrolet"
                  valor={datos.marca}
                  error={errores.marca}
                  onChange={cambiar}
                />
                <Campo
                  nombre="modelo"
                  etiqueta="Modelo"
                  placeholder="Onix · 2022"
                  valor={datos.modelo}
                  error={errores.modelo}
                  onChange={cambiar}
                />
                <Campo
                  nombre="color"
                  etiqueta="Color"
                  placeholder="Blanco"
                  valor={datos.color}
                  error={errores.color}
                  onChange={cambiar}
                />
                <Campo
                  nombre="capacidadPasajeros"
                  etiqueta="Capacidad de pasajeros"
                  placeholder="4"
                  valor={datos.capacidadPasajeros}
                  error={errores.capacidadPasajeros}
                  onChange={cambiar}
                  sufijo="pasajeros"
                  ancho
                  inputMode="numeric"
                />
              </div>
              <p className="pista">
                No incluye a la conductora. Podrás ofrecer hasta 4 cupos por trayecto.
              </p>
            </section>

            <section className="tarjeta">
              <h2>Licencia de conducción</h2>
              <div className="campos">
                <Campo
                  nombre="categoriaLicencia"
                  etiqueta="Categoría de licencia"
                  placeholder="B1"
                  valor={datos.categoriaLicencia}
                  error={errores.categoriaLicencia}
                  onChange={cambiar}
                />
                <Campo
                  nombre="fechaVencimientoLicencia"
                  etiqueta="Vencimiento de licencia"
                  placeholder="15 / 09 / 2029"
                  valor={datos.fechaVencimientoLicencia}
                  error={errores.fechaVencimientoLicencia}
                  onChange={cambiar}
                />
              </div>
              <p className="pista">
                La licencia debe estar vigente para habilitar tu perfil de conductor.
              </p>
            </section>

            <button className="boton boton-guardar" type="submit" disabled={enviando}>
              <IconoCheck />
              {enviando ? "Guardando…" : "Guardar vehículo"}
            </button>
          </form>
        </div>
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}

function Campo({
  nombre,
  etiqueta,
  placeholder,
  valor,
  error,
  onChange,
  sufijo,
  ancho = false,
  inputMode,
}) {
  return (
    <label className={ancho ? "campo campo-ancho" : "campo"}>
      {etiqueta}
      <span className={error ? "caja caja-error" : "caja"}>
        <input
          name={nombre}
          placeholder={placeholder}
          value={valor}
          onChange={onChange}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
        />
        {sufijo ? <em aria-hidden="true">{sufijo}</em> : null}
      </span>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function Chevron() {
  return (
    <svg className="chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="m7 10 5 5 5-5H7Z" />
    </svg>
  );
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

function resumenVehiculo(datos) {
  const modelo = [datos.marca.trim(), datos.modelo.trim()].filter(Boolean).join(" ");
  return [modelo, datos.color.trim(), datos.placa.trim()].filter(Boolean).join(" · ");
}

function marcarHabilitado(usuario, setUsuario) {
  setUsuario({ ...usuario, estado: "Habilitado" });
}

function validar(datos) {
  const errores = {};
  const placa = datos.placa.trim().replace(/\s+/g, " ");
  const marca = datos.marca.trim();
  const modelo = datos.modelo.trim();
  const color = datos.color.trim();
  const categoriaLicencia = datos.categoriaLicencia.trim();
  const fecha = fechaIso(datos.fechaVencimientoLicencia);
  const capacidad = Number(datos.capacidadPasajeros);

  if (!placa) errores.placa = OBLIGATORIO;
  else if (!/^[A-Za-z]{3} ?\d{3}$/.test(placa)) {
    errores.placa = "La placa debe tener tres letras y tres números.";
  }
  if (!marca) errores.marca = OBLIGATORIO;
  if (!modelo) errores.modelo = OBLIGATORIO;
  if (!color) errores.color = OBLIGATORIO;
  if (!datos.capacidadPasajeros.trim()) {
    errores.capacidadPasajeros = OBLIGATORIO;
  } else if (!Number.isInteger(capacidad) || capacidad <= 0) {
    errores.capacidadPasajeros = "La capacidad de pasajeros debe ser un entero mayor que 0.";
  }
  if (!categoriaLicencia) errores.categoriaLicencia = OBLIGATORIO;
  if (!datos.fechaVencimientoLicencia.trim()) {
    errores.fechaVencimientoLicencia = OBLIGATORIO;
  } else if (!fecha) {
    errores.fechaVencimientoLicencia = "Usa el formato dd / mm / aaaa.";
  }

  const campos = Object.keys(errores);
  return {
    ok: campos.length === 0,
    errores,
    mensaje: campos.length === 1 ? errores[campos[0]] : "Completa los campos obligatorios.",
    datos: {
      placa,
      marca,
      modelo,
      color,
      capacidadPasajeros: capacidad,
      categoriaLicencia,
      fechaVencimientoLicencia: fecha,
    },
  };
}

// 'AAAA-MM-DD' → 'dd / mm / aaaa', el formato que muestra el formulario.
function fechaLatina(iso) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return partes ? `${partes[3]} / ${partes[2]} / ${partes[1]}` : "";
}

function fechaIso(valor) {
  const texto = valor.trim();
  const directa = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const latina = texto.match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!directa && !latina) return "";
  const anio = Number(directa?.[1] ?? latina[3]);
  const mes = Number(directa?.[2] ?? latina[2]);
  const dia = Number(directa?.[3] ?? latina[1]);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return "";
  }
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function erroresPorCampo(errores = []) {
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}
