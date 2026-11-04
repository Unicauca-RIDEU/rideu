-- Trayecto publicado por un conductor habilitado (E02-HU04).
-- Los cupos no superan 4: el máximo por trayecto es el menor valor entre
-- la capacidad del vehículo y 4; la comparación con la capacidad se valida en la API.

CREATE TABLE IF NOT EXISTS trayectos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conductor_id UUID NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  vehiculo_id UUID NOT NULL REFERENCES vehiculos (id) ON DELETE CASCADE,
  sede_destino_id INTEGER NOT NULL REFERENCES sedes (id),
  origen TEXT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  cupos INTEGER NOT NULL,
  aporte_sugerido INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Disponible',
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trayectos_origen_no_vacio CHECK (btrim(origen) <> ''),
  CONSTRAINT trayectos_cupos_validos CHECK (cupos BETWEEN 1 AND 4),
  CONSTRAINT trayectos_aporte_valido CHECK (aporte_sugerido >= 0),
  CONSTRAINT trayectos_estado_valido CHECK (estado IN ('Disponible'))
);

CREATE INDEX IF NOT EXISTS trayectos_conductor_id_idx ON trayectos (conductor_id);
