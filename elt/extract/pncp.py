import argparse
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests

from elt.core.db import Connectable

logger = logging.getLogger(__name__)

PNCP_BASE_URL = "https://pncp.gov.br/api/consulta"
DEFAULT_USER_AGENT = "TransparenciaPublica/1.0"
DEFAULT_CNPJ_PORCIUNCULA = "28920999000106"


class PncpExtractor:
    """Extrator de contratações, itens e resultados de disputa via API do PNCP."""

    def __init__(
        self,
        base_url: str = PNCP_BASE_URL,
        user_agent: str = DEFAULT_USER_AGENT,
        min_interval_seconds: float = 0.5,
        max_retries: int = 3,
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
                if resp.status_code == 404:
                    logger.debug("Recurso não encontrado (404): %s", url)
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

        logger.error("Todas as %d tentativas falharam para %s: %s", self.max_retries, url, last_err)
        return None

    def fetch_publicacoes(
        self,
        data_inicial: str,
        data_final: str,
        cnpj: str = DEFAULT_CNPJ_PORCIUNCULA,
        codigo_modalidade: int | None = None,
        pagina: int = 1,
        tamanho_pagina: int = 10,
        session: requests.Session | None = None,
    ) -> dict[str, Any] | None:
        """Consulta contratações publicadas por intervalo de datas (AAAAMMDD) e CNPJ."""
        params: dict[str, Any] = {
            "dataInicial": data_inicial,
            "dataFinal": data_final,
            "cnpj": cnpj,
            "pagina": pagina,
            "tamanhoPagina": tamanho_pagina,
        }
        if codigo_modalidade is not None:
            params["codigoModalidadeContratacao"] = codigo_modalidade

        return self._request("v1/contratacoes/publicacao", params=params, session=session)

    def fetch_compra(
        self,
        cnpj: str,
        ano: int,
        sequencial: int,
        session: requests.Session | None = None,
    ) -> dict[str, Any] | None:
        """Busca os detalhes de uma compra específica pelo CNPJ, ano e sequencial."""
        endpoint = f"v1/orgaos/{cnpj}/compras/{ano}/{sequencial}"
        return self._request(endpoint, session=session)

    def fetch_itens(
        self,
        cnpj: str,
        ano: int,
        sequencial: int,
        pagina: int = 1,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Busca os itens licitados de uma compra específica."""
        endpoint = f"v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens"
        params = {"pagina": pagina}
        res = self._request(endpoint, params=params, session=session)
        raw_items: list[dict[str, Any]] = []
        if isinstance(res, list):
            raw_items = res
        elif isinstance(res, dict) and "items" in res and isinstance(res["items"], list):
            raw_items = res["items"]
        elif isinstance(res, dict) and "data" in res and isinstance(res["data"], list):
            raw_items = res["data"]

        ctrl = f"{cnpj}-{sequencial}/{ano}"
        for it in raw_items:
            it.setdefault("cnpj_orgao", cnpj)
            it.setdefault("ano_compra", ano)
            it.setdefault("sequencial_compra", sequencial)
            it.setdefault("numero_controle_pncp", ctrl)

        return raw_items

    def fetch_item_resultados(
        self,
        cnpj: str,
        ano: int,
        sequencial: int,
        numero_item: int,
        session: requests.Session | None = None,
    ) -> list[dict[str, Any]]:
        """Busca os resultados homologados/adjudicados de um item específico."""
        endpoint = f"v1/orgaos/{cnpj}/compras/{ano}/{sequencial}/itens/{numero_item}/resultados"
        res = self._request(endpoint, session=session)
        raw_results: list[dict[str, Any]] = []
        if isinstance(res, list):
            raw_results = res
        elif isinstance(res, dict) and "items" in res and isinstance(res["items"], list):
            raw_results = res["items"]
        elif isinstance(res, dict) and "data" in res and isinstance(res["data"], list):
            raw_results = res["data"]

        ctrl = f"{cnpj}-{sequencial}/{ano}"
        for r in raw_results:
            r.setdefault("cnpj_orgao", cnpj)
            r.setdefault("ano_compra", ano)
            r.setdefault("sequencial_compra", sequencial)
            r.setdefault("numero_item", numero_item)
            r.setdefault("numero_controle_pncp", ctrl)

        return raw_results

    @staticmethod
    def normalize_compra(compra: dict[str, Any], extracted_at: str | None = None) -> dict[str, str | None]:
        """Normaliza os campos de uma contratação para o schema raw_pncp.compras."""
        orgao = compra.get("orgaoEntidade") or {}
        cnpj = compra.get("cnpj_orgao") or compra.get("cnpjOrgao") or orgao.get("cnpj") or DEFAULT_CNPJ_PORCIUNCULA
        ano = compra.get("ano_compra") or compra.get("anoCompra") or compra.get("ano")
        seq = compra.get("sequencial_compra") or compra.get("sequencialCompra") or compra.get("sequencial")
        ctrl = compra.get("numero_controle_pncp") or compra.get("numeroControlePNCP")
        if not ctrl and cnpj and ano and seq:
            ctrl = f"{cnpj}-{seq}/{ano}"

        return {
            "numero_controle_pncp": str(ctrl) if ctrl else None,
            "cnpj_orgao": str(cnpj) if cnpj else None,
            "ano_compra": str(ano) if ano is not None else None,
            "sequencial_compra": str(seq) if seq is not None else None,
            "numero_compra": str(compra.get("numero_compra") or compra.get("numeroCompra") or ""),
            "processo": str(compra.get("processo") or compra.get("numeroProcesso") or ""),
            "objeto_compra": str(
                compra.get("objeto_compra") or compra.get("objetoCompra") or compra.get("objeto") or ""
            ),
            "link_sistema_origem": str(
                compra.get("link_sistema_origem") or compra.get("linkSistemaOrigem") or compra.get("linkEdital") or ""
            ),
            "modalidade_id": str(
                compra.get("modalidade_id")
                or compra.get("modalidadeId")
                or compra.get("codigoModalidadeContratacao")
                or ""
            ),
            "modalidade_nome": str(compra.get("modalidade_nome") or compra.get("modalidadeNome") or ""),
            "situacao_compra_id": str(compra.get("situacao_compra_id") or compra.get("situacaoCompraId") or ""),
            "situacao_compra_nome": str(compra.get("situacao_compra_nome") or compra.get("situacaoCompraNome") or ""),
            "data_publicacao_pncp": str(
                compra.get("data_publicacao_pncp")
                or compra.get("dataPublicacaoPncp")
                or compra.get("dataPublicacao")
                or ""
            ),
            "data_abertura_proposta": str(
                compra.get("data_abertura_proposta") or compra.get("dataAberturaProposta") or ""
            ),
            "valor_total_estimado": str(compra.get("valor_total_estimado") or compra.get("valorTotalEstimado") or ""),
            "valor_total_homologado": str(
                compra.get("valor_total_homologado") or compra.get("valorTotalHomologado") or ""
            ),
            "informacao_complementar": str(
                compra.get("informacao_complementar") or compra.get("informacaoComplementar") or ""
            ),
            "srp": str(compra.get("srp") or compra.get("srpFlag") or ""),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def normalize_item(item: dict[str, Any], extracted_at: str | None = None) -> dict[str, str | None]:
        """Normaliza os campos de um item para o schema raw_pncp.itens."""
        ctrl = item.get("numero_controle_pncp") or item.get("numeroControlePNCP")
        num_item = item.get("numero_item") or item.get("numeroItem") or item.get("item")

        return {
            "numero_controle_pncp": str(ctrl) if ctrl else None,
            "cnpj_orgao": str(item.get("cnpj_orgao") or item.get("cnpjOrgao") or DEFAULT_CNPJ_PORCIUNCULA),
            "ano_compra": str(item.get("ano_compra") or item.get("anoCompra") or item.get("ano") or ""),
            "sequencial_compra": str(
                item.get("sequencial_compra") or item.get("sequencialCompra") or item.get("sequencial") or ""
            ),
            "numero_compra": str(item.get("numero_compra") or item.get("numeroCompra") or ""),
            "numero_item": str(num_item) if num_item is not None else None,
            "descricao": str(item.get("descricao") or item.get("descricaoItem") or ""),
            "material_ou_servico": str(item.get("material_ou_servico") or item.get("materialOuServico") or ""),
            "quantidade": str(item.get("quantidade") or ""),
            "unidade_medida": str(item.get("unidade_medida") or item.get("unidadeMedida") or ""),
            "valor_unitario_estimado": str(
                item.get("valor_unitario_estimado") or item.get("valorUnitarioEstimado") or ""
            ),
            "valor_total_estimado": str(item.get("valor_total_estimado") or item.get("valorTotalEstimado") or ""),
            "situacao_item": str(item.get("situacao_item") or item.get("situacaoCompraItem") or ""),
            "criterio_julgamento": str(item.get("criterio_julgamento") or item.get("criterioJulgamento") or ""),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def normalize_item_resultado(resultado: dict[str, Any], extracted_at: str | None = None) -> dict[str, str | None]:
        """Normaliza os campos de um resultado homologado para o schema raw_pncp.itens_resultados."""
        ctrl = resultado.get("numero_controle_pncp") or resultado.get("numeroControlePNCP")
        num_item = resultado.get("numero_item") or resultado.get("numeroItem") or resultado.get("item")
        seq_res = (
            resultado.get("sequencial_resultado")
            or resultado.get("sequencialResultado")
            or resultado.get("sequencial")
            or 1
        )

        return {
            "numero_controle_pncp": str(ctrl) if ctrl else None,
            "cnpj_orgao": str(resultado.get("cnpj_orgao") or resultado.get("cnpjOrgao") or DEFAULT_CNPJ_PORCIUNCULA),
            "ano_compra": str(resultado.get("ano_compra") or resultado.get("anoCompra") or resultado.get("ano") or ""),
            "sequencial_compra": str(
                resultado.get("sequencial_compra")
                or resultado.get("sequencialCompra")
                or resultado.get("sequencial")
                or ""
            ),
            "numero_item": str(num_item) if num_item is not None else None,
            "sequencial_resultado": str(seq_res),
            "fornecedor_cnpj_cpf": str(
                resultado.get("fornecedor_cnpj_cpf")
                or resultado.get("niFornecedor")
                or resultado.get("cpfCnpjFornecedor")
                or ""
            ),
            "fornecedor_nome": str(
                resultado.get("fornecedor_nome") or resultado.get("nomeRazaoSocialFornecedor") or ""
            ),
            "valor_unitario_homologado": str(
                resultado.get("valor_unitario_homologado") or resultado.get("valorUnitarioHomologado") or ""
            ),
            "valor_total_homologado": str(
                resultado.get("valor_total_homologado") or resultado.get("valorTotalHomologado") or ""
            ),
            "percentual_desconto": str(
                resultado.get("percentual_desconto") or resultado.get("percentualDesconto") or ""
            ),
            "situacao_resultado": str(resultado.get("situacao_resultado") or resultado.get("situacaoResultado") or ""),
            "data_resultado": str(resultado.get("data_resultado") or resultado.get("dataResultado") or ""),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }


def extract_and_load_pncp(
    cnpj: str = DEFAULT_CNPJ_PORCIUNCULA,
    years: list[int] | None = None,
    db: Connectable | None = None,
    extractor: PncpExtractor | None = None,
    run_dir: Path | None = None,
    save_raw: bool = True,
) -> dict[str, int]:
    """Extrai e opcionalmente carrega compras, itens e resultados do PNCP."""
    if extractor is None:
        extractor = PncpExtractor()
    target_years = years or [2024, 2025, 2026]
    total_counts = {"compras": 0, "itens": 0, "itens_resultados": 0}

    all_compras: list[dict[str, Any]] = []
    all_itens: list[dict[str, Any]] = []
    all_resultados: list[dict[str, Any]] = []

    for year in target_years:
        data_inicial = f"{year}0101"
        data_final = f"{year}1231"
        logger.info("Consultando publicações do PNCP para CNPJ %s no exercício %d", cnpj, year)
        pagina = 1
        while True:
            pub_data = extractor.fetch_publicacoes(
                data_inicial=data_inicial,
                data_final=data_final,
                cnpj=cnpj,
                pagina=pagina,
                tamanho_pagina=20,
            )
            if not pub_data or not isinstance(pub_data, dict):
                break
            registros = pub_data.get("data") or []
            if not registros:
                break

            for item_pub in registros:
                ano_compra = item_pub.get("anoCompra") or year
                seq_compra = item_pub.get("sequencialCompra")
                if not seq_compra:
                    continue
                compra_detalhe = extractor.fetch_compra(cnpj, int(ano_compra), int(seq_compra))
                merged_compra = {**item_pub, **(compra_detalhe or {})}
                norm_compra = extractor.normalize_compra(merged_compra)
                all_compras.append(norm_compra)

                raw_itens = extractor.fetch_itens(cnpj, int(ano_compra), int(seq_compra))
                for raw_item in raw_itens:
                    norm_item = extractor.normalize_item(raw_item)
                    all_itens.append(norm_item)

                    num_item = raw_item.get("numeroItem") or raw_item.get("numero_item")
                    if num_item:
                        raw_resultados = extractor.fetch_item_resultados(
                            cnpj, int(ano_compra), int(seq_compra), int(num_item)
                        )
                        for raw_res in raw_resultados:
                            norm_res = extractor.normalize_item_resultado(raw_res)
                            all_resultados.append(norm_res)

            total_registros = pub_data.get("totalRegistros", 0)
            if pagina * 20 >= total_registros:
                break
            pagina += 1

    if save_raw and run_dir:
        pncp_dir = run_dir / "pncp"
        pncp_dir.mkdir(parents=True, exist_ok=True)
        (pncp_dir / "compras.json").write_text(json.dumps(all_compras, ensure_ascii=False, indent=2))
        (pncp_dir / "itens.json").write_text(json.dumps(all_itens, ensure_ascii=False, indent=2))
        (pncp_dir / "itens_resultados.json").write_text(json.dumps(all_resultados, ensure_ascii=False, indent=2))
        logger.info("Arquivos raw PNCP salvos em %s", pncp_dir)

    if db is not None:
        from elt.load.pncp import (
            ensure_pncp_tables,
            load_pncp_compras,
            load_pncp_itens,
            load_pncp_itens_resultados,
        )

        ensure_pncp_tables(db)
        if all_compras:
            total_counts["compras"] = load_pncp_compras(db, all_compras)
        if all_itens:
            total_counts["itens"] = load_pncp_itens(db, all_itens)
        if all_resultados:
            total_counts["itens_resultados"] = load_pncp_itens_resultados(db, all_resultados)

        logger.info(
            "Carga PNCP concluída no PostgreSQL: %d compras, %d itens, %d resultados",
            total_counts["compras"],
            total_counts["itens"],
            total_counts["itens_resultados"],
        )

    return total_counts


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega contratações, itens e resultados do PNCP")
    parser.add_argument("--cnpj", default=DEFAULT_CNPJ_PORCIUNCULA, help="CNPJ do órgão (default: 28920999000106)")
    parser.add_argument("--years", nargs="+", type=int, help="Anos a extrair (default: 2024 2025 2026)")
    parser.add_argument("--raw-only", action="store_true", help="Apenas salva os arquivos JSON sem carregar no banco")
    parser.add_argument("--dir", help="Diretório de saída para raw JSON")
    args = parser.parse_args()

    from elt.core.db import get_engine

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(args.dir) if args.dir else Path(f"data/raw_runs/pncp/{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)

    db_engine = None if args.raw_only else get_engine()
    counts = extract_and_load_pncp(
        cnpj=args.cnpj,
        years=args.years,
        db=db_engine,
        run_dir=run_dir,
        save_raw=True,
    )
    logger.info("Processamento finalizado com sucesso: %s", counts)


if __name__ == "__main__":
    main()
