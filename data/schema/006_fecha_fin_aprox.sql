-- Marca si fecha_fin_plazo es aproximada (calculada en días hábiles con festivos
-- solo nacionales; puede quedarse 1-2 días corta por festivos autonómicos/locales).
-- La rellena el pase de enriquecimiento (scrapers/enriquecer.py).
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS fecha_fin_aprox BOOLEAN NOT NULL DEFAULT FALSE;
