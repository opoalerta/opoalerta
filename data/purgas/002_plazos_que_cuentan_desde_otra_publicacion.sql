-- Corrección puntual de fechas de fin de plazo mal calculadas.
--
-- 1. Plazos que no empiezan con la publicación que leímos. Muchas convocatorias
--    autonómicas y locales publican las bases en su boletín, pero abren el plazo
--    «a partir del día siguiente al de la publicación del extracto en el Boletín
--    Oficial del Estado», que sale días o semanas después; otras cuentan desde
--    «el último de los anuncios». El pase de enriquecimiento contaba desde el
--    boletín autonómico, así que la fecha salía demasiado temprana y la web
--    retiraba del listado convocatorias cuyo plazo podía no haber empezado.
--    Ahora `cuenta_desde_otra_publicacion` deja esas fechas vacías (la frase
--    literal se conserva). Aquí se vacían las ya guardadas.
--
-- 2. Plazos en días naturales que acababan en sábado o domingo. Por la Ley
--    39/2015 (art. 30.5) se prorrogan al primer día hábil siguiente; antes no se
--    aplicaba. Aquí se mueven al lunes o al siguiente día no festivo nacional.
--
-- El CIDO queda fuera: su fecha de fin viene de la API de la Diputació, no de
-- este cálculo.
--
-- Efecto medido contra producción el 7 de noviembre de 2026:
--   fechas sin inicio fiable   88 (85 de ellas retiraban la convocatoria de la web)
--   naturales en fin de semana 33
--
-- Uso:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--        -f data/purgas/002_plazos_que_cuentan_desde_otra_publicacion.sql

BEGIN;

UPDATE convocatorias
SET fecha_fin_plazo = NULL,
    fecha_fin_aprox = FALSE,
    actualizada_en = now()
WHERE fuente_codigo <> 'cido'
  AND fecha_fin_plazo IS NOT NULL
  AND plazo_texto <> ''
  AND (
        (fuente_codigo <> 'boe' AND plazo_texto ~* 'Bolet[íi]n Oficial del Estado|\mBOE\M')
     OR plazo_texto ~* '[úu]ltimo de los anuncios'
  );

UPDATE convocatorias c
SET fecha_fin_plazo = (
        SELECT min(d)::date
        FROM generate_series(c.fecha_fin_plazo, c.fecha_fin_plazo + 7, INTERVAL '1 day') AS d
        WHERE extract(isodow FROM d) < 6
          AND to_char(d, 'MM-DD') NOT IN
              ('01-01', '01-06', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25')
    ),
    actualizada_en = now()
WHERE c.fuente_codigo <> 'cido'
  AND NOT c.fecha_fin_aprox
  AND c.fecha_fin_plazo IS NOT NULL
  AND c.plazo_texto ~* 'naturales'
  AND extract(isodow FROM c.fecha_fin_plazo) >= 6;

COMMIT;
