-- Reserva de un cupo en un trayecto (E04-HU07).
-- Cada reserva ocupa un cupo: al confirmarla se descuenta de trayectos.cupos_disponibles
-- en la misma transacción. Un pasajero no puede tener dos reservas del mismo trayecto.
--
-- Los bloques ignoran ORA-00955 (el objeto ya existe) para poder repetir la migración.

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE reservas (
      id VARCHAR2(36) NOT NULL,
      trayecto_id VARCHAR2(36) NOT NULL,
      pasajero_id VARCHAR2(36) NOT NULL,
      estado VARCHAR2(20 CHAR) DEFAULT 'Confirmada' NOT NULL,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT reservas_pk PRIMARY KEY (id),
      CONSTRAINT reservas_trayecto_fk FOREIGN KEY (trayecto_id)
        REFERENCES trayectos (id) ON DELETE CASCADE,
      CONSTRAINT reservas_pasajero_fk FOREIGN KEY (pasajero_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT reservas_pasajero_unico UNIQUE (trayecto_id, pasajero_id),
      CONSTRAINT reservas_estado_valido CHECK (estado IN ('Confirmada'))
    )
  ]';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/

-- La restricción reservas_pasajero_unico ya indexa trayecto_id; falta el índice de pasajero_id,
-- que evita bloquear toda la tabla al borrar un usuario y acelera el historial del pasajero.
BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX reservas_pasajero_id_idx ON reservas (pasajero_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
