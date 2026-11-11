-- Sesiones abiertas al iniciar sesión.
-- Solo se guarda el hash del token; el token viaja al cliente una única vez.

BEGIN
  EXECUTE IMMEDIATE q'[
    CREATE TABLE sesiones (
      id VARCHAR2(36) NOT NULL,
      usuario_id VARCHAR2(36) NOT NULL,
      token_hash VARCHAR2(64) NOT NULL,
      expira TIMESTAMP WITH TIME ZONE NOT NULL,
      creado_en TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL,
      CONSTRAINT sesiones_pk PRIMARY KEY (id),
      CONSTRAINT sesiones_usuario_fk FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE,
      CONSTRAINT sesiones_token_unico UNIQUE (token_hash)
    )
  ]';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLCODE != -955 THEN
      RAISE;
    END IF;
END;
/
