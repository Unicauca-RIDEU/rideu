-- Crea el usuario (esquema) de Ride U en Oracle Database 19c o superior.
-- No lo ejecuta npm run db:migrate: lo ejecuta una sola vez un administrador (SYSTEM o SYS),
-- conectado a la base conectable (PDB) donde vivirá la aplicación; por ejemplo:
--   sqlplus system@localhost:1521/FREEPDB1 @backend/sql/admin/crear_usuario.sql
--
-- Antes de ejecutarlo, cambia CAMBIA_ESTA_CONTRASENA por la contraseña real.
-- Esa contraseña va en DB_PASSWORD del archivo .env y no se sube al repositorio.

CREATE USER rideu IDENTIFIED BY "CAMBIA_ESTA_CONTRASENA"
  DEFAULT TABLESPACE users
  QUOTA UNLIMITED ON users
/

-- La aplicación solo necesita conectarse y crear sus tablas (los índices van incluidos).
GRANT CREATE SESSION, CREATE TABLE TO rideu
/
