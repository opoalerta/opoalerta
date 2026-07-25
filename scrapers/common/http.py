"""Descargas HTTP con reintentos.

Los portales oficiales (sobre todo los Drupal lentos como el BOCM) dan
timeouts transitorios. Reintentar con backoff evita falsos `scraper-roto`.
"""

from __future__ import annotations

import time

import httpx

DEFAULT_TIMEOUT = 45
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"


def get(
    url: str,
    *,
    headers: dict[str, str] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    retries: int = 3,
    backoff: float = 3.0,
) -> httpx.Response:
    """GET con reintentos ante errores de red/timeout. Lanza la última excepción."""
    merged = {"User-Agent": USER_AGENT}
    if headers:
        merged.update(headers)

    last: Exception | None = None
    for intento in range(retries):
        try:
            resp = httpx.get(url, headers=merged, timeout=timeout, follow_redirects=True)
            resp.raise_for_status()
            return resp
        except httpx.TransportError as exc:  # timeouts y errores de red
            last = exc
            if intento < retries - 1:
                time.sleep(backoff * (intento + 1))
    raise last  # type: ignore[misc]
