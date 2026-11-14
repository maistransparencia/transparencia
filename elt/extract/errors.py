"""Classificação de falhas de extração em códigos estáveis (snake_case), gravados em failed_requests.csv.

O registro de coletas nunca guarda texto de exceção: só um destes códigos.
"""

from __future__ import annotations

import json

import requests

SOURCE_DOWN = "fonte_fora_do_ar"
FORMAT_CHANGED = "formato_mudou"
SUSPICIOUS_EMPTY = "resposta_vazia_suspeita"
UNEXPECTED_ERROR = "erro_inesperado"

ERROR_CODES = frozenset({SOURCE_DOWN, FORMAT_CHANGED, SUSPICIOUS_EMPTY, UNEXPECTED_ERROR})


class SourceUnavailableError(RuntimeError):
    """A fonte respondeu com status de indisponibilidade (404, 429, 5xx) ou não respondeu."""


def _causal_chain(exc: BaseException) -> list[BaseException]:
    chain: list[BaseException] = []
    current: BaseException | None = exc
    while current is not None and current not in chain:
        chain.append(current)
        current = current.__cause__ or current.__context__
    return chain


def classify_error(exc: BaseException) -> str:
    """Rede indisponível -> fonte_fora_do_ar; contrato/JSON quebrado -> formato_mudou; o resto -> erro_inesperado."""
    from elt.extract.siope import SiopeError
    from elt.extract.siops import SiopsError

    chain = _causal_chain(exc)
    if any(isinstance(link, SourceUnavailableError) for link in chain):
        return SOURCE_DOWN
    if any(
        isinstance(link, requests.RequestException) and not isinstance(link, requests.JSONDecodeError) for link in chain
    ):
        return SOURCE_DOWN
    if any(
        isinstance(link, (SiopeError, SiopsError, json.JSONDecodeError, requests.JSONDecodeError)) for link in chain
    ):
        return FORMAT_CHANGED
    return UNEXPECTED_ERROR
