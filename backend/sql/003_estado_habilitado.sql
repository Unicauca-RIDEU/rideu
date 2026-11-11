-- Permite el estado «Habilitado» en bases que ya tenían el chequeo de E01.
-- El bloque ignora ORA-02443 (la restricción no existe) al quitar la anterior.

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE usuarios DROP CONSTRAINT usuarios_estado_valido';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -2443 THEN
      RAISE;
    END IF;
END;
/

ALTER TABLE usuarios ADD CONSTRAINT usuarios_estado_valido
  CHECK (estado IN ('Sin verificar', 'Verificada', 'Habilitado'))
/
