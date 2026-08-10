-- Purga puntual: anuncios del BOA que nunca fueron ofertas de empleo (#93).
--
-- Hasta el arreglo de scrapers/boa.py, el scraper del BOA guardaba el boletín
-- entero: subvenciones, expedientes de información pública y modificaciones de
-- crédito acababan en la tabla como convocatorias. El parámetro `SEC=OPRSS` de
-- la URL no filtra nada (el CGI del BOA lo ignora) y no había filtro propio.
--
-- Este fichero borra lo que quedó guardado. No es una migración de esquema: se
-- ejecuta una vez y no forma parte de data/schema/.
--
-- La lista de abajo NO es una heurística sobre títulos: son los 215 ids que
-- devuelve el scraper ya arreglado al releer los boletines del 1 de julio al 10
-- de agosto de 2026, o sea los documentos que están en la subsección «II.b
-- Oposiciones y concursos». Todo lo demás de ese rango sobra.
--
-- Efecto medido contra producción el 10 de agosto de 2026:
--   BOA con plazo abierto    404 -> 112   (se borran 292)
--   Total del sitio        1.568 -> 1.276
--
-- Uso:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -f data/purgas/001_boa_fuera_de_oposiciones.sql

BEGIN;

CREATE TEMP TABLE boa_validas (id TEXT PRIMARY KEY) ON COMMIT DROP;

INSERT INTO boa_validas (id) VALUES
    ('boa:20260701-10'), ('boa:20260701-11'), ('boa:20260701-12'), ('boa:20260701-13'),
    ('boa:20260701-14'), ('boa:20260701-15'), ('boa:20260701-16'), ('boa:20260701-17'),
    ('boa:20260701-18'), ('boa:20260701-6'), ('boa:20260701-7'), ('boa:20260701-8'),
    ('boa:20260701-9'), ('boa:20260702-10'), ('boa:20260702-11'), ('boa:20260702-12'),
    ('boa:20260703-10'), ('boa:20260703-11'), ('boa:20260703-12'), ('boa:20260703-13'),
    ('boa:20260703-14'), ('boa:20260703-3'), ('boa:20260703-4'), ('boa:20260703-5'),
    ('boa:20260703-6'), ('boa:20260703-7'), ('boa:20260703-8'), ('boa:20260703-9'),
    ('boa:20260706-13'), ('boa:20260706-14'), ('boa:20260706-15'), ('boa:20260706-16'),
    ('boa:20260706-17'), ('boa:20260706-18'), ('boa:20260706-19'), ('boa:20260706-20'),
    ('boa:20260706-21'), ('boa:20260706-22'), ('boa:20260707-10'), ('boa:20260707-11'),
    ('boa:20260707-12'), ('boa:20260707-3'), ('boa:20260707-4'), ('boa:20260707-5'),
    ('boa:20260707-6'), ('boa:20260707-7'), ('boa:20260707-8'), ('boa:20260707-9'),
    ('boa:20260708-10'), ('boa:20260708-11'), ('boa:20260708-12'), ('boa:20260708-13'),
    ('boa:20260708-14'), ('boa:20260708-5'), ('boa:20260708-6'), ('boa:20260708-7'),
    ('boa:20260708-8'), ('boa:20260708-9'), ('boa:20260709-6'), ('boa:20260709-7'),
    ('boa:20260709-8'), ('boa:20260710-11'), ('boa:20260710-12'), ('boa:20260713-10'),
    ('boa:20260713-11'), ('boa:20260713-3'), ('boa:20260713-4'), ('boa:20260713-5'),
    ('boa:20260713-6'), ('boa:20260713-7'), ('boa:20260713-8'), ('boa:20260713-9'),
    ('boa:20260714-4'), ('boa:20260714-5'), ('boa:20260714-6'), ('boa:20260714-7'),
    ('boa:20260714-8'), ('boa:20260714-9'), ('boa:20260715-5'), ('boa:20260716-2'),
    ('boa:20260716-3'), ('boa:20260716-4'), ('boa:20260716-5'), ('boa:20260716-6'),
    ('boa:20260716-7'), ('boa:20260717-10'), ('boa:20260717-11'), ('boa:20260717-7'),
    ('boa:20260717-8'), ('boa:20260717-9'), ('boa:20260721-6'), ('boa:20260721-7'),
    ('boa:20260721-8'), ('boa:20260721-9'), ('boa:20260722-4'), ('boa:20260722-5'),
    ('boa:20260723-10'), ('boa:20260723-4'), ('boa:20260723-5'), ('boa:20260723-6'),
    ('boa:20260723-7'), ('boa:20260723-8'), ('boa:20260723-9'), ('boa:20260724-10'),
    ('boa:20260724-11'), ('boa:20260724-12'), ('boa:20260724-13'), ('boa:20260724-14'),
    ('boa:20260724-2'), ('boa:20260724-3'), ('boa:20260724-4'), ('boa:20260724-5'),
    ('boa:20260724-6'), ('boa:20260724-7'), ('boa:20260724-8'), ('boa:20260724-9'),
    ('boa:20260727-10'), ('boa:20260727-11'), ('boa:20260727-12'), ('boa:20260727-13'),
    ('boa:20260727-14'), ('boa:20260727-15'), ('boa:20260727-16'), ('boa:20260727-17'),
    ('boa:20260727-18'), ('boa:20260727-19'), ('boa:20260727-20'), ('boa:20260727-21'),
    ('boa:20260727-22'), ('boa:20260727-23'), ('boa:20260727-24'), ('boa:20260727-7'),
    ('boa:20260727-8'), ('boa:20260727-9'), ('boa:20260728-10'), ('boa:20260728-11'),
    ('boa:20260728-12'), ('boa:20260728-13'), ('boa:20260728-14'), ('boa:20260728-15'),
    ('boa:20260728-16'), ('boa:20260728-17'), ('boa:20260728-18'), ('boa:20260728-19'),
    ('boa:20260728-7'), ('boa:20260728-8'), ('boa:20260728-9'), ('boa:20260729-10'),
    ('boa:20260729-4'), ('boa:20260729-5'), ('boa:20260729-6'), ('boa:20260729-7'),
    ('boa:20260729-8'), ('boa:20260729-9'), ('boa:20260730-13'), ('boa:20260730-14'),
    ('boa:20260730-15'), ('boa:20260730-16'), ('boa:20260730-17'), ('boa:20260730-18'),
    ('boa:20260730-19'), ('boa:20260730-20'), ('boa:20260730-21'), ('boa:20260731-13'),
    ('boa:20260731-14'), ('boa:20260731-15'), ('boa:20260731-16'), ('boa:20260731-17'),
    ('boa:20260731-18'), ('boa:20260731-19'), ('boa:20260731-20'), ('boa:20260731-21'),
    ('boa:20260731-22'), ('boa:20260731-23'), ('boa:20260731-24'), ('boa:20260731-25'),
    ('boa:20260731-26'), ('boa:20260731-27'), ('boa:20260803-10'), ('boa:20260803-11'),
    ('boa:20260803-12'), ('boa:20260803-13'), ('boa:20260803-14'), ('boa:20260803-15'),
    ('boa:20260803-16'), ('boa:20260803-17'), ('boa:20260803-18'), ('boa:20260803-19'),
    ('boa:20260804-11'), ('boa:20260804-12'), ('boa:20260804-13'), ('boa:20260805-10'),
    ('boa:20260805-11'), ('boa:20260805-12'), ('boa:20260805-13'), ('boa:20260805-14'),
    ('boa:20260805-15'), ('boa:20260805-16'), ('boa:20260805-8'), ('boa:20260805-9'),
    ('boa:20260806-1'), ('boa:20260806-2'), ('boa:20260806-3'), ('boa:20260806-4'),
    ('boa:20260806-5'), ('boa:20260806-6'), ('boa:20260807-10'), ('boa:20260807-8'),
    ('boa:20260807-9'), ('boa:20260810-10'), ('boa:20260810-11'), ('boa:20260810-12'),
    ('boa:20260810-13'), ('boa:20260810-14'), ('boa:20260810-9');

-- Antes de borrar: qué se queda y qué se va.
SELECT
    count(*) FILTER (WHERE id IN (SELECT id FROM boa_validas))     AS se_quedan,
    count(*) FILTER (WHERE id NOT IN (SELECT id FROM boa_validas)) AS se_borran
FROM convocatorias
WHERE fuente_codigo = 'boa'
  AND fecha_publicacion BETWEEN DATE '2026-07-01' AND DATE '2026-08-10';

-- Filas del BOA fuera del rango releído: deberían ser 0. Si no lo son, hay que
-- ampliar el rango y regenerar la lista antes de borrar nada.
SELECT count(*) AS boa_fuera_de_rango
FROM convocatorias
WHERE fuente_codigo = 'boa'
  AND (fecha_publicacion < DATE '2026-07-01' OR fecha_publicacion > DATE '2026-08-10');

DELETE FROM convocatorias
WHERE fuente_codigo = 'boa'
  AND fecha_publicacion BETWEEN DATE '2026-07-01' AND DATE '2026-08-10'
  AND id NOT IN (SELECT id FROM boa_validas);

COMMIT;
