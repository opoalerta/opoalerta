"""Tests del helper HTTP con reintentos (sin red: se mockea httpx.get)."""

import httpx
import pytest

from common import http


def test_reintenta_y_acaba_bien(monkeypatch):
    intentos = {"n": 0}

    def fake_get(url, **kwargs):
        intentos["n"] += 1
        if intentos["n"] < 3:
            raise httpx.ReadTimeout("timeout")
        return httpx.Response(200, text="ok", request=httpx.Request("GET", url))

    monkeypatch.setattr(http.httpx, "get", fake_get)
    monkeypatch.setattr(http.time, "sleep", lambda *_: None)

    resp = http.get("https://example.org", retries=3, backoff=0)
    assert resp.text == "ok"
    assert intentos["n"] == 3


def test_agota_reintentos_y_lanza(monkeypatch):
    def fake_get(url, **kwargs):
        raise httpx.ConnectTimeout("nope")

    monkeypatch.setattr(http.httpx, "get", fake_get)
    monkeypatch.setattr(http.time, "sleep", lambda *_: None)

    with pytest.raises(httpx.TransportError):
        http.get("https://example.org", retries=2, backoff=0)


def test_pasa_user_agent_por_defecto(monkeypatch):
    capturado = {}

    def fake_get(url, **kwargs):
        capturado.update(kwargs.get("headers", {}))
        return httpx.Response(200, text="ok", request=httpx.Request("GET", url))

    monkeypatch.setattr(http.httpx, "get", fake_get)
    http.get("https://example.org")
    assert "OpoAlerta" in capturado.get("User-Agent", "")
