-- Permite el estado «Habilitado» en bases que ya tenían el chequeo de E01.

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_estado_valido;

ALTER TABLE usuarios ADD CONSTRAINT usuarios_estado_valido
  CHECK (estado IN ('Sin verificar', 'Verificada', 'Habilitado'));
