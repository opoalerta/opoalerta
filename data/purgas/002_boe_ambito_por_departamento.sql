-- Corrección puntual: ámbito de lo ya guardado del BOE (#94).
--
-- Hasta el arreglo de scrapers/boe.py, todo lo del BOE se guardaba con
-- ambito = 'estatal', aunque la sección II.B agrupa por departamento y dos de
-- ellos no son la Administración del Estado: «ADMINISTRACIÓN LOCAL» y
-- «UNIVERSIDADES». El scraper ya deriva el ámbito de ahí; esto corrige lo que
-- quedó guardado antes.
--
-- No es un heurístico sobre títulos: el scraper guarda el nombre del
-- departamento tal cual en `organismo`, así que el UPDATE aplica exactamente la
-- misma regla que boe.py. Reingestar el histórico daría el mismo resultado,
-- con cientos de peticiones al BOE.
--
-- Uso: primero ejecutar esta consulta de forma independiente y validar el
-- recuento. Solo después, ejecutar el fichero completo, que confirma los
-- cambios automáticamente.
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -c "SELECT organismo, ambito, count(*) FROM convocatorias
--         WHERE id LIKE 'boe:%'
--           AND upper(trim(organismo)) IN ('ADMINISTRACIÓN LOCAL', 'UNIVERSIDADES')
--         GROUP BY organismo, ambito ORDER BY organismo;"
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -f data/purgas/002_boe_ambito_por_departamento.sql

BEGIN;

SELECT organismo, ambito, count(*)
FROM convocatorias
WHERE id LIKE 'boe:%'
  AND upper(trim(organismo)) IN ('ADMINISTRACIÓN LOCAL', 'UNIVERSIDADES')
GROUP BY organismo, ambito
ORDER BY organismo;

UPDATE convocatorias
SET ambito = 'local'
WHERE id LIKE 'boe:%'
  AND upper(trim(organismo)) = 'ADMINISTRACIÓN LOCAL'
  AND ambito = 'estatal';

UPDATE convocatorias
SET ambito = 'universidad'
WHERE id LIKE 'boe:%'
  AND upper(trim(organismo)) = 'UNIVERSIDADES'
  AND ambito = 'estatal';

COMMIT;
