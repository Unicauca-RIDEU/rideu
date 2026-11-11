-- Sedes de la Universidad del Cauca, destino de los trayectos.
-- Datos tomados del script de datos de prueba del equipo (tabla sede del DDL).

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE sedes (
      id NUMBER(10) NOT NULL,
      nombre VARCHAR2(150 CHAR) NOT NULL,
      direccion VARCHAR2(200 CHAR) NOT NULL,
      ciudad VARCHAR2(100 CHAR) NOT NULL,
      CONSTRAINT sedes_pk PRIMARY KEY (id),
      CONSTRAINT sedes_nombre_unico UNIQUE (nombre)
    )
  ]';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/

-- Solo inserta las sedes que falten; no cambia las que ya existen.
MERGE INTO sedes s
USING (
  SELECT 1 AS id, 'Facultad de Ingeniería Electrónica y Telecomunicaciones' AS nombre, 'Calle 5 No. 4-70, sector Tulcán' AS direccion, 'Popayán' AS ciudad FROM dual UNION ALL
  SELECT 2, 'Facultad de Ingeniería Civil', 'Carrera 2 con Calle 15N, sector Tulcán', 'Popayán' FROM dual UNION ALL
  SELECT 3, 'Facultad de Ciencias de la Salud', 'Hospital Universitario San José, Popayán', 'Popayán' FROM dual UNION ALL
  SELECT 4, 'Facultad de Ciencias Humanas y Sociales', 'Carrera 3 con Calle 4, centro', 'Popayán' FROM dual UNION ALL
  SELECT 5, 'Sede Norte del Cauca', 'Calle 6 con Carrera 9, Santander de Quilichao', 'Santander de Quilichao' FROM dual UNION ALL
  SELECT 6, 'Facultad de Artes', 'Claustro de Santo Domingo, carrera 5', 'Popayán' FROM dual UNION ALL
  SELECT 7, 'Facultad de Ciencias Agropecuarias', 'Vereda Las Guacas, vía al oriente', 'Popayán' FROM dual
) n
ON (s.id = n.id)
WHEN NOT MATCHED THEN
  INSERT (id, nombre, direccion, ciudad)
  VALUES (n.id, n.nombre, n.direccion, n.ciudad)
/
