-- Usuario, según el registro de Ride U.
-- El diagrama solo nombra la entidad; estos son sus atributos de cuenta.
--
-- Oracle Database 19c o superior. Cada sentencia termina con una línea «/».
-- El bloque ignora ORA-00955 (el objeto ya existe) para poder repetir la migración.
-- El id es un UUID en texto que genera la aplicación.

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE usuarios (
      id VARCHAR2(36) NOT NULL,
      nombre VARCHAR2(120 CHAR) NOT NULL,
      correo VARCHAR2(254 CHAR) NOT NULL,
      contrasena_hash VARCHAR2(100) NOT NULL,
      whatsapp VARCHAR2(13) NOT NULL,
      estado VARCHAR2(20 CHAR) DEFAULT 'Sin verificar' NOT NULL,
      token_verificacion_hash VARCHAR2(64) NOT NULL,
      token_verificacion_expira TIMESTAMP WITH TIME ZONE NOT NULL,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT usuarios_pk PRIMARY KEY (id),
      CONSTRAINT usuarios_correo_unico UNIQUE (correo),
      CONSTRAINT usuarios_estado_valido CHECK (estado IN ('Sin verificar', 'Verificada', 'Habilitado')),
      CONSTRAINT usuarios_correo_institucional CHECK (
        REGEXP_LIKE(correo, '^[^@[:space:]]+@unicauca\.edu\.co$')
      ),
      CONSTRAINT usuarios_whatsapp_colombia CHECK (REGEXP_LIKE(whatsapp, '^\+57[3][0-9]{9}$'))
    )
  ]';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
