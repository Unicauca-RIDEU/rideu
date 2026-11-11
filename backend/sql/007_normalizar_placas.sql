-- Formato único de placa «ABC 123» (E02-HU03) para las filas guardadas antes de que
-- la API normalizara la placa. Solo cambia el formato; no borra ni fusiona filas.
-- Si dos filas corresponden a la misma placa (por ejemplo «abc123» y «ABC 123»),
-- se dejan como están para que alguien las revise.
-- El parámetro 'c' hace la comparación sensible a mayúsculas sea cual sea la sesión.

UPDATE vehiculos v
SET placa = UPPER(SUBSTR(REGEXP_REPLACE(v.placa, '[[:space:]]', ''), 1, 3))
            || ' ' ||
            SUBSTR(REGEXP_REPLACE(v.placa, '[[:space:]]', ''), 4)
WHERE REGEXP_LIKE(v.placa, '^[A-Za-z]{3} ?[0-9]{3}$', 'c')
  AND NOT REGEXP_LIKE(v.placa, '^[ABCDEFGHIJKLMNOPQRSTUVWXYZ]{3} [0-9]{3}$', 'c')
  AND NOT EXISTS (
    SELECT 1
    FROM vehiculos o
    WHERE o.id <> v.id
      AND UPPER(REGEXP_REPLACE(o.placa, '[[:space:]]', '')) = UPPER(REGEXP_REPLACE(v.placa, '[[:space:]]', ''))
  )
/
