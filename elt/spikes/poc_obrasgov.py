#!/usr/bin/env python3
"""
PoC: Extração de Obras e Medições Físicas via ObrasGov.br
Desenvolvido para validar a viabilidade de exibição cívica de obras públicas municipais.
"""

from __future__ import annotations

import json
import logging
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("poc_obras")

BASE_URL = "https://api-publica.obrasgov.gestao.gov.br/obras"
USER_AGENT = "TransparenciaPublica/1.0 (+https://github.com/maistransparencia/transparencia)"


@dataclass
class Coordenada:
    latitude: float
    longitude: float


@dataclass
class MedicaoFisica:
    id_execucao: int | None
    percentual_execucao_fisica: float | None
    data_medicao: str | None
    tipo_instrumento: str | None


@dataclass
class ObraPublica:
    id_projeto: str
    nome: str
    situacao: str
    orgao_responsavel: str
    valor_investimento_previsto: float
    medicao_fisica: MedicaoFisica | None
    coordenadas: list[Coordenada]
    data_inicio_prevista: str | None
    data_fim_prevista: str | None
    motivo_paralisacao: str | None


def fetch_json(endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"{BASE_URL}/{endpoint.lstrip('/')}"
    if params:
        query_string = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
        url = f"{url}?{query_string}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)
    except Exception as e:
        logger.error(f"Erro ao requisitar {url}: {e}")
        return {}


def extrair_obras_municipio(cod_ibge: str, max_obras: int = 20) -> list[ObraPublica]:
    """
    Extrai as obras de um município pelo código IBGE utilizando a API do ObrasGov.
    """
    logger.info(f"Buscando geometrias para IBGE {cod_ibge}...")
    geometria_resp = fetch_json("geometria", {"cod_ibge": cod_ibge, "tamanho_da_pagina": 100})
    pontos = geometria_resp.get("data", [])
    if not pontos:
        logger.warning(f"Nenhum ponto retornado para IBGE {cod_ibge}")
        return []

    # Mapeia IDs únicos mantendo a ordem
    ids_projetos: list[str] = []
    for p in pontos:
        pid = p.get("id_projeto_investimento")
        if pid and pid not in ids_projetos:
            ids_projetos.append(pid)

    logger.info(f"Encontrados {len(pontos)} pontos e {len(ids_projetos)} projetos únicos.")
    obras: list[ObraPublica] = []

    for pid in ids_projetos[:max_obras]:
        # 1. Detalhes do Projeto
        proj_resp = fetch_json("projeto-investimento", {"id_projeto_investimento": pid})
        proj_data = proj_resp.get("data", [{}])[0] if proj_resp.get("data") else {}

        # 2. Execução Física
        exec_resp = fetch_json("execucao-fisica", {"id_projeto_investimento": pid})
        exec_items = exec_resp.get("data", [])

        medicao: MedicaoFisica | None = None
        if exec_items:
            # Pega a medição mais recente / de maior percentual
            latest = sorted(
                exec_items,
                key=lambda x: x.get("dt_atualizacao_execucao") or x.get("dt_cadastro_execucao") or "",
                reverse=True,
            )[0]
            medicao = MedicaoFisica(
                id_execucao=latest.get("id_execucao_fisica"),
                percentual_execucao_fisica=latest.get("percentual_execucao_fisica"),
                data_medicao=latest.get("dt_atualizacao_execucao") or latest.get("dt_cadastro_execucao"),
                tipo_instrumento=latest.get("tipo_instrumento"),
            )

        # 3. Coordenadas a partir dos pins
        coords: list[Coordenada] = []
        for pin_info in proj_data.get("pins", []):
            try:
                lat = float(pin_info.get("latitude"))
                lng = float(pin_info.get("longitude").rstrip(")"))
                coords.append(Coordenada(latitude=lat, longitude=lng))
            except (ValueError, TypeError):
                continue

        # 4. Investimento previsto
        investimentos = proj_data.get("investimentos_previstos", [])
        vl_investimento = sum(inv.get("vl_investimento_previsto", 0.0) or 0.0 for inv in investimentos)

        # 5. Histórico se paralisada
        motivo_paralisacao: str | None = None
        situacao = proj_data.get("situacao", "Cadastrada")
        if situacao == "Paralisada":
            hist_resp = fetch_json("historico-situacao-cancelada-paralisada", {"id_projeto_investimento": pid})
            hist_items = hist_resp.get("data", [])
            if hist_items:
                motivo_paralisacao = hist_items[0].get("justificativa_cancelada_paralisada")

        obra = ObraPublica(
            id_projeto=pid,
            nome=proj_data.get("desc_nome", "Sem título"),
            situacao=situacao,
            orgao_responsavel=proj_data.get("organizacao_resp", "Não informado"),
            valor_investimento_previsto=vl_investimento,
            medicao_fisica=medicao,
            coordenadas=coords,
            data_inicio_prevista=proj_data.get("dt_inicial_prevista"),
            data_fim_prevista=proj_data.get("dt_final_prevista"),
            motivo_paralisacao=motivo_paralisacao,
        )
        obras.append(obra)

    return obras


if __name__ == "__main__":
    cidades = [
        {"nome": "Porciúncula", "cod_ibge": "3304102"},
        {"nome": "Natividade", "cod_ibge": "3303104"},
    ]

    resultado_geral = {}
    for c in cidades:
        logger.info(f"\n==================== PROCESSANDO {c['nome'].upper()} ====================")
        obras = extrair_obras_municipio(c["cod_ibge"], max_obras=15)
        resultado_geral[c["nome"]] = [asdict(o) for o in obras]
        logger.info(f"Sucesso: {len(obras)} obras estruturadas.")

    output_path = "elt/spikes/poc_obras_resultado.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(resultado_geral, f, indent=2, ensure_ascii=False)

    logger.info(f"\nResultado da PoC salvo com sucesso em: {output_path}")
