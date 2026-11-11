-- Trayecto publicado por un conductor habilitado (E02-HU04).
-- Los cupos no superan 4: el máximo por trayecto es el menor valor entre
-- la capacidad del vehículo y 4; la comparación con la capacidad se valida en la API.
--
-- fecha es un DATE a las 00:00. Oracle no tiene un tipo solo de hora:
-- hora se guarda como texto «HH24:MI», que conserva el orden cronológico.
-- Una cadena vacía es NULL en Oracle, así que el origen no vacío se comprueba con TRIM.

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE trayectos (
      id VARCHAR2(36) NOT NULL,
      conductor_id VARCHAR2(36) NOT NULL,
      vehiculo_id VARCHAR2(36) NOT NULL,
      sede_destino_id NUMBER(10) NOT NULL,
      origen VARCHAR2(200 CHAR) NOT NULL,
      fecha DATE NOT NULL,
      hora VARCHAR2(5) NOT NULL,
      cupos NUMBER(10) NOT NULL,
      aporte_sugerido NUMBER(10) NOT NULL,
      estado VARCHAR2(20 CHAR) DEFAULT 'Disponible' NOT NULL,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT trayectos_pk PRIMARY KEY (id),
      CONSTRAINT trayectos_conductor_fk FOREIGN KEY (conductor_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT trayectos_vehiculo_fk FOREIGN KEY (vehiculo_id)
        REFERENCES vehiculos (id) ON DELETE CASCADE,
      CONSTRAINT trayectos_sede_fk FOREIGN KEY (sede_destino_id) REFERENCES sedes (id),
      CONSTRAINT trayectos_origen_no_vacio CHECK (TRIM(origen) IS NOT NULL),
      CONSTRAINT trayectos_fecha_sin_hora CHECK (fecha = TRUNC(fecha)),
      CONSTRAINT trayectos_hora_valida CHECK (REGEXP_LIKE(hora, '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
      CONSTRAINT trayectos_cupos_validos CHECK (cupos BETWEEN 1 AND 4),
      CONSTRAINT trayectos_aporte_valido CHECK (aporte_sugerido >= 0),
      CONSTRAINT trayectos_estado_valido CHECK (estado IN ('Disponible'))
    )
  ]';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX trayectos_conductor_id_idx ON trayectos (conductor_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
