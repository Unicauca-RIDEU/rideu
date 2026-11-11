-- Vehículo y licencia del conductor.
-- El diagrama nombra las entidades; estos son sus atributos y la relación con el usuario.

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE vehiculos (
      id VARCHAR2(36) NOT NULL,
      usuario_id VARCHAR2(36) NOT NULL,
      placa VARCHAR2(20 CHAR) NOT NULL,
      marca VARCHAR2(100 CHAR) NOT NULL,
      modelo VARCHAR2(100 CHAR) NOT NULL,
      color VARCHAR2(100 CHAR) NOT NULL,
      capacidad_pasajeros NUMBER(10) NOT NULL,
      CONSTRAINT vehiculos_pk PRIMARY KEY (id),
      CONSTRAINT vehiculos_usuario_fk FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT vehiculos_placa_unica UNIQUE (placa),
      CONSTRAINT vehiculos_capacidad_valida CHECK (capacidad_pasajeros > 0)
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
  EXECUTE IMMEDIATE 'CREATE INDEX vehiculos_usuario_id_idx ON vehiculos (usuario_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/

-- fecha_vencimiento es un día sin hora: el DATE de Oracle se guarda a las 00:00.
BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE licencias (
      id VARCHAR2(36) NOT NULL,
      usuario_id VARCHAR2(36) NOT NULL,
      categoria VARCHAR2(100 CHAR) NOT NULL,
      fecha_vencimiento DATE NOT NULL,
      CONSTRAINT licencias_pk PRIMARY KEY (id),
      CONSTRAINT licencias_usuario_fk FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT licencias_fecha_sin_hora CHECK (fecha_vencimiento = TRUNC(fecha_vencimiento))
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
  EXECUTE IMMEDIATE 'CREATE INDEX licencias_usuario_id_idx ON licencias (usuario_id)';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
