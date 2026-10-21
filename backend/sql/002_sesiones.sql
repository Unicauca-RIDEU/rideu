-- Sesiones abiertas al iniciar sesión.
-- Solo se guarda el hash del token; el token viaja al cliente una única vez.

CREATE TABLE IF NOT EXISTS sesiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expira TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT sesiones_token_unico UNIQUE (token_hash)
);
