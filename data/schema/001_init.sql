-- OpoAlerta — esquema inicial de base de datos.
-- Postgres estándar: portable entre Supabase, Neon y un Postgres self-hosted.
-- Aplicar con: psql "$DATABASE_URL" -f data/schema/001_init.sql

-- Fuentes oficiales (BOE, boletines autonómicos, portales de empleo).
CREATE TABLE IF NOT EXISTS fuentes (
    codigo      TEXT PRIMARY KEY,               -- 'boe', 'boja', 'bocm'…
    nombre      TEXT NOT NULL,                  -- 'Boletín Oficial del Estado'
    licencia    TEXT NOT NULL,                  -- condiciones de reutilización
    url_base    TEXT,
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    creada_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Convocatorias normalizadas (una fila = una convocatoria; ver JSON Schema).
CREATE TABLE IF NOT EXISTS convocatorias (
    id                    TEXT PRIMARY KEY,          -- '<fuente>:<id-oficial>'
    titulo                TEXT NOT NULL,
    organismo             TEXT NOT NULL,
    ambito                TEXT NOT NULL
        CHECK (ambito IN ('estatal','autonomico','provincial','local','universidad','europeo','otro')),
    ccaa                  TEXT,                       -- código ISO 3166-2:ES sin prefijo
    cuerpo                TEXT,
    grupo                 TEXT
        CHECK (grupo IS NULL OR grupo IN ('A1','A2','B','C1','C2','E','AP')),
    titulacion_requerida  TEXT,
    num_plazas            INTEGER CHECK (num_plazas IS NULL OR num_plazas >= 0),
    tipo_acceso           TEXT,
    fecha_publicacion     DATE NOT NULL,
    fecha_fin_plazo       DATE,
    fecha_fin_aprox       BOOLEAN NOT NULL DEFAULT FALSE, -- fecha_fin_plazo aproximada (días hábiles)
    plazo_texto           TEXT,                       -- frase literal del plazo (texto oficial)
    url_oficial           TEXT NOT NULL,
    fuente_codigo         TEXT NOT NULL REFERENCES fuentes(codigo),
    fecha_ingesta         TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizada_en        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_convocatorias_fecha_pub   ON convocatorias (fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fin_plazo   ON convocatorias (fecha_fin_plazo);
CREATE INDEX IF NOT EXISTS idx_convocatorias_ccaa        ON convocatorias (ccaa);
CREATE INDEX IF NOT EXISTS idx_convocatorias_ambito      ON convocatorias (ambito);
CREATE INDEX IF NOT EXISTS idx_convocatorias_fuente      ON convocatorias (fuente_codigo);

-- Registro de ejecuciones de ingesta, para la página /estado y detección de scrapers rotos.
CREATE TABLE IF NOT EXISTS ingest_runs (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    fuente_codigo   TEXT NOT NULL REFERENCES fuentes(codigo),
    iniciada_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalizada_en   TIMESTAMPTZ,
    estado          TEXT NOT NULL DEFAULT 'en_curso'
        CHECK (estado IN ('en_curso','ok','error')),
    convocatorias_nuevas       INTEGER NOT NULL DEFAULT 0,
    convocatorias_actualizadas INTEGER NOT NULL DEFAULT 0,
    error_mensaje   TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingest_runs_fuente ON ingest_runs (fuente_codigo, iniciada_en DESC);
