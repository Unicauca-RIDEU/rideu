-- Usuario, según el registro de Ride U.
-- El diagrama solo nombra la entidad; estos son sus atributos de cuenta.

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  contrasena_hash TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Sin verificar',
  token_verificacion_hash TEXT NOT NULL,
  token_verificacion_expira TIMESTAMPTZ NOT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_correo_unico UNIQUE (correo),
  CONSTRAINT usuarios_estado_valido CHECK (estado IN ('Sin verificar', 'Verificada', 'Habilitado')),
  CONSTRAINT usuarios_correo_institucional CHECK (
    correo ~ '^[^@[:space:]]+@unicauca\.edu\.co$'
  ),
  CONSTRAINT usuarios_whatsapp_colombia CHECK (whatsapp ~ '^\+57[3][0-9]{9}$')
);
