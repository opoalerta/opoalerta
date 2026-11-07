-- Corrección puntual: ámbito de lo ya guardado del BOA (#94).
--
-- Hasta el arreglo de scrapers/boa.py, todo lo del BOA se guardaba con
-- ambito = 'autonomico'. El scraper ya lo deriva del emisor de II.b
-- (<h4 class="boaemisor">), que guarda tal cual en `organismo`; este UPDATE
-- aplica la misma regla a lo anterior:
--   AYUNTAMIENTO / COMARCA / DIPUTACIÓN / MANCOMUNIDAD -> local
--   UNIVERSIDAD                                         -> universidad
--
-- Uso: Actions → «Purga puntual (manual)» con
-- fichero=005_boa_ambito_por_emisor.sql. Sin confirmar hace un ensayo con
-- ROLLBACK; con confirmar=BORRAR lo aplica (aquí solo actualiza).

BEGIN;

SELECT split_part(upper(trim(organismo)), ' ', 1) AS cabecera, ambito, count(*)
FROM convocatorias
WHERE id LIKE 'boa:%'
GROUP BY 1, 2
ORDER BY 3 DESC;

UPDATE convocatorias
SET ambito = 'local'
WHERE id LIKE 'boa:%'
  AND ambito = 'autonomico'
  AND split_part(upper(trim(organismo)), ' ', 1) IN (
    'AYUNTAMIENTO', 'COMARCA', 'DIPUTACIÓN', 'MANCOMUNIDAD'
  );

UPDATE convocatorias
SET ambito = 'universidad'
WHERE id LIKE 'boa:%'
  AND ambito = 'autonomico'
  AND split_part(upper(trim(organismo)), ' ', 1) = 'UNIVERSIDAD';

COMMIT;
