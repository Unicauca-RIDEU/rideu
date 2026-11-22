// Atajos para usuarios frecuentes: repetir trayectos y recordar búsquedas.
// Las búsquedas se guardan solo en este navegador (localStorage), separadas por usuario;
// si el almacenamiento no está disponible, la aplicación funciona igual sin ellas.

const MAXIMO_RECIENTES = 5;
const MAXIMO_FAVORITAS = 5;

// Datos de un trayecto ya publicado que se copian al formulario de publicación.
// La fecha no se copia: el conductor elige la del nuevo viaje.
export function datosParaRepetir(trayecto) {
  return {
    origen: trayecto.origen ?? "",
    sedeDestino: trayecto.sede_destino ?? "",
    hora: trayecto.hora ?? "",
    cupos: trayecto.cupos ?? "",
    aporteSugerido: trayecto.aporte_sugerido ?? "",
  };
}

// Orígenes distintos usados antes por el conductor, del más reciente al más antiguo.
export function origenesUsados(trayectos) {
  const vistos = new Set();
  const origenes = [];
  for (const trayecto of trayectos ?? []) {
    const origen = trayecto.origen?.trim();
    const clave = origen?.toLowerCase();
    if (origen && !vistos.has(clave)) {
      vistos.add(clave);
      origenes.push(origen);
    }
  }
  return origenes;
}

export function busquedasRecientes(usuarioId) {
  return leer(clave("recientes", usuarioId));
}

export function busquedasFavoritas(usuarioId) {
  return leer(clave("favoritas", usuarioId));
}

// Una búsqueda es { sedeDestinoId, sedeNombre, horaDesde }. La fecha no se recuerda
// porque cambia en cada viaje.
export function registrarBusqueda(usuarioId, busqueda) {
  const lista = sinRepetir([busqueda, ...busquedasRecientes(usuarioId)]).slice(0, MAXIMO_RECIENTES);
  escribir(clave("recientes", usuarioId), lista);
  return lista;
}

export function alternarFavorita(usuarioId, busqueda) {
  const actuales = busquedasFavoritas(usuarioId);
  const lista = esFavorita(actuales, busqueda)
    ? actuales.filter((item) => !misma(item, busqueda))
    : sinRepetir([busqueda, ...actuales]).slice(0, MAXIMO_FAVORITAS);
  escribir(clave("favoritas", usuarioId), lista);
  return lista;
}

export function esFavorita(favoritas, busqueda) {
  return favoritas.some((item) => misma(item, busqueda));
}

function misma(a, b) {
  return String(a.sedeDestinoId) === String(b.sedeDestinoId) && a.horaDesde === b.horaDesde;
}

function sinRepetir(lista) {
  return lista.filter((item, indice) => lista.findIndex((otro) => misma(otro, item)) === indice);
}

function clave(tipo, usuarioId) {
  return `rideu.busquedas.${tipo}.${usuarioId ?? "anonimo"}`;
}

function leer(nombre) {
  try {
    const valor = JSON.parse(localStorage.getItem(nombre) ?? "[]");
    return Array.isArray(valor) ? valor.filter((item) => item?.sedeDestinoId && item?.horaDesde) : [];
  } catch {
    return [];
  }
}

function escribir(nombre, valor) {
  try {
    localStorage.setItem(nombre, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: los atajos simplemente no se recuerdan.
  }
}
