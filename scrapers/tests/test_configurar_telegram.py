import io
from urllib.parse import parse_qs

import pytest

import configurar_telegram as setup


@pytest.mark.parametrize(
    "base",
    [
        "http://opoalerta.es",
        "https://user:pass@opoalerta.es",
        "https://opoalerta.es/path",
        "https://opoalerta.es?key=x",
        "https://opoalerta.es#fragment",
        "https://opoalerta.es:444",
        "https://opoalerta.es\n",
        "$(shell)",
    ],
)
def test_rechaza_base_invalida(base):
    with pytest.raises(ValueError):
        setup.webhook_url(base)


@pytest.mark.parametrize("provider_ok", [True, False])
def test_envia_secreto_y_no_imprime_respuesta(monkeypatch, capsys, provider_ok):
    secret = "s" * 64
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123:test-token")
    monkeypatch.setenv("TELEGRAM_WEBHOOK_SECRET", secret)
    monkeypatch.setenv("INPUT_SITE_URL", "https://opoalerta.es/")

    def urlopen(request, timeout):
        body = parse_qs(request.data.decode())
        assert body["secret_token"] == [secret]
        assert body["url"] == ["https://opoalerta.es/api/telegram"]
        assert body["allowed_updates"] == ['["message"]']
        assert timeout == 30
        return io.BytesIO(
            b'{"ok":true}' if provider_ok else b'{"ok":false,"description":"test-token"}'
        )

    monkeypatch.setattr(setup, "urlopen", urlopen)
    assert setup.main() == (0 if provider_ok else 1)
    output = capsys.readouterr()
    assert secret not in output.out + output.err
    assert "test-token" not in output.out + output.err


def test_sin_secreto_no_contacta_telegram(monkeypatch):
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "123:test-token")
    monkeypatch.delenv("TELEGRAM_WEBHOOK_SECRET", raising=False)
    monkeypatch.setattr(setup, "urlopen", lambda *a, **k: pytest.fail("Unexpected network"))
    assert setup.main() == 1
