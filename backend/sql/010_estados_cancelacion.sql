-- Estados de cancelación de trayectos y reservas (E02-HU05 y E04-HU08).
-- Un trayecto pasa de «Disponible» a «Cancelado» cuando el conductor lo cancela.
-- Una reserva pasa de «Confirmada» a «Cancelada» cuando el pasajero la cancela
-- o cuando el conductor cancela el trayecto.
--
-- Las restricciones de estado se vuelven a crear con los valores nuevos. No se borran filas:
-- todos los datos existentes cumplen la restricción ampliada.
-- Los bloques ignoran ORA-02443 (la restricción no existe) para poder repetir la migración.

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE trayectos DROP CONSTRAINT trayectos_estado_valido';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN
      RAISE;
    END IF;
END;
/

ALTER TABLE trayectos ADD CONSTRAINT trayectos_estado_valido
  CHECK (estado IN ('Disponible', 'Cancelado'))
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE reservas DROP CONSTRAINT reservas_estado_valido';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN
      RAISE;
    END IF;
END;
/

ALTER TABLE reservas ADD CONSTRAINT reservas_estado_valido
  CHECK (estado IN ('Confirmada', 'Cancelada'))
/
