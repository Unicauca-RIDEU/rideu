-- Índices de las claves foráneas que aún no tenían uno.
-- En Oracle, borrar una fila padre (por ejemplo un usuario) bloquea por completo la tabla hija
-- si la columna de la clave foránea no está indexada; con sesiones concurrentes eso produce
-- esperas e interbloqueos (ORA-00060). Los bloques ignoran ORA-00955 (el índice ya existe).

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX sesiones_usuario_id_idx ON sesiones (usuario_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/

BEGIN
  EXECUTE IMMEDIATE 'CREATE INDEX trayectos_vehiculo_id_idx ON trayectos (vehiculo_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
