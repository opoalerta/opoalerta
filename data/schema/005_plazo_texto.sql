-- Añade la frase literal del plazo de presentación (extraída del texto oficial).
-- fecha_fin_plazo se calcula solo para plazos en días naturales; en hábiles se
-- guarda únicamente esta frase (ver scrapers/common/plazo.py).
ALTER TABLE convocatorias ADD COLUMN IF NOT EXISTS plazo_texto TEXT;
