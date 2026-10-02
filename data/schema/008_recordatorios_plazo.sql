-- Avisos de «el plazo cierra pronto» ya enviados, uno por suscripción y
-- convocatoria. Sin esto, una convocatoria que cierra en 3 días se avisaría
-- tres mañanas seguidas. Lo usa scrapers/notificar.py.
-- Las dos FK en cascada: darse de baja o purgar una convocatoria limpia sus avisos.
CREATE TABLE IF NOT EXISTS recordatorios_plazo (
    suscripcion_id   UUID NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
    convocatoria_id  TEXT NOT NULL REFERENCES convocatorias(id) ON DELETE CASCADE,
    enviado_en       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (suscripcion_id, convocatoria_id)
);
CREATE INDEX IF NOT EXISTS idx_recordatorios_plazo_conv ON recordatorios_plazo (convocatoria_id);
