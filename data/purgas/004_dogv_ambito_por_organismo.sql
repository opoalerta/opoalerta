-- Corrección puntual: ámbito de lo ya guardado del DOGV (#94).
--
-- Hasta el arreglo de scrapers/dogv.py, todo lo del DOGV se guardaba con
-- ambito = 'autonomico'. El scraper ya lo deriva del campo `organismo` del JSON
-- del sumario, que guarda tal cual; este UPDATE aplica la misma regla a lo
-- anterior:
--   Ayuntamiento / Ajuntament / Diputación / Diputació /
--   Mancomunidad / Mancomunitat                         -> local
--   Universidad / Universitat                           -> universidad
--
-- Uso: Actions → «Purga puntual (manual)» con
-- fichero=004_dogv_ambito_por_organismo.sql. Sin confirmar hace un ensayo con
-- ROLLBACK; con confirmar=BORRAR lo aplica (aquí solo actualiza).

BEGIN;

SELECT split_part(lower(trim(organismo)), ' ', 1) AS cabecera, ambito, count(*)
FROM convocatorias
WHERE id LIKE 'dogv:%'
GROUP BY 1, 2
ORDER BY 3 DESC;

UPDATE convocatorias
SET ambito = 'local'
WHERE id LIKE 'dogv:%'
  AND ambito = 'autonomico'
  AND split_part(lower(trim(organismo)), ' ', 1) IN (
    'ayuntamiento', 'ajuntament', 'diputación', 'diputació', 'mancomunidad', 'mancomunitat'
  );

UPDATE convocatorias
SET ambito = 'universidad'
WHERE id LIKE 'dogv:%'
  AND ambito = 'autonomico'
  AND split_part(lower(trim(organismo)), ' ', 1) IN ('universidad', 'universitat');

COMMIT;
