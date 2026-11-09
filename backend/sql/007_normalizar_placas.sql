-- Formato único de placa «ABC 123» (E02-HU03) para las filas guardadas antes de que
-- la API normalizara la placa. Solo cambia el formato; no borra ni fusiona filas.
-- Si dos filas corresponden a la misma placa (por ejemplo «abc123» y «ABC 123»),
-- se dejan como están para que alguien las revise.

UPDATE vehiculos v
SET placa = upper(substr(regexp_replace(v.placa, '\s', '', 'g'), 1, 3))
            || ' ' ||
            substr(regexp_replace(v.placa, '\s', '', 'g'), 4)
WHERE v.placa ~ '^[A-Za-z]{3} ?[0-9]{3}$'
  AND v.placa !~ '^[A-Z]{3} [0-9]{3}$'
  AND NOT EXISTS (
    SELECT 1
    FROM vehiculos o
    WHERE o.id <> v.id
      AND upper(regexp_replace(o.placa, '\s', '', 'g')) = upper(regexp_replace(v.placa, '\s', '', 'g'))
  );
