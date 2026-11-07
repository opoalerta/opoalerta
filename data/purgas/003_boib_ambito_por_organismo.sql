-- Corrección puntual: ámbito de lo ya guardado del BOIB (#94).
--
-- Hasta el arreglo de scrapers/boib.py, todo lo del BOIB se guardaba con
-- ambito = 'autonomico'. El scraper ya lo deriva de la cabecera del organismo
-- que convoca (<h3 class="organisme">), que guarda tal cual en `organismo`; este
-- UPDATE aplica la misma regla a lo anterior:
--   AYUNTAMIENTO / CONSEJO INSULAR / MANCOMUNIDAD -> local
--   UNIVERSIDAD                                     -> universidad
--
-- Uso: ejecutar desde Actions → «Purga puntual (manual)» con
-- fichero=003_boib_ambito_por_organismo.sql. Sin confirmar hace un ensayo con
-- ROLLBACK que imprime el recuento y las filas que cambiaría; con
-- confirmar=BORRAR lo aplica (aquí no borra nada, solo actualiza).

BEGIN;

SELECT split_part(upper(trim(organismo)), ' ', 1) AS cabecera, ambito, count(*)
FROM convocatorias
WHERE id LIKE 'boib:%'
GROUP BY 1, 2
ORDER BY 3 DESC;

UPDATE convocatorias
SET ambito = 'local'
WHERE id LIKE 'boib:%'
  AND ambito = 'autonomico'
  AND (
    upper(trim(organismo)) LIKE 'AYUNTAMIENTO %'
    OR upper(trim(organismo)) LIKE 'CONSEJO INSULAR %'
    OR upper(trim(organismo)) LIKE 'MANCOMUNIDAD %'
  );

UPDATE convocatorias
SET ambito = 'universidad'
WHERE id LIKE 'boib:%'
  AND ambito = 'autonomico'
  AND upper(trim(organismo)) LIKE 'UNIVERSIDAD %';

COMMIT;
