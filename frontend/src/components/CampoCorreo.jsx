// Campo de correo institucional. Acepta las dos formas de escribirlo:
// - solo el usuario («juan.perez»): el dominio @unicauca.edu.co se muestra al lado y se agrega al enviar;
// - el correo completo («juan.perez@unicauca.edu.co»): al escribir «@» se oculta el dominio de al lado.
// El nombre del campo va dentro, como texto de ejemplo, y se anuncia con aria-label.

export const DOMINIO = "@unicauca.edu.co";
export const MENSAJE_DOMINIO = "Solo se permite el correo institucional @unicauca.edu.co.";

// Devuelve el correo que se envía al backend: agrega el dominio si la persona escribió solo su usuario.
export function correoCompleto(valor) {
  const limpio = String(valor ?? "").trim().toLowerCase();
  if (!limpio) return "";
  return limpio.includes("@") ? limpio : `${limpio}${DOMINIO}`;
}

export function esCorreoInstitucional(correo) {
  return /^[^\s@]+@unicauca\.edu\.co$/.test(correo);
}

export default function CampoCorreo({ valor, onCambiar, error, autoComplete = "username" }) {
  const conArroba = valor.includes("@");

  return (
    <label>
      <span className={error ? "control control-error" : "control"}>
        <input
          name="correo"
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Usuario institucional"
          aria-label="Usuario o correo institucional"
          value={valor}
          onChange={(evento) => onCambiar(evento.target.value.replace(/\s/g, ""))}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "correo-pista" : undefined}
        />
        {conArroba ? null : <span className="correo-dominio">{DOMINIO}</span>}
      </span>
      {error ? <small id="correo-pista">{error}</small> : null}
    </label>
  );
}
