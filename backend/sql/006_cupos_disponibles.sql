-- Cupos disponibles del trayecto (E03-HU06), como cupos_disponibles en el DDL del equipo.
-- Arranca igual a los cupos ofrecidos; la reserva de cupos (HU07) lo descontará.
-- La búsqueda excluye los trayectos con cupos_disponibles = 0.

ALTER TABLE trayectos ADD COLUMN IF NOT EXISTS cupos_disponibles INTEGER;

UPDATE trayectos SET cupos_disponibles = cupos WHERE cupos_disponibles IS NULL;

ALTER TABLE trayectos ALTER COLUMN cupos_disponibles SET NOT NULL;

ALTER TABLE trayectos DROP CONSTRAINT IF EXISTS trayectos_cupos_disponibles_validos;

ALTER TABLE trayectos ADD CONSTRAINT trayectos_cupos_disponibles_validos
  CHECK (cupos_disponibles BETWEEN 0 AND cupos);

CREATE INDEX IF NOT EXISTS trayectos_busqueda_idx ON trayectos (sede_destino_id, fecha, hora);
