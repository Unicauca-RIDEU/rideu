# Migración de PostgreSQL a Oracle Database

La base de datos de Ride U pasó de PostgreSQL 16 a Oracle Database (19c o superior). El backend ya no depende de PostgreSQL: se retiró el driver `pg` y todo el acceso a datos usa el driver oficial `oracledb` en modo Thin (sin Oracle Instant Client). La API, las respuestas JSON y el frontend no cambiaron.

Las instrucciones de instalación están en el [README de la raíz](../../README.md#base-de-datos-oracle). Los documentos de pruebas y las evidencias de los sprints 1 a 3 corresponden a ejecuciones reales sobre PostgreSQL y se conservan sin cambios.

## Alcance

| Elemento | Antes | Ahora |
| --- | --- | --- |
| Driver | `pg` 8 | `oracledb` 26 (modo Thin) |
| Conexión | `DATABASE_URL` | `DB_USER`, `DB_PASSWORD`, `DB_CONNECT_STRING` (y `DB_POOL_MIN`, `DB_POOL_MAX` opcionales) |
| Capa de conexión | `pg.Pool` | `backend/src/config/database.js`: pool de Oracle con `pool.query(sql, binds)` y `pool.connect()` para transacciones |
| Scripts SQL | 8 archivos PostgreSQL | Los mismos 8 archivos traducidos, más `008_indices_claves_foraneas.sql` y `admin/crear_usuario.sql` |
| Datos | — | Oracle arranca vacío, con las 7 sedes sembradas. No se trasladaron datos de PostgreSQL |

## Modelo de datos

Se conservan las 6 tablas, sus columnas, relaciones, cardinalidades y restricciones. No se agregaron ni quitaron atributos.

| PostgreSQL | Oracle | Motivo |
| --- | --- | --- |
| `UUID DEFAULT gen_random_uuid()` | `VARCHAR2(36)`; el UUID lo genera la aplicación (`crypto.randomUUID()`) | Oracle 19c no tiene tipo ni función UUID; así el JSON conserva el mismo formato |
| `TEXT` | `VARCHAR2(n CHAR)` | Longitudes: nombre 120, correo 254, marca, modelo, color y categoría 100, origen y dirección 200, placa 20 |
| `TIMESTAMPTZ`, `NOW()` | `TIMESTAMP WITH TIME ZONE`, `SYSTIMESTAMP` | Instantes exactos (`creado_en`, `expira`, `token_verificacion_expira`) |
| `DATE` (`trayectos.fecha`, `licencias.fecha_vencimiento`) | `DATE` a las 00:00, con `CHECK (fecha = TRUNC(fecha))` | El `DATE` de Oracle incluye hora; la restricción impide guardarla |
| `TIME` (`trayectos.hora`) | `VARCHAR2(5)` en formato `HH24:MI`, con `CHECK` de formato | Oracle no tiene un tipo solo de hora; el texto conserva el orden cronológico |
| `INTEGER` | `NUMBER(10)` | — |
| `correo ~ '…'` | `REGEXP_LIKE(correo, '…')` | — |
| `CHECK (btrim(origen) <> '')` | `CHECK (TRIM(origen) IS NOT NULL)` | En Oracle la cadena vacía es `NULL` |
| `REFERENCES … ON DELETE CASCADE` | Igual, con nombre explícito (`…_fk`) | — |
| Claves primarias sin nombre | `…_pk` | — |

Restricciones nuevas, todas para conservar una regla que antes daba el tipo de dato: `trayectos_fecha_sin_hora`, `trayectos_hora_valida` y `licencias_fecha_sin_hora`.

## Consultas

| PostgreSQL | Oracle |
| --- | --- |
| Parámetros `$1…$n` en arreglo | Binds con nombre (`:correo`) en objeto |
| `RETURNING a, b` | `RETURNING a, b INTO :r_a, :r_b`; la capa de conexión convierte los binds de salida en filas |
| `LIMIT 1` | `FETCH FIRST 1 ROWS ONLY` |
| `LEFT JOIN LATERAL (…) ON TRUE` | `OUTER APPLY (…)` |
| `SELECT EXISTS (…)` (booleano) | `SELECT COUNT(*) … AND ROWNUM = 1` (0 o 1) |
| `t.fecha + t.hora` y `$n::timestamp` | `TO_DATE(TO_CHAR(t.fecha, 'YYYY-MM-DD') \|\| ' ' \|\| t.hora, 'YYYY-MM-DD HH24:MI')` comparado con `TO_DATE(:ahora_colombia, …)` |
| `NOW() AT TIME ZONE 'America/Bogota'` | `CAST(SYSTIMESTAMP AT TIME ZONE 'America/Bogota' AS DATE)` |
| `INSERT … ON CONFLICT DO NOTHING` | `MERGE … WHEN NOT MATCHED` |
| `CREATE … IF NOT EXISTS`, `DROP … IF EXISTS` | Bloque PL/SQL que ignora solo el error «ya existe» o «no existe» |
| `BEGIN` / `COMMIT` / `ROLLBACK` como consultas | `cliente.commit()` / `cliente.rollback()`; las consultas sueltas confirman con `autoCommit` |
| Error `23505` y `error.constraint` | `error.code === "ORA-00001"`; la capa de conexión deja el nombre de la restricción en `error.constraint` |
| Columnas en minúscula | Oracle las devuelve en mayúscula; la capa de conexión las pasa a minúscula |

En los archivos de `backend/sql/` cada sentencia termina con una línea `/`, porque `oracledb` ejecuta una sentencia por llamada. Ese formato también funciona en SQL*Plus y SQLcl.

## Errores encontrados y solución

| # | Error | Causa | Solución |
| --- | --- | --- | --- |
| 1 | `ORA-00060` (interbloqueo) en una prueba de integración sobre Oracle Free 23.26, al borrar un usuario mientras otro proceso creaba sesiones | En Oracle, borrar una fila padre bloquea toda la tabla hija si la clave foránea no está indexada. `sesiones.usuario_id` y `trayectos.vehiculo_id` no tenían índice | `backend/sql/008_indices_claves_foraneas.sql`. Después, 8 ejecuciones seguidas de la integración en cada versión sin repetirse el error. No se hizo una prueba aislada que reproduzca el interbloqueo quitando el índice |
| 2 | Las pruebas unitarias no cargaban (`does not provide an export named 'SALIDA'`) y 2 fallaban por el código `23505` | Las pruebas simulan `config/database.js` y comprobaban SQL y códigos de PostgreSQL | Se adaptaron 10 archivos de `backend/tests/` a los binds con nombre, a `commit()` / `rollback()` y a `ORA-00001`. Salida inicial en `evidencias/migracion-oracle/unitarias/ejecucion-inicial.txt` |
| 3 | La nueva prueba de integración de restricciones se quedaba colgada de forma intermitente | Defecto de la propia prueba: lanzaba nueve inserciones inválidas a la vez y dejaba rechazos sin capturar | Las inserciones se ejecutan una por una. Después, 10 ejecuciones seguidas correctas en cada versión |
| 4 | Docker Hub (límite de peticiones), `ghcr.io` y el registro de Oracle no eran accesibles desde el entorno de trabajo | Política de red del entorno | Las imágenes se descargaron del espejo `mirror.gcr.io/gvenzl/…` |

## Pruebas ejecutadas

Ejecutadas el 11 de noviembre de 2026 contra dos bases reales en contenedores: **Oracle Database 21c Express Edition 21.0.0.0.0** y **Oracle AI Database 26ai Free 23.26.3.0.0**.

| Prueba | Resultado | Evidencia |
| --- | --- | --- |
| Unitarias (Jest, base simulada), antes de adaptar las pruebas | 10 de 16 archivos no cargaron; de 145 pruebas ejecutadas, 2 fallaron | `evidencias/migracion-oracle/unitarias/ejecucion-inicial.txt` |
| Unitarias (Jest), ejecución final con cobertura | 262 de 262 aprobadas; cobertura global 97,79 % de líneas, por encima del umbral en todas las carpetas | `evidencias/migracion-oracle/unitarias/ejecucion-final.txt` |
| Migraciones (`db:migrate`), dos veces seguidas en cada versión | Correctas e idempotentes | — |
| Integración (`test:integration`) en 21c XE | 19 de 19 aprobadas, 0 omitidas | `evidencias/migracion-oracle/integracion/ejecucion-oracle-21c-xe.txt` |
| Integración en Free 23.26 | 19 de 19 aprobadas, 0 omitidas | `evidencias/migracion-oracle/integracion/ejecucion-oracle-free-23.26.txt` |
| Integración con el proceso en zona horaria `America/Bogota` y `Asia/Tokyo` | 19 de 19 en ambas versiones | — |
| Funcionales en Chromium (frontend + backend + Oracle), 17 pasos | 17 de 17 aprobados en cada versión | `evidencias/migracion-oracle/funcionales/` |
| Build del frontend | Correcto | — |

La integración (`backend/src/db/oracle.test.js` y las tres pruebas que ya existían) cubre: conexión; crear, consultar, actualizar y eliminar; relaciones y borrado en cascada; restricciones `CHECK`, `NOT NULL`, unicidad y claves foráneas; reversión y confirmación de transacciones; y todos los endpoints de la API con sus respuestas JSON.

## Pendiente y limitaciones

- **Oracle 19c no se probó directamente**: no hay una imagen de 19c de libre descarga. El SQL usa solo sintaxis disponible desde 12.2 y se probó en 21c y en 23.26; antes de usar una base 19c conviene ejecutar `npm run db:migrate` y `npm run test:integration` contra ella.
- **Longitud de los textos**: PostgreSQL aceptaba textos sin límite en marca, modelo, color, categoría de licencia y origen; Oracle los limita (100 y 200 caracteres). Un valor más largo hoy produce un error 500. Las validaciones no se cambiaron porque hacerlo modifica reglas aprobadas; se propone agregar el límite en `validation/` con un mensaje 400.
- **Registro de pruebas**: no se actualizó `documentacion/pruebas-unitarias/Pruebas_Unitarias_RideU.xlsx` ni se crearon casos `CU-NN`; las salidas quedaron como `.txt`. Queda a decisión del responsable si los fallos de la ejecución inicial se registran como casos de ajuste.
- **SMTP**: el correo solo se probó en modo `console`.
