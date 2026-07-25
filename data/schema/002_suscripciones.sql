-- OpoAlerta — suscripciones a alertas por email.
-- Doble opt-in: se crea con confirmada = FALSE y se activa al pulsar el enlace
-- de confirmación. El mismo token sirve para confirmar y para darse de baja.
-- Aplicar con: psql "$DATABASE_URL" -f data/schema/002_suscripciones.sql

CREATE TABLE IF NOT EXISTS suscripciones (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT NOT NULL,
    -- Filtros guardados (los mismos que el buscador). NULL = sin filtrar.
    q                 TEXT,
    ccaa              TEXT,
    ambito            TEXT,
    fuente_codigo     TEXT,
    confirmada        BOOLEAN NOT NULL DEFAULT FALSE,
    token             TEXT NOT NULL,
    creada_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmada_en     TIMESTAMPTZ,
    ultima_notificada TIMESTAMPTZ,
    -- Una persona no repite la misma búsqueda guardada.
    UNIQUE (email, q, ccaa, ambito, fuente_codigo)
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_token ON suscripciones (token);
CREATE INDEX IF NOT EXISTS idx_suscripciones_activas
    ON suscripciones (confirmada) WHERE confirmada = TRUE;
