"""Tests del helper HTTP con reintentos (sin red: se mockea httpx.get)."""

import ssl

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


def test_contexto_tls_legacy_ofrece_la_suite_del_dogc():
    """El contexto tiene que ofrecer `AES256-SHA`, la única que acepta el DOGC.

    Es la comprobación que faltaba: en local (nivel de seguridad 1) esa suite
    está en `DEFAULT` de todas formas, así que el scraper funcionaba, y en los
    runners de Ubuntu 24.04 (nivel 2) OpenSSL no la ofrecía y el servidor cortaba
    el saludo con `SSLV3_ALERT_HANDSHAKE_FAILURE`. Este test falla en el entorno
    donde falló la ingesta, que es donde tiene que fallar.
    """
    ctx = http.contexto_tls_legacy()
    assert "AES256-SHA" in {c["name"] for c in ctx.get_ciphers()}


def test_contexto_tls_legacy_sigue_verificando_el_certificado():
    """Bajar el nivel es solo para el cifrado: la verificación no se toca."""
    ctx = http.contexto_tls_legacy()
    assert ctx.check_hostname is True
    assert ctx.verify_mode == ssl.CERT_REQUIRED
