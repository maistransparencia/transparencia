from __future__ import annotations

import logging
import time
from datetime import datetime, timezone
from typing import Any

import requests

from elt.core.db import Connectable, upsert

logger = logging.getLogger(__name__)

SICONFI_BASE_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/msc_patrimonial"
DEFAULT_USER_AGENT = "TransparenciaPublica/1.0"
DEFAULT_IBGE_PORCIUNCULA = 3304102

KEY_COLS = [
    "ano",
    "mes_referencia",
    "cod_ibge",
    "conta_contabil",
    "poder_orgao",
    "fonte_recursos",
    "ano_fonte_recursos",
    "financeiro_permanente",
    "tipo_valor",
]


class SiconfiMscExtractor:
    """Extrator de Matriz de Saldos Contábeis (MSC Patrimonial) via API SICONFI/STN."""

    def __init__(
        self,
        base_url: str = SICONFI_BASE_URL,
        user_agent: str = DEFAULT_USER_AGENT,
        min_interval_seconds: float = 1.0,
        max_retries: int = 4,
        timeout: int = 60,
    ) -> None:
        self.base_url = base_url
        self.user_agent = user_agent
        self.min_interval_seconds = min_interval_seconds
        self.max_retries = max_retries
        self.timeout = timeout
        self._last_request_time: float = 0.0

    def _wait_rate_limit(self) -> None:
        if self.min_interval_seconds <= 0:
            return
        elapsed = time.time() - self._last_request_time
        if elapsed < self.min_interval_seconds:
            time.sleep(self.min_interval_seconds - elapsed)

    def fetch_page(
        self,
        ibge: int,
        ano: int,
        mes: int,
        offset: int = 0,
        limit: int = 5000,
        session: requests.Session | None = None,
    ) -> dict[str, Any]:
        """Busca uma página de dados da MSC Patrimonial com retry e backoff exponencial."""
        client = session or requests
        params: dict[str, str | int] = {
            "id_ente": ibge,
            "an_referencia": ano,
            "me_referencia": mes,
            "co_tipo_matriz": "MSCC",
            "classe_conta": 1,
            "id_tv": "ending_balance",
            "offset": offset,
            "limit": limit,
        }
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }

        backoff = 2.0
        last_exception: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            self._wait_rate_limit()
            try:
                self._last_request_time = time.time()
                resp = client.get(
                    self.base_url,
                    params=params,
                    headers=headers,
                    timeout=self.timeout,
                )

                if resp.status_code == 404:
                    logger.info("MSC não encontrada (404) para IBGE %s, ano %s, mês %s", ibge, ano, mes)
                    return {"items": [], "hasMore": False}

                if resp.status_code in (429, 500, 502, 503, 504):
                    last_exception = requests.HTTPError(f"HTTP {resp.status_code} da API SICONFI")
                    logger.warning(
                        "Status HTTP %s retornado da STN (tentativa %s/%s). Aplicando backoff de %.1fs",
                        resp.status_code,
                        attempt,
                        self.max_retries,
                        backoff,
                    )
                    if attempt < self.max_retries:
                        time.sleep(backoff)
                        backoff *= 2
                    continue

                resp.raise_for_status()
                data = resp.json()
                return data

            except (requests.RequestException, ValueError) as err:
                last_exception = err
                logger.warning(
                    "Erro ao conectar na STN (tentativa %s/%s): %s. Backoff %.1fs",
                    attempt,
                    self.max_retries,
                    err,
                    backoff,
                )
                if attempt < self.max_retries:
                    time.sleep(backoff)
                    backoff *= 2

        if last_exception:
            raise RuntimeError(
                f"Falha ao consultar API SICONFI para IBGE {ibge}, ano {ano}, mês {mes} após {self.max_retries} tentativas"
            ) from last_exception

        raise RuntimeError(f"Falha desconhecida ao consultar API SICONFI para IBGE {ibge}, ano {ano}, mês {mes}")

    def extract_mes(
        self,
        ibge: int,
        ano: int,
        mes: int,
        limit: int = 5000,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Extrai todos os itens de um determinado mês realizando paginação se necessário."""
        offset = 0
        all_raw_items: list[dict[str, Any]] = []

        while True:
            data = self.fetch_page(ibge, ano, mes, offset=offset, limit=limit, session=session)
            items = data.get("items", [])
            if not items:
                break
            all_raw_items.extend(items)

            if "hasMore" in data:
                if not data["hasMore"]:
                    break
            elif len(items) < limit:
                break

            offset += len(items)

        now_iso = datetime.now(timezone.utc).isoformat()
        return [self.normalize_item(item, ano=ano, mes=mes, ibge=ibge, extracted_at=now_iso) for item in all_raw_items]

    def extract_ano(
        self,
        ibge: int,
        ano: int,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Extrai os dados de todos os meses disponíveis (1 a 12) do exercício informado."""
        consolidated: list[dict[str, Any]] = []
        for mes in range(1, 13):
            try:
                mes_items = self.extract_mes(ibge, ano, mes, session=session)
                if mes_items:
                    consolidated.extend(mes_items)
            except Exception as err:
                logger.error("Erro ao extrair mês %s/%s: %s", mes, ano, err)
        return consolidated

    @staticmethod
    def normalize_item(
        item: dict[str, Any],
        ano: int,
        mes: int,
        ibge: int,
        extracted_at: str | None = None,
    ) -> dict[str, Any]:
        """Normaliza as colunas de retorno do SICONFI para o esquema raw da tabela siconfi_msc_patrimonial."""
        item_ano = item.get("exercicio") or item.get("an_referencia") or ano
        item_mes = item.get("mes_referencia") or item.get("me_referencia") or mes
        item_ibge = item.get("cod_ibge") or item.get("id_ente") or ibge
        fonte = item.get("fonte_recursos")

        return {
            "ano": int(item_ano),
            "mes_referencia": int(item_mes),
            "cod_ibge": int(item_ibge),
            "tipo_matriz": str(item.get("tipo_matriz") or item.get("co_tipo_matriz") or "MSCC"),
            "classe_conta": int(item.get("classe_conta") or 1),
            "conta_contabil": str(item.get("conta_contabil", "")),
            "poder_orgao": str(item.get("poder_orgao", "")),
            "financeiro_permanente": int(item.get("financeiro_permanente", 1)),
            "ano_fonte_recursos": int(item.get("ano_fonte_recursos", 1)),
            "fonte_recursos": str(fonte) if fonte is not None else "sem_fonte",
            "valor": float(item.get("valor", 0.0)),
            "natureza_conta": str(item.get("natureza_conta", "D")),
            "tipo_valor": str(item.get("tipo_valor") or "ending_balance"),
            "data_referencia": str(item.get("data_referencia") or ""),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }


def load_siconfi_msc(db: Connectable, rows: list[dict[str, Any]]) -> int:
    """Insere ou atualiza os registros de MSC Patrimonial na tabela raw_porciuncula_prefeitura.siconfi_msc_patrimonial."""
    if not rows:
        return 0
    return upsert(db, "siconfi_msc_patrimonial", rows, KEY_COLS)
