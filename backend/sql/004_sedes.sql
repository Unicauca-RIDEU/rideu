-- Sedes de la Universidad del Cauca, destino de los trayectos.
-- Datos tomados del script de datos de prueba del equipo (tabla sede del DDL).

CREATE TABLE IF NOT EXISTS sedes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT NOT NULL,
  ciudad TEXT NOT NULL,
  CONSTRAINT sedes_nombre_unico UNIQUE (nombre)
);

INSERT INTO sedes (id, nombre, direccion, ciudad) VALUES
  (1, 'Facultad de Ingeniería Electrónica y Telecomunicaciones', 'Calle 5 No. 4-70, sector Tulcán', 'Popayán'),
  (2, 'Facultad de Ingeniería Civil', 'Carrera 2 con Calle 15N, sector Tulcán', 'Popayán'),
  (3, 'Facultad de Ciencias de la Salud', 'Hospital Universitario San José, Popayán', 'Popayán'),
  (4, 'Facultad de Ciencias Humanas y Sociales', 'Carrera 3 con Calle 4, centro', 'Popayán'),
  (5, 'Sede Norte del Cauca', 'Calle 6 con Carrera 9, Santander de Quilichao', 'Santander de Quilichao'),
  (6, 'Facultad de Artes', 'Claustro de Santo Domingo, carrera 5', 'Popayán'),
  (7, 'Facultad de Ciencias Agropecuarias', 'Vereda Las Guacas, vía al oriente', 'Popayán')
ON CONFLICT (id) DO NOTHING;
