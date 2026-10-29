-- Vehículo y licencia del conductor.
-- El diagrama nombra las entidades; estos son sus atributos y la relación con el usuario.

CREATE TABLE IF NOT EXISTS vehiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  color TEXT NOT NULL,
  capacidad_pasajeros INTEGER NOT NULL,
  CONSTRAINT vehiculos_placa_unica UNIQUE (placa),
  CONSTRAINT vehiculos_capacidad_valida CHECK (capacidad_pasajeros > 0)
);

CREATE INDEX IF NOT EXISTS vehiculos_usuario_id_idx ON vehiculos (usuario_id);

CREATE TABLE IF NOT EXISTS licencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  fecha_vencimiento DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS licencias_usuario_id_idx ON licencias (usuario_id);
