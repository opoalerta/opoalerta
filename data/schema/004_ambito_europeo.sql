-- Añade 'europeo' a los ámbitos permitidos (oposiciones de la UE / EPSO).
ALTER TABLE convocatorias DROP CONSTRAINT IF EXISTS convocatorias_ambito_check;
ALTER TABLE convocatorias ADD CONSTRAINT convocatorias_ambito_check
    CHECK (ambito IN ('estatal','autonomico','provincial','local','universidad','europeo','otro'));
