-- Additive: does not change subscriptions or their existing tokens.
CREATE TABLE IF NOT EXISTS cuotas_alertas (
    clave TEXT PRIMARY KEY,
    usos INTEGER NOT NULL CHECK (usos > 0),
    caduca_en TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cuotas_alertas_caducidad ON cuotas_alertas(caduca_en);

-- Admission is atomic across all buckets and concurrent serverless instances.
-- Denied requests do not consume quota or create destination keys.
CREATE OR REPLACE FUNCTION consumir_cuota_alertas(politicas JSONB)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
    politica JSONB;
    cuota cuotas_alertas%ROWTYPE;
    instante TIMESTAMPTZ;
    espera INTEGER := 0;
BEGIN
    IF politicas IS NULL OR jsonb_typeof(politicas) <> 'array' THEN
        RAISE EXCEPTION 'Invalid quota policy';
    END IF;
    IF jsonb_array_length(politicas) NOT BETWEEN 1 AND 8 THEN
        RAISE EXCEPTION 'Invalid quota policy';
    END IF;
    PERFORM pg_advisory_xact_lock(184739, 1);
    instante := clock_timestamp();
    DELETE FROM cuotas_alertas WHERE caduca_en <= instante;
    FOR politica IN SELECT * FROM jsonb_array_elements(politicas) LOOP
        IF jsonb_typeof(politica) <> 'object'
           OR politica->>'key' IS NULL OR politica->>'limit' IS NULL OR politica->>'seconds' IS NULL
           OR length(politica->>'key') NOT BETWEEN 1 AND 160
           OR (politica->>'limit')::INTEGER NOT BETWEEN 1 AND 1000
           OR (politica->>'seconds')::INTEGER NOT BETWEEN 1 AND 86400 THEN
            RAISE EXCEPTION 'Invalid quota policy';
        END IF;
        SELECT * INTO cuota FROM cuotas_alertas WHERE clave = politica->>'key';
        IF FOUND AND cuota.usos >= (politica->>'limit')::INTEGER THEN
            espera := greatest(espera, ceil(extract(epoch FROM cuota.caduca_en - instante))::INTEGER);
        END IF;
    END LOOP;
    IF espera > 0 THEN RETURN espera; END IF;
    FOR politica IN SELECT * FROM jsonb_array_elements(politicas) LOOP
        INSERT INTO cuotas_alertas(clave, usos, caduca_en)
        VALUES (politica->>'key', 1, instante + make_interval(secs => (politica->>'seconds')::INTEGER))
        ON CONFLICT (clave) DO UPDATE SET usos = cuotas_alertas.usos + 1;
    END LOOP;
    RETURN 0;
END;
$$;
