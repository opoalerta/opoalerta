"""Persistencia de convocatorias.

Con ``DATABASE_URL`` definido hace un upsert idempotente en Postgres. Sin él
(modo dry-run), no toca ninguna base de datos: quien llama decide qué hacer con
las convocatorias (normalmente escribirlas como JSON).
"""

from __future__ import annotations

import os
from typing import Any

UPSERT_SQL = """
INSERT INTO convocatorias (
    id, titulo, organismo, ambito, ccaa, cuerpo, grupo,
    titulacion_requerida, num_plazas, tipo_acceso,
    fecha_publicacion, fecha_fin_plazo, url_oficial,
    fuente_codigo, fecha_ingesta, actualizada_en
) VALUES (
    %(id)s, %(titulo)s, %(organismo)s, %(ambito)s, %(ccaa)s, %(cuerpo)s, %(grupo)s,
    %(titulacion_requerida)s, %(num_plazas)s, %(tipo_acceso)s,
    %(fecha_publicacion)s, %(fecha_fin_plazo)s, %(url_oficial)s,
    %(fuente_codigo)s, %(fecha_ingesta)s, now()
)
ON CONFLICT (id) DO UPDATE SET
    titulo = EXCLUDED.titulo,
    organismo = EXCLUDED.organismo,
    ambito = EXCLUDED.ambito,
    ccaa = EXCLUDED.ccaa,
    cuerpo = EXCLUDED.cuerpo,
    grupo = EXCLUDED.grupo,
    titulacion_requerida = EXCLUDED.titulacion_requerida,
    num_plazas = EXCLUDED.num_plazas,
    tipo_acceso = EXCLUDED.tipo_acceso,
    -- fecha_publicacion NO se sobrescribe: es la fecha de primera aparición y no
    -- debe cambiar al reingerir (importante para fuentes sin fecha propia, p. ej. EPSO).
    fecha_fin_plazo = EXCLUDED.fecha_fin_plazo,
    url_oficial = EXCLUDED.url_oficial,
    actualizada_en = now()
RETURNING (xmax = 0) AS insertada;
"""

UPSERT_FUENTE_SQL = """
INSERT INTO fuentes (codigo, nombre, licencia)
VALUES (%(codigo)s, %(nombre)s, %(licencia)s)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    licencia = EXCLUDED.licencia;
"""

INSERT_RUN_OK_SQL = """
INSERT INTO ingest_runs (
    fuente_codigo, iniciada_en, finalizada_en, estado,
    convocatorias_nuevas, convocatorias_actualizadas
) VALUES (%(fuente_codigo)s, now(), now(), 'ok', %(nuevas)s, %(actualizadas)s);
"""

INSERT_RUN_ERROR_SQL = """
INSERT INTO ingest_runs (
    fuente_codigo, iniciada_en, finalizada_en, estado, error_mensaje
) VALUES (%(fuente_codigo)s, now(), now(), 'error', %(error)s);
"""


def _flatten(c: dict[str, Any]) -> dict[str, Any]:
    """Aplana la clave anidada ``fuente`` a ``fuente_codigo`` para el INSERT."""
    row = dict(c)
    row["fuente_codigo"] = c["fuente"]["codigo"]
    row.pop("fuente", None)
    # Rellena claves opcionales ausentes con None.
    for k in (
        "ccaa",
        "cuerpo",
        "grupo",
        "titulacion_requerida",
        "num_plazas",
        "tipo_acceso",
        "fecha_fin_plazo",
    ):
        row.setdefault(k, None)
    return row


def has_database() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def upsert(convocatorias: list[dict[str, Any]], fuente: dict[str, str]) -> tuple[int, int]:
    """Upsert idempotente. Devuelve (nuevas, actualizadas).

    Requiere ``DATABASE_URL`` y el extra ``db`` (psycopg) instalado.
    """
    import psycopg  # import diferido: solo necesario en modo con base de datos.

    dsn = os.environ["DATABASE_URL"]
    nuevas = actualizadas = 0
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(UPSERT_FUENTE_SQL, fuente)
        for c in convocatorias:
            cur.execute(UPSERT_SQL, _flatten(c))
            insertada = cur.fetchone()[0]
            if insertada:
                nuevas += 1
            else:
                actualizadas += 1
        # Registra la ejecución correcta (misma transacción que el upsert).
        cur.execute(
            INSERT_RUN_OK_SQL,
            {"fuente_codigo": fuente["codigo"], "nuevas": nuevas, "actualizadas": actualizadas},
        )
        conn.commit()
    return nuevas, actualizadas


def record_failed_run(fuente: dict[str, str], error: str) -> None:
    """Registra una ejecución fallida en ingest_runs (para /estado y diagnóstico)."""
    import psycopg

    dsn = os.environ["DATABASE_URL"]
    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(UPSERT_FUENTE_SQL, fuente)
        cur.execute(
            INSERT_RUN_ERROR_SQL,
            {"fuente_codigo": fuente["codigo"], "error": error[:2000]},
        )
        conn.commit()
