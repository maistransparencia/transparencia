"""Teste de contrato da API de dados abertos da Saúde, para rodar no ambiente da carga diária.

Uma passada por endpoint, repetida `--repeticoes` vezes, sem repetição automática em caso de erro
(o objetivo é medir a API, não esconder falhas), com timeout e intervalo entre chamadas iguais aos do
extrator. Depois, uma caminhada de páginas do CNES mede o limite de taxa sustentado.
Nada é gravado em banco. Saída: JSON em stdout e, no GitHub Actions, resumo em Markdown.
"""

from __future__ import annotations

import argparse
import json
import os
import statistics
import time
from datetime import date
from pathlib import Path
from typing import Any

import requests
from elt.core.config import PortalConfig
from elt.extract.farmacia_sus import DEFAULT_USER_AGENT, FARMACIA_SUS_BASE_URL, codigo_ibge6
from elt.extract.saude_rede import (
    ENDPOINT_LEITOS,
    ENDPOINT_POPULACAO,
    ENDPOINT_PROFISSIONAIS,
    competencias_do_ano,
)

ENDPOINTS_25_6B = {
    "cnes_estabelecimentos": "/assistencia-a-saude/cnes-estabelecimentos",
    "sia_procedimentos": "/assistencia-a-saude/sia-procedimentos-ambulatoriais",
    "sih_procedimentos": "/assistencia-a-saude/sih-procedimentos-hospitalares",
}


def _chamar(sessao: requests.Session, endpoint: str, params: dict[str, Any], timeout: int) -> dict[str, Any]:
    inicio = time.monotonic()
    try:
        resp = sessao.get(
            f"{FARMACIA_SUS_BASE_URL}{endpoint}",
            params=params,
            headers={"User-Agent": DEFAULT_USER_AGENT, "Accept": "application/json"},
            timeout=timeout,
        )
        corpo = resp.json() if resp.status_code == 200 and resp.content else {}
        linhas = next((v for v in corpo.values() if isinstance(v, list)), []) if isinstance(corpo, dict) else []
        return {"status": resp.status_code, "segundos": time.monotonic() - inicio, "linhas": len(linhas)}
    except requests.Timeout:
        return {"status": "timeout", "segundos": time.monotonic() - inicio, "linhas": 0}
    except (requests.RequestException, ValueError) as exc:
        return {"status": f"erro:{type(exc).__name__}", "segundos": time.monotonic() - inicio, "linhas": 0}


def _resumo(chamadas: list[dict[str, Any]]) -> dict[str, Any]:
    tempos = [c["segundos"] for c in chamadas]
    return {
        "chamadas": len(chamadas),
        "http_200": sum(c["status"] == 200 for c in chamadas),
        "http_429": sum(c["status"] == 429 for c in chamadas),
        "timeouts": sum(c["status"] == "timeout" for c in chamadas),
        "outros_erros": sum(c["status"] not in (200, 429, "timeout") for c in chamadas),
        "vazias": sum(c["status"] == 200 and c["linhas"] == 0 for c in chamadas),
        "mediana_s": round(statistics.median(tempos), 2) if tempos else None,
        "maximo_s": round(max(tempos), 2) if tempos else None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repeticoes", type=int, default=3)
    parser.add_argument("--intervalo", type=float, default=0.5)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--paginas", type=int, default=60, help="Páginas da caminhada de limite de taxa")
    args = parser.parse_args()

    slugs = sorted(p.stem for p in (Path(__file__).resolve().parent.parent / "portals").glob("*.yml"))
    portais = [PortalConfig.load(slug) for slug in slugs]
    ano_anterior = date.today().year - 1
    competencia = competencias_do_ano(ano_anterior)[0]
    sessao = requests.Session()

    def passada(endpoint: str, montar_params) -> list[dict[str, Any]]:
        chamadas = []
        for _ in range(args.repeticoes):
            for portal in portais:
                chamadas.append(_chamar(sessao, endpoint, montar_params(portal), args.timeout))
                time.sleep(args.intervalo)
        return chamadas

    def cnes(portal: PortalConfig) -> dict[str, Any]:
        return {"co_ibge": codigo_ibge6(portal.cod_ibge), "nu_comp": competencia, "limit": 1000, "offset": 0}

    resultado: dict[str, Any] = {
        "data": date.today().isoformat(),
        "ambiente": "github_actions" if os.environ.get("GITHUB_ACTIONS") else "local",
        "competencia_testada": competencia,
        "portais_testados": len(portais),
        "intervalo_s": args.intervalo,
        "timeout_s": args.timeout,
        "endpoints": {
            "cnes_leitos": _resumo(passada(ENDPOINT_LEITOS, cnes)),
            "cnes_profissionais": _resumo(passada(ENDPOINT_PROFISSIONAIS, cnes)),
            "populacao_residente": _resumo(
                passada(
                    ENDPOINT_POPULACAO,
                    lambda p: {"cod_mun": str(p.cod_ibge), "ano": ano_anterior, "limit": 1000, "offset": 0},
                )
            ),
            **{nome: _resumo(passada(ep, cnes)) for nome, ep in ENDPOINTS_25_6B.items()},
        },
    }
    primeiro = portais[0]
    caminhada = []
    for pagina in range(args.paginas):
        caminhada.append(_chamar(sessao, ENDPOINT_PROFISSIONAIS, {**cnes(primeiro), "offset": pagina}, args.timeout))
        time.sleep(args.intervalo)
    resultado["caminhada_limite_de_taxa"] = {"endpoint": "cnes_profissionais", **_resumo(caminhada)}

    print(json.dumps(resultado, ensure_ascii=False, indent=2))
    resumo = os.environ.get("GITHUB_STEP_SUMMARY")
    if resumo:
        linhas = [
            "| Endpoint | Chamadas | 200 | 429 | Timeout | Outros erros | Vazias | Mediana (s) | Máximo (s) |",
            "|---|---|---|---|---|---|---|---|---|",
        ]
        itens = {**resultado["endpoints"], "caminhada_" + "cnes_profissionais": resultado["caminhada_limite_de_taxa"]}
        for nome, r in itens.items():
            linhas.append(
                f"| {nome} | {r['chamadas']} | {r['http_200']} | {r['http_429']} | {r['timeouts']} | {r['outros_erros']} | {r['vazias']} | {r['mediana_s']} | {r['maximo_s']} |"
            )
        with open(resumo, "a", encoding="utf-8") as f:
            f.write(
                f"## Contrato da API da Saúde ({resultado['ambiente']}, competência {competencia})\n\n"
                + "\n".join(linhas)
                + "\n"
            )


if __name__ == "__main__":
    main()
