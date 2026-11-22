import { IconoCorreo } from "./Iconos.jsx";

// Campo de correo institucional: la persona escribe solo su usuario y el dominio
// @unicauca.edu.co queda fijo y visible al lado, porque es el único permitido.

export const DOMINIO = "@unicauca.edu.co";
export const MENSAJE_SOLO_USUARIO =
  "Escribe solo tu usuario, sin «@». El dominio @unicauca.edu.co se agrega automáticamente.";

// Deja solo el usuario. Si la persona pega su correo institucional completo, se quita el dominio;
// cualquier otro «@» se conserva para avisarle que sobra.
export function usuarioDeCorreo(valor) {
  const texto = String(valor ?? "").replace(/\s/g, "");
  const arroba = texto.indexOf("@");
  if (arroba === -1) return texto;
  return texto.slice(arroba).toLowerCase() === DOMINIO ? texto.slice(0, arroba) : texto;
}

export function correoCompleto(usuario) {
  const limpio = String(usuario ?? "").trim().toLowerCase();
  return limpio ? `${limpio}${DOMINIO}` : "";
}

export default function CampoCorreo({ valor, onCambiar, error, autoComplete = "username" }) {
  const usuario = valor.trim().toLowerCase();
  const muestraVistaPrevia = usuario && !usuario.includes("@");

  return (
    <label>
      Correo institucional
      <span className={error ? "control control-error" : "control"}>
        <IconoCorreo />
        <input
          name="correo"
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="nombre.apellido"
          value={valor}
          onChange={(evento) => onCambiar(usuarioDeCorreo(evento.target.value))}
          aria-invalid={Boolean(error)}
          aria-describedby="correo-pista"
        />
        <span className="correo-dominio">{DOMINIO}</span>
      </span>
      {error ? (
        <small id="correo-pista">{error}</small>
      ) : (
        <small className="pista" id="correo-pista">
          {muestraVistaPrevia ? (
            <>
              Tu correo: <strong>{correoCompleto(usuario)}</strong>
            </>
          ) : (
            <>Escribe solo tu usuario: agregamos {DOMINIO} automáticamente.</>
          )}
        </small>
      )}
    </label>
  );
}
