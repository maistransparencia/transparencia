"""classify_error: network failures, broken contracts and everything else map to stable snake_case codes."""

import json

import pytest
import requests
from elt.extract.errors import ERROR_CODES, SourceUnavailableError, classify_error
from elt.extract.siope import SiopeError
from elt.extract.siops import SiopsError


def _chained(outer: Exception, cause: Exception) -> Exception:
    try:
        raise outer from cause
    except Exception as exc:
        return exc


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (requests.ConnectionError("boom"), "fonte_fora_do_ar"),
        (requests.Timeout("boom"), "fonte_fora_do_ar"),
        (SourceUnavailableError("HTTP 503"), "fonte_fora_do_ar"),
        (_chained(SiopeError("indisponível"), requests.ConnectionError("x")), "fonte_fora_do_ar"),
        (_chained(SiopsError("indisponível"), requests.Timeout("x")), "fonte_fora_do_ar"),
        (SiopeError("Indicadores ausentes"), "formato_mudou"),
        (SiopsError("Coluna inesperada"), "formato_mudou"),
        (json.JSONDecodeError("bad", "{", 0), "formato_mudou"),
        (RuntimeError("qualquer coisa"), "erro_inesperado"),
        (KeyError("campo"), "erro_inesperado"),
    ],
)
def test_classify_error(error, expected):
    assert classify_error(error) == expected
    assert expected in ERROR_CODES
