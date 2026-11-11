-- Cupos disponibles del trayecto (E03-HU06), como cupos_disponibles en el DDL del equipo.
-- Arranca igual a los cupos ofrecidos; la reserva de cupos (HU07) lo descontará.
-- La búsqueda excluye los trayectos con cupos_disponibles = 0.
--
-- Los bloques ignoran el error de Oracle que indica que el cambio ya estaba aplicado:
-- ORA-01430 (la columna ya existe), ORA-01442 (ya es NOT NULL),
-- ORA-02443 (la restricción no existe) y ORA-00955 (el índice ya existe).

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE trayectos ADD (cupos_disponibles NUMBER(10))';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1430 THEN
      RAISE;
    END IF;
END;
/

UPDATE trayectos SET cupos_disponibles = cupos WHERE cupos_disponibles IS NULL
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE trayectos MODIFY (cupos_disponibles NOT NULL)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -1442 THEN
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE trayectos DROP CONSTRAINT trayectos_cupos_disponibles_validos';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN
      RAISE;
    END IF;
END;
/

ALTER TABLE trayectos ADD CONSTRAINT trayectos_cupos_disponibles_validos
  CHECK (cupos_disponibles BETWEEN 0 AND cupos)
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX trayectos_busqueda_idx ON trayectos (sede_destino_id, fecha, hora)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
