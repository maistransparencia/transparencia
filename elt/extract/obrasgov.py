"""Extrator client para a API oficial do ObrasGov.br.

Consome os endpoints de geometria, projetos de investimento,
execução física e histórico de paralisações para municípios por cod_ibge.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

OBRASGOV_BASE_URL = "https://api-publica.obrasgov.gestao.gov.br/obras"
DEFAULT_USER_AGENT = "TransparenciaPublica/1.0 (+https://github.com/maistransparencia/transparencia)"


class ObrasGovExtractor:
    """Cliente para extração dos dados abertos de obras públicas do ObrasGov.br."""

    def __init__(
        self,
        base_url: str = OBRASGOV_BASE_URL,
        user_agent: str = DEFAULT_USER_AGENT,
        min_interval_seconds: float = 0.5,
        max_retries: int = 4,
        timeout: int = 30,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.user_agent = user_agent
        self.min_interval_seconds = min_interval_seconds
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_request_time: float = 0.0

    def _wait_rate_limit(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        elapsed = time.monotonic() - self._last_request_time
        if elapsed < self.min_interval_seconds:
            time.sleep(self.min_interval_seconds - elapsed)

    def _request(
        self,
        endpoint: str,
        params: dict[str, Any] | None = None,
        session: requests.Session | None = None,
    ) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }
        http = session or requests
        last_err: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            self._wait_rate_limit()
            try:
                self._last_request_time = time.monotonic()
                resp = http.get(url, params=params, headers=headers, timeout=self.timeout)

                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code in (204, 404):
                    logger.debug("Recurso não encontrado ou vazio (%d): %s", resp.status_code, url)
                    return None
                if resp.status_code == 429 or resp.status_code >= 500:
                    wait = 2**attempt
                    logger.warning(
                        "Tentativa %d/%d falhou com HTTP %d para %s. Aguardando %ds.",
                        attempt,
                        self.max_retries,
                        resp.status_code,
                        url,
                        wait,
                    )
                    time.sleep(wait)
                    continue

                resp.raise_for_status()
            except (requests.RequestException, json.JSONDecodeError) as e:
                last_err = e
                wait = 2**attempt
                logger.warning(
                    "Tentativa %d/%d falhou (%s) para %s. Aguardando %ds.",
                    attempt,
                    self.max_retries,
                    e,
                    url,
                    wait,
                )
                time.sleep(wait)

        if last_err:
            raise last_err
        raise RuntimeError(f"Falha ao consultar ObrasGov após {self.max_retries} tentativas: {url}")

    def extract_geometrias_por_ibge(
        self,
        cod_ibge: int | str,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Extrai todas as geometrias cadastradas para o município especificado."""
        pagina = 1
        tamanho_pagina = 100
        pontos: list[dict[str, Any]] = []

        while True:
            payload = self._request(
                "geometria",
                params={"cod_ibge": str(cod_ibge), "pagina": pagina, "tamanho_da_pagina": tamanho_pagina},
                session=session,
            )
            if not payload or not isinstance(payload, dict):
                break

            items = payload.get("data", [])
            if not items:
                break

            pontos.extend(items)
            total_pages = int(payload.get("total_pages") or 1)
            if pagina >= total_pages:
                break
            pagina += 1

        return pontos

    def extract_projeto(
        self,
        id_projeto: str,
        session: requests.Session | None = None,
    ) -> dict[str, Any] | None:
        """Obtém detalhes do projeto de investimento a partir do seu identificador."""
        payload = self._request(
            "projeto-investimento",
            params={"id_projeto_investimento": id_projeto},
            session=session,
        )
        if not payload or not isinstance(payload, dict):
            return None
        items = payload.get("data", [])
        return items[0] if items else None

    def extract_execucoes_fisicas(
        self,
        id_projeto: str,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Extrai medições e histórico de execução física de um projeto de investimento."""
        pagina = 1
        tamanho_pagina = 50
        execucoes: list[dict[str, Any]] = []

        while True:
            payload = self._request(
                "execucao-fisica",
                params={"id_projeto_investimento": id_projeto, "pagina": pagina, "tamanho_da_pagina": tamanho_pagina},
                session=session,
            )
            if not payload or not isinstance(payload, dict):
                break
            items = payload.get("data", [])
            if not items:
                break
            execucoes.extend(items)
            total_pages = int(payload.get("total_pages") or 1)
            if pagina >= total_pages:
                break
            pagina += 1

        return execucoes

    def extract_historico_paralisacoes(
        self,
        id_projeto: str,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Extrai o histórico de cancelamento ou paralisação de um projeto de investimento."""
        pagina = 1
        tamanho_pagina = 50
        historicos: list[dict[str, Any]] = []

        while True:
            payload = self._request(
                "historico-situacao-cancelada-paralisada",
                params={"id_projeto_investimento": id_projeto, "pagina": pagina, "tamanho_da_pagina": tamanho_pagina},
                session=session,
            )
            if not payload or not isinstance(payload, dict):
                break
            items = payload.get("data", [])
            if not items:
                break
            historicos.extend(items)
            total_pages = int(payload.get("total_pages") or 1)
            if pagina >= total_pages:
                break
            pagina += 1

        return historicos

    def extract(
        self,
        portal_slug: str,
        cod_ibge: int | str,
        max_projetos: int | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """Extrai todas as obras e medições do município retornando listas estruturadas.

        Retorna:
            {
                "projetos": [...],
                "geometrias": [...],
                "execucoes_fisicas": [...],
                "historico_paralisacoes": [...]
            }
        """
        now_iso = datetime.now(timezone.utc).isoformat()
        session = requests.Session()

        try:
            logger.info("Iniciando extração ObrasGov para portal %s (cod_ibge: %s)...", portal_slug, cod_ibge)
            pontos = self.extract_geometrias_por_ibge(cod_ibge, session=session)

            if not pontos:
                logger.info(
                    "Nenhum ponto ou obra retornado pelo ObrasGov para o município IBGE %s (%s).",
                    cod_ibge,
                    portal_slug,
                )
                return {
                    "projetos": [],
                    "geometrias": [],
                    "execucoes_fisicas": [],
                    "historico_paralisacoes": [],
                }

            # Agrupa geometrias iniciais por id de projeto
            pontos_por_projeto: dict[str, list[dict[str, Any]]] = {}
            for pt in pontos:
                pid = pt.get("id_projeto_investimento")
                if pid:
                    pontos_por_projeto.setdefault(pid, []).append(pt)

            ids_projetos = list(pontos_por_projeto.keys())
            if max_projetos is not None:
                ids_projetos = ids_projetos[:max_projetos]

            logger.info("Encontrados %d projetos únicos para extração de detalhes.", len(ids_projetos))

            projetos_rows: list[dict[str, Any]] = []
            geometrias_rows: list[dict[str, Any]] = []
            execucoes_rows: list[dict[str, Any]] = []
            historicos_rows: list[dict[str, Any]] = []

            for pid in ids_projetos:
                try:
                    # 1. Detalhes do Projeto
                    proj_data = self.extract_projeto(pid, session=session)
                    if not proj_data:
                        logger.debug("Detalhes não encontrados para projeto %s", pid)
                        continue

                    investimentos = proj_data.get("investimentos_previstos") or []
                    vl_previsto_sum = (
                        sum(
                            float(inv.get("vl_investimento_previsto") or 0.0)
                            for inv in investimentos
                            if isinstance(inv, dict)
                        )
                        if investimentos
                        else None
                    )

                    vl_previsto = proj_data.get("valor_investimento_previsto") or (
                        str(vl_previsto_sum) if vl_previsto_sum is not None else None
                    )

                    executores = proj_data.get("executores")
                    repassadores = proj_data.get("repassadores")
                    executores_json = json.dumps(executores, ensure_ascii=False) if executores else None
                    repassadores_json = json.dumps(repassadores, ensure_ascii=False) if repassadores else None

                    projetos_rows.append(
                        {
                            "portal_slug": portal_slug,
                            "id_projeto_investimento": pid,
                            "desc_nome": proj_data.get("desc_nome") or proj_data.get("nome_obra"),
                            "desc_funcao_social": proj_data.get("desc_funcao_social"),
                            "desc_projeto": proj_data.get("desc_projeto"),
                            "natureza_intervencao": proj_data.get("natureza_intervencao"),
                            "especie_intervencao": proj_data.get("especie_intervencao"),
                            "executores_json": executores_json,
                            "repassadores_json": repassadores_json,
                            "situacao": proj_data.get("situacao"),
                            "organizacao_resp": proj_data.get("organizacao_resp") or proj_data.get("orgao_responsavel"),
                            "valor_investimento_previsto": str(vl_previsto) if vl_previsto is not None else None,
                            "dt_inicial_prevista": proj_data.get("dt_inicial_prevista")
                            or proj_data.get("data_inicio_prevista"),
                            "dt_final_prevista": proj_data.get("dt_final_prevista")
                            or proj_data.get("data_fim_prevista"),
                            "data_extracao": now_iso,
                        }
                    )

                    # 2. Geometrias / Coordenadas
                    pins = proj_data.get("pins") or []
                    if pins:
                        for idx, pin_item in enumerate(pins):
                            pin_lat = pin_item.get("latitude")
                            pin_lon = pin_item.get("longitude")
                            if isinstance(pin_lat, str):
                                pin_lat = pin_lat.strip("()")
                            if isinstance(pin_lon, str):
                                pin_lon = pin_lon.strip("()")
                            id_geo = pin_item.get("id_geometria")
                            id_geo_str = str(id_geo) if id_geo is not None else str(idx)
                            geometrias_rows.append(
                                {
                                    "portal_slug": portal_slug,
                                    "id_projeto_investimento": pid,
                                    "id_geometria": id_geo_str,
                                    "latitude": str(pin_lat) if pin_lat is not None else None,
                                    "longitude": str(pin_lon) if pin_lon is not None else None,
                                    "pin": pin_item.get("pin"),
                                    "origem_geometria": pin_item.get("origem_geometria") or "pin",
                                    "data_extracao": now_iso,
                                }
                            )
                    else:
                        for idx, geo_item in enumerate(pontos_por_projeto.get(pid, [])):
                            g_lat = geo_item.get("latitude")
                            g_lon = geo_item.get("longitude")
                            if isinstance(g_lat, str):
                                g_lat = g_lat.strip("()")
                            if isinstance(g_lon, str):
                                g_lon = g_lon.strip("()")
                            id_geo = geo_item.get("id_geometria")
                            id_geo_str = str(id_geo) if id_geo is not None else str(idx)
                            geometrias_rows.append(
                                {
                                    "portal_slug": portal_slug,
                                    "id_projeto_investimento": pid,
                                    "id_geometria": id_geo_str,
                                    "latitude": str(g_lat) if g_lat is not None else None,
                                    "longitude": str(g_lon) if g_lon is not None else None,
                                    "pin": geo_item.get("pin"),
                                    "origem_geometria": geo_item.get("origem_geometria"),
                                    "data_extracao": now_iso,
                                }
                            )

                    # 3. Execuções Físicas
                    exec_items = self.extract_execucoes_fisicas(pid, session=session)
                    for exc in exec_items:
                        pct = exc.get("percentual_execucao_fisica")
                        execucoes_rows.append(
                            {
                                "portal_slug": portal_slug,
                                "id_projeto_investimento": pid,
                                "id_execucao_fisica": str(exc.get("id_execucao_fisica")),
                                "percentual_execucao_fisica": str(pct) if pct is not None else None,
                                "dt_inicial_execucao": exc.get("dt_inicial_execucao"),
                                "dt_final_execucao": exc.get("dt_final_execucao"),
                                "tipo_instrumento": exc.get("tipo_instrumento"),
                                "tipo_forma_execucao": exc.get("tipo_forma_execucao"),
                                "dt_cadastro_execucao": exc.get("dt_cadastro_execucao"),
                                "dt_atualizacao_execucao": exc.get("dt_atualizacao_execucao"),
                                "data_medicao": exc.get("data_medicao"),
                                "data_extracao": now_iso,
                            }
                        )

                    # 4. Histórico de paralisações
                    hist_items = self.extract_historico_paralisacoes(pid, session=session)
                    for h in hist_items:
                        historicos_rows.append(
                            {
                                "portal_slug": portal_slug,
                                "id_projeto_investimento": pid,
                                "id_historico_situacao_investimento": str(h.get("id_historico_situacao_investimento")),
                                "descricao_historico_situacao_investimento": h.get(
                                    "descricao_historico_situacao_investimento"
                                ),
                                "data_historico_situacao_investimento": h.get("data_historico_situacao_investimento"),
                                "justificativa_cancelada_paralisada": h.get("justificativa_cancelada_paralisada"),
                                "possui_tratativas_situacao_investimento": h.get(
                                    "possui_tratativas_situacao_investimento"
                                ),
                                "fase_tratativas_situacao_investimento": h.get("fase_tratativas_situacao_investimento"),
                                "data_extracao": now_iso,
                            }
                        )
                except Exception as e:
                    logger.warning("Erro ao extrair detalhes do projeto %s (%s): %s", pid, portal_slug, e)
                    continue

            return {
                "projetos": projetos_rows,
                "geometrias": geometrias_rows,
                "execucoes_fisicas": execucoes_rows,
                "historico_paralisacoes": historicos_rows,
            }
        finally:
            session.close()
