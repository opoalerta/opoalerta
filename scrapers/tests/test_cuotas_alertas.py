"""Optional integration tests against an explicitly created, disposable local Postgres.

Only a Unix socket under /tmp is accepted; DATABASE_URL is never read.
Server port: 55439. Set OPOALERTA_TEST_POSTGRES_SOCKET to run these tests.
"""

import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import pytest

psycopg = pytest.importorskip("psycopg")


@pytest.fixture
def db():
    socket = os.environ.get("OPOALERTA_TEST_POSTGRES_SOCKET")
    if not socket:
        pytest.skip("Requires disposable local Postgres socket")
    if not Path(socket).resolve().is_relative_to("/tmp"):
        pytest.fail("Only disposable sockets under /tmp are accepted")
    options = {"host": socket, "port": 55439, "dbname": "postgres"}
    schema = Path(__file__).resolve().parents[2] / "data/schema/007_cuotas_alertas.sql"
    with psycopg.connect(**options) as conn:
        conn.execute(schema.read_text())
        conn.execute(schema.read_text())  # Idempotence.
        conn.execute("TRUNCATE cuotas_alertas")
    return options


def consume(db, policies):
    with psycopg.connect(**db) as conn:
        return conn.execute(
            "SELECT consumir_cuota_alertas(%s::jsonb)", (json.dumps(policies),)
        ).fetchone()[0]


def test_concurrent_admission_never_exceeds_limit(db):
    policy = [{"key": "global", "limit": 3, "seconds": 3600}]
    with ThreadPoolExecutor(max_workers=12) as pool:
        waits = list(pool.map(lambda _: consume(db, policy), range(24)))
    assert waits.count(0) == 3
    assert all(0 < value <= 3600 for value in waits if value)
    with psycopg.connect(**db) as conn:
        assert conn.execute("SELECT usos FROM cuotas_alertas").fetchone()[0] == 3


def test_denied_destination_does_not_consume_global_or_create_other_keys(db):
    global_policy = {"key": "global", "limit": 10, "seconds": 3600}
    destination = {"key": "email-hmac", "limit": 1, "seconds": 600}
    assert consume(db, [global_policy, destination]) == 0
    assert (
        consume(
            db, [global_policy, destination, {"key": "new-client", "limit": 10, "seconds": 3600}]
        )
        > 0
    )
    with psycopg.connect(**db) as conn:
        rows = conn.execute("SELECT clave, usos FROM cuotas_alertas ORDER BY clave").fetchall()
    assert rows == [("email-hmac", 1), ("global", 1)]


def test_expiry_resets_and_purges_counters(db):
    policy = [{"key": "expired", "limit": 1, "seconds": 600}]
    assert consume(db, policy) == 0
    assert consume(db, policy) > 0
    with psycopg.connect(**db) as conn:
        conn.execute("UPDATE cuotas_alertas SET caduca_en = now() - interval '1 second'")
    assert consume(db, [{"key": "new", "limit": 1, "seconds": 600}]) == 0
    with psycopg.connect(**db) as conn:
        assert conn.execute("SELECT clave FROM cuotas_alertas").fetchall() == [("new",)]
    assert consume(db, policy) == 0
