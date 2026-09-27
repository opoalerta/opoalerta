"""Configure the webhook explicitly; never called by the application or test suite."""

import json
import os
import re
import sys
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen


def webhook_url(base: str) -> str:
    parts = urlsplit(base)
    if (
        parts.scheme != "https"
        or not parts.hostname
        or parts.username
        or parts.password
        or parts.port not in (None, 443)
        or parts.path not in ("", "/")
        or parts.query
        or parts.fragment
        or any(ord(c) < 33 for c in base)
        or "\\" in base
    ):
        raise ValueError("SITE_URL must be an HTTPS origin")
    return f"https://{parts.netloc}/api/telegram"


def main() -> int:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    secret = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")
    if not re.fullmatch(r"[0-9]+:[A-Za-z0-9_-]+", token):
        print("::error::TELEGRAM_BOT_TOKEN no configurado o no valido", file=sys.stderr)
        return 1
    if not re.fullmatch(r"[A-Za-z0-9_-]{32,256}", secret):
        print(
            "::error::TELEGRAM_WEBHOOK_SECRET debe tener 32-256 caracteres A-Z a-z 0-9 _ -",
            file=sys.stderr,
        )
        return 1
    try:
        base = (
            os.environ.get("INPUT_SITE_URL") or os.environ.get("SITE_URL") or "https://opoalerta.es"
        )
        body = urlencode(
            {
                "url": webhook_url(base),
                "secret_token": secret,
                "allowed_updates": json.dumps(["message"]),
            }
        ).encode()
        request = Request(
            f"https://api.telegram.org/bot{token}/setWebhook",
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        with urlopen(request, timeout=30) as response:
            result = json.load(response)
        if not isinstance(result, dict) or result.get("ok") is not True:
            raise ValueError("Webhook rejected")
    except Exception:
        # Provider errors and transport exceptions can contain the bot token or request body.
        print("::error::No se pudo configurar el webhook. Revisar URL y secretos.", file=sys.stderr)
        return 1
    print("Webhook configurado con secreto obligatorio.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
