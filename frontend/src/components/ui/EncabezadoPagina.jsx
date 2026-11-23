import { Link } from "react-router-dom";

// Enlace para volver, título y presentación de una pantalla con sesión.
// «volver» es { texto, to }; si no se indica, no se muestra el enlace.
export default function EncabezadoPagina({ titulo, intro, volver }) {
  return (
    <>
      {volver ? (
        <Link className="volver" to={volver.to}>
          ← {volver.texto}
        </Link>
      ) : null}
      <h1>{titulo}</h1>
      {intro ? <p className="perfil-intro">{intro}</p> : null}
    </>
  );
}
