"""Tests offline del matching de alertas (función pura, sin red ni base de datos)."""

from unittest.mock import MagicMock

import httpx
import pytest

import notificar
from notificar import _render, _render_telegram, _safe_url, coincide

CONV = {
    "titulo": "Resolución por la que se convoca proceso selectivo de Auxiliar Administrativo",
    "organismo": "Consejería de Educación",
    "ambito": "autonomico",
    "ccaa": "AN",
    "fuente_codigo": "boja",
}


def test_sin_filtros_siempre_coincide():
    assert coincide(CONV, {})


def test_filtro_fuente():
    assert coincide(CONV, {"fuente_codigo": "boja"})
    assert not coincide(CONV, {"fuente_codigo": "boe"})


def test_filtro_ambito_y_ccaa():
    assert coincide(CONV, {"ambito": "autonomico", "ccaa": "AN"})
    assert not coincide(CONV, {"ambito": "estatal"})
    assert not coincide(CONV, {"ccaa": "MD"})


def test_texto_ignora_acentos_y_mayusculas():
    assert coincide(CONV, {"q": "AUXILIAR"})
    assert coincide(CONV, {"q": "administrativo"})
    assert coincide(CONV, {"q": "educacion"})  # sin tilde
    assert not coincide(CONV, {"q": "bombero"})


def test_combinacion_de_filtros():
    assert coincide(CONV, {"fuente_codigo": "boja", "q": "selectivo"})
    assert not coincide(CONV, {"fuente_codigo": "boja", "q": "veterinario"})


def test_render_telegram_incluye_enlaces_y_baja():
    convs = [
        {
            "titulo": "Convocatoria de <Auxiliar> & personal",
            "organismo": "Ayuntamiento",
            "fuente_codigo": "boib",
            "url_oficial": "https://www.caib.es/x",
        }
    ]
    texto = _render_telegram(convs)
    assert "https://www.caib.es/x" in texto
    assert "&lt;Auxiliar&gt; &amp; personal" in texto  # escapado HTML
    assert "/stop" in texto
    assert "1 nueva convocatoria" in texto


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,bad",
        "//evil.test",
        "https://user:pass@test.es",
        "https://test.es\n/bad",
        "https://test.es\\bad",
        "https://[invalid",
    ],
)
def test_url_no_web_o_ambigua_se_descarta(url):
    assert _safe_url(url) == "https://opoalerta.es"


def test_escapa_todos_los_campos_y_atributos():
    conv = {
        **CONV,
        "titulo": '<img src="x"> & hola',
        "organismo": "<b>org</b>",
        "fuente_codigo": "<i>boe</i>",
        "fecha_publicacion": "<u>hoy</u>",
        "url_oficial": 'https://test.es/?q="x"&a=1',
    }
    email = _render([conv], 'token"&extra=1')
    telegram = _render_telegram([conv])
    for html in (email, telegram):
        assert "<img" not in html
        assert "<b>org</b>" not in html
        assert "&lt;img src=&quot;x&quot;&gt; &amp; hola" in html
        assert "https://test.es/?q=&quot;x&quot;&amp;a=1" in html
        assert "&lt;I&gt;BOE&lt;/I&gt;" in html
    assert "token%22%26extra%3D1" in email
    assert "&lt;u&gt;hoy&lt;/u&gt;" in email


@pytest.mark.parametrize("channel", ["email", "telegram"])
@pytest.mark.parametrize("network_error", [False, True])
def test_errores_no_revelan_contactos_ni_tokens(monkeypatch, capsys, channel, network_error):
    sensitive = "user@example.com 123456789 token-secreto"

    def post(*args, **kwargs):
        if network_error:
            raise httpx.ConnectError(sensitive)
        return httpx.Response(400, text=sensitive)

    monkeypatch.setattr(notificar.httpx, "post", post)
    if channel == "email":
        assert not notificar._enviar("token-secreto", "user@example.com", "html", 1)
    else:
        assert not notificar._enviar_telegram("token-secreto", 123456789, "html")
    captured = capsys.readouterr()
    for value in sensitive.split():
        assert value not in captured.out + captured.err


def test_telegram_no_da_por_enviado_un_error_json(monkeypatch):
    monkeypatch.setattr(
        notificar.httpx, "post", lambda *a, **k: httpx.Response(200, json={"ok": False})
    )
    assert not notificar._enviar_telegram("fake", 123, "html")


def test_dry_run_no_imprime_destinatarios_ni_envia(monkeypatch, capsys):
    import psycopg

    monkeypatch.setenv("DATABASE_URL", "test-only")
    connection = MagicMock()
    monkeypatch.setattr(psycopg, "connect", lambda _: connection)
    subscribers = [
        {"email": "private@example.com", "canal": "email", "token": "private-token"},
        {"telegram_chat_id": 987654321, "canal": "telegram", "token": "private-token"},
    ]
    monkeypatch.setattr(notificar, "_fetch", lambda *a, **k: ([CONV], subscribers))
    send = MagicMock(side_effect=AssertionError("Must not send"))
    monkeypatch.setattr(notificar, "_notificar_una", send)
    assert notificar.main(["--dry-run"]) == 0
    send.assert_not_called()
    connection.__enter__.return_value.commit.assert_not_called()
    output = capsys.readouterr().out
    for private in ["private@example.com", "987654321", "private-token"]:
        assert private not in output
    assert "[email] 1 convocatorias" in output
    assert "[telegram] 1 convocatorias" in output
