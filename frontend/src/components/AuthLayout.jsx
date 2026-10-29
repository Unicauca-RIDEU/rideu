import { Link } from "react-router-dom";
import { IconoAuto, IconoEscudo, IconoPersona, IconoRuta } from "./Iconos.jsx";

const RELATO_POR_DEFECTO = {
  titulo: (
    <>
      La U nos une.
      <br />
      El camino también.
    </>
  ),
  texto: "Comparte tus trayectos por Popayán con personas de la Universidad del Cauca.",
};

export default function AuthLayout({ children, titulo, texto }) {
  const relatoTitulo = titulo ?? RELATO_POR_DEFECTO.titulo;
  const relatoTexto = texto ?? RELATO_POR_DEFECTO.texto;

  return (
    <div className="pantalla">
      <header className="barra">
        <Link to="/registro" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
        <p className="exclusivo">
          <IconoEscudo />
          Exclusivo para la comunidad Unicauca
        </p>
      </header>

      <main className="contenido">
        <section className="relato">
          <p className="kicker kicker-claro">
            <IconoRuta />
            Juntos hacemos camino
          </p>
          <h1>{relatoTitulo}</h1>
          <p className="relato-texto">{relatoTexto}</p>
          <MapaTrayecto />
          <ul className="beneficios">
            <li>
              <span>
                <IconoEscudo />
              </span>
              Correos institucionales verificados
            </li>
            <li>
              <span>
                <IconoPersona />
              </span>
              Más compañía en cada trayecto
            </li>
          </ul>
          <p className="lugar">Popayán, Cauca · Comunidad en movimiento</p>
        </section>
        <section className="panel">{children}</section>
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}

function MapaTrayecto() {
  return (
    <div className="mapa" aria-hidden="true">
      <svg viewBox="0 0 460 230">
        <rect x="28" y="28" width="78" height="58" rx="14" className="bloque" />
        <rect x="122" y="28" width="78" height="58" rx="14" className="bloque" />
        <rect x="216" y="28" width="78" height="58" rx="14" className="bloque" />
        <rect x="28" y="102" width="78" height="58" rx="14" className="bloque" />
        <rect x="122" y="102" width="78" height="58" rx="14" className="bloque" />
        <rect x="310" y="102" width="92" height="58" rx="14" className="bloque" />
        <rect x="216" y="156" width="78" height="46" rx="14" className="bloque" />
        <path d="M92 154h78v-46h92" className="camino" />
        <circle cx="78" cy="154" r="9" className="punto" />
        <g className="auto" transform="translate(148 132)">
          <rect width="36" height="28" rx="9" />
          <path d="M8 14h6l3-5h8l3 5h6" />
        </g>
        <g className="campus" transform="translate(286 78)">
          <circle cx="22" cy="22" r="22" />
          <path d="M22 10 12 16v4h20v-4L22 10Zm-6 12v8h4v-5h4v5h4v-8h-12Z" />
        </g>
      </svg>
      <span className="etiqueta origen">Bello Horizonte</span>
      <span className="etiqueta destino">Campus Tulcán</span>
    </div>
  );
}
