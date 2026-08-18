"""Descargas HTTP con reintentos.

Los portales oficiales (sobre todo los Drupal lentos como el BOCM) dan
timeouts transitorios. Reintentar con backoff evita falsos `scraper-roto`.
"""

from __future__ import annotations

import ssl
import time

import httpx

DEFAULT_TIMEOUT = 45
USER_AGENT = "OpoAlerta/0.1 (+https://opoalerta.es; civic open-data scraper)"


def contexto_tls_legacy() -> ssl.SSLContext:
    """Contexto TLS para servidores atascados en una suite de la era SSLv3.

    `portaldogc.gencat.cat` (la API del DOGC) solo negocia TLS 1.2, y de cifrados
    solo acepta `AES256-SHA`: sin PFS y con MAC SHA1. OpenSSL etiqueta esa suite
    como SSLv3 y no la ofrece a partir del nivel de seguridad 2, que es el que
    traen por defecto los runners de Ubuntu 24.04. Resultado: el scraper funciona
    en local (nivel 1) y en CI el servidor corta el saludo con
    `SSLV3_ALERT_HANDSHAKE_FAILURE`, que no apunta a la causa por ningún lado.

    Baja el nivel a 1 **solo para la lista de cifrados**: la verificación del
    certificado y del hostname siguen puestas, así que no se acepta un
    certificado que no valide.
    """
    ctx = ssl.create_default_context()
    ctx.set_ciphers("DEFAULT:@SECLEVEL=1")
    return ctx


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


def post(
    url: str,
    *,
    data: dict[str, str] | None = None,
    headers: dict[str, str] | None = None,
    timeout: float = DEFAULT_TIMEOUT,
    retries: int = 3,
    backoff: float = 3.0,
    verify: ssl.SSLContext | bool = True,
) -> httpx.Response:
    """POST de formulario con reintentos. Mismo contrato que ``get``.

    Lo pide el DOGC, cuya API sólo responde a POST con `application/x-www-form-urlencoded`.
    `verify` acepta un contexto TLS para los servidores que necesitan
    `contexto_tls_legacy()`.
    """
    merged = {"User-Agent": USER_AGENT}
    if headers:
        merged.update(headers)

    last: Exception | None = None
    for intento in range(retries):
        try:
            resp = httpx.post(
                url,
                data=data,
                headers=merged,
                timeout=timeout,
                follow_redirects=True,
                verify=verify,
            )
            resp.raise_for_status()
            return resp
        except httpx.TransportError as exc:  # timeouts y errores de red
            last = exc
            if intento < retries - 1:
                time.sleep(backoff * (intento + 1))
    raise last  # type: ignore[misc]
