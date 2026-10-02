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
    monkeypatch.setattr(notificar, "_fetch_cierres", lambda *a, **k: ([], set()))
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


# ── Aviso de cierre de plazo ─────────────────────────────────────────────────

from datetime import date  # noqa: E402

from notificar import _asunto, _cuando_cierra, cierres_para  # noqa: E402

HOY = date(2026, 10, 2)
CIERRE = {
    **CONV,
    "id": "boja:123",
    "url_oficial": "https://www.juntadeandalucia.es/boja/x",
    "fecha_fin_plazo": "2026-10-05",
    "fecha_fin_aprox": False,
}


def test_cuando_cierra_relativo_y_aproximado():
    assert _cuando_cierra(CIERRE, HOY) == "cierra en 3 días, el 05/10"
    assert _cuando_cierra({**CIERRE, "fecha_fin_plazo": "2026-10-03"}, HOY).startswith(
        "cierra mañana"
    )
    assert _cuando_cierra({**CIERRE, "fecha_fin_plazo": "2026-10-02"}, HOY).startswith("cierra hoy")
    assert _cuando_cierra({**CIERRE, "fecha_fin_aprox": True}, HOY).endswith("(aprox.)")


def test_cierres_para_respeta_filtros_avisados_y_nuevas():
    susc = {"id": "s1", "ccaa": "AN"}
    assert cierres_para(susc, [CIERRE], set(), set()) == [CIERRE]
    # Ya avisado a esta suscripción: no se repite.
    assert cierres_para(susc, [CIERRE], {("s1", "boja:123")}, set()) == []
    # Avisado a OTRA suscripción: a esta sí le toca.
    assert cierres_para(susc, [CIERRE], {("s2", "boja:123")}, set()) == [CIERRE]
    # Va en el bloque de nuevas del mismo mensaje: no se duplica.
    assert cierres_para(susc, [CIERRE], set(), {"boja:123"}) == []
    # No encaja con los filtros.
    assert cierres_para({"id": "s1", "ccaa": "MD"}, [CIERRE], set(), set()) == []


def test_asunto_segun_lo_que_lleva():
    assert _asunto(2) == "2 nuevas convocatorias · OpoAlerta"
    assert _asunto(0, 1) == "1 plazo a punto de cerrar · OpoAlerta"
    assert _asunto(1, 3) == "1 nueva convocatoria y 3 plazos a punto de cerrar · OpoAlerta"


def test_render_solo_cierres():
    email = _render([], "tok", [CIERRE], HOY)
    assert "El plazo cierra pronto" in email
    assert "Nuevas convocatorias" not in email
    assert "Cierra en 3 días, el 05/10" in email
    assert "https://www.juntadeandalucia.es/boja/x" in email
    tg = _render_telegram([], [CIERRE], HOY)
    assert "1 plazo a punto de cerrar" in tg
    assert "nueva" not in tg
    assert "/stop" in tg


def test_render_nuevas_y_cierres_juntos():
    nueva = {**CONV, "fecha_publicacion": "2026-10-02", "url_oficial": "https://boe.es/n"}
    email = _render([nueva], "tok", [CIERRE], HOY)
    assert email.index("Nuevas convocatorias") < email.index("El plazo cierra pronto")
    tg = _render_telegram([nueva], [CIERRE], HOY)
    assert tg.index("1 nueva convocatoria") < tg.index("1 plazo a punto de cerrar")


def test_main_envia_cierres_y_los_registra(monkeypatch):
    import psycopg

    monkeypatch.setenv("DATABASE_URL", "test-only")
    monkeypatch.setenv("RESEND_API_KEY", "k")
    connection = MagicMock()
    conn = connection.__enter__.return_value
    cursor = conn.cursor.return_value.__enter__.return_value
    monkeypatch.setattr(psycopg, "connect", lambda _: connection)
    susc = {"id": "s1", "email": "a@b.es", "canal": "email", "token": "t", "ccaa": "AN"}
    monkeypatch.setattr(notificar, "_fetch", lambda *a, **k: ([], [susc]))
    monkeypatch.setattr(notificar, "_fetch_cierres", lambda *a, **k: ([CIERRE], set()))
    send = MagicMock(return_value=True)
    monkeypatch.setattr(notificar, "_notificar_una", send)
    assert notificar.main([]) == 0
    assert send.call_args.args[4] == [CIERRE]
    sqls = [c.args[0] for c in cursor.execute.call_args_list]
    assert any("INSERT INTO recordatorios_plazo" in q for q in sqls)
    conn.commit.assert_called_once()


def test_cierres_para_alerta_general_no_manda_listados():
    muchos = [{**CIERRE, "id": f"boja:{i}"} for i in range(notificar.AVISO_MAX + 5)]
    # Sin texto de búsqueda y por encima del tope: nada.
    assert cierres_para({"id": "s1"}, muchos, set(), set()) == []
    assert cierres_para({"id": "s1", "fuente_codigo": "boja"}, muchos, set(), set()) == []
    # Con texto: los primeros (más próximos) hasta el tope.
    suyos = cierres_para({"id": "s1", "q": "auxiliar"}, muchos, set(), set())
    assert suyos == muchos[: notificar.AVISO_MAX]
    # Sin texto pero dentro del tope: sí.
    assert cierres_para({"id": "s1"}, muchos[:3], set(), set()) == muchos[:3]
