"""Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI.

Auditoria, benchmarking e prototipagem de extração de dados abertos governamentais
para os municípios do Estado do Rio de Janeiro.
"""

from __future__ import annotations

import argparse
import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Optional, TypedDict

import requests

logger = logging.getLogger(__name__)

CANONICAL_USER_AGENT = "TransparenciaCivicaBot/1.0 (+https://github.com/maistransparencia/transparencia)"
TCERJ_BASE_URL = "https://dados.tcerj.tc.br/api/v1"
SICONFI_BASE_URL = "https://apidatalake.tesouro.gov.br/ords/siconfi/tt"

IBGE_CODES: dict[str, int] = {
    "PORCIUNCULA": 3304102,
    "VARRE-SAI": 3306152,
    "NATIVIDADE": 3303209,
    "ITAPERUNA": 3302201,
}

SICONFI_IBGE_CODES: dict[str, int] = {
    "PORCIUNCULA": 3304102,
    "VARRE-SAI": 3306152,
    "NATIVIDADE": 3303209,
    "ITAPERUNA": 3302201,
}


class ProbeResult(TypedDict):
    endpoint: str
    url: str
    status_code: Optional[int]
    rtt_ms: float
    count: int
    total_records: Optional[int]
    items: list[dict[str, Any]]
    timeout: bool
    error: Optional[str]


def normalize_tce_response(data: Any) -> list[dict[str, Any]]:
    """Normaliza envelopes polimórficos de respostas do TCE-RJ e SICONFI.

    Suporta:
    - Listas diretas: `[...]`
    - Dicionários com chaves canônicas: `{"Licitacoes": [...], "Count": n}`,
      `{"Compras": [...], "Count": n}`, `{"SituacoesFuncionais": [...]}`
    - Dicionários genéricos onde o payload de dados é a primeira lista não vazia encontrada
    - Envelopes SICONFI: `{"items": [...]}`
    """
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]

    if isinstance(data, dict):
        priority_keys = (
            "Licitacoes",
            "Compras",
            "SituacoesFuncionais",
            "Contratos",
            "Empenhos",
            "Receitas",
            "PrestacaoContas",
            "GastosPessoal",
            "ObrasParalisadas",
            "Dotacoes",
            "items",
            "itens",
            "dados",
        )
        for key in priority_keys:
            val = data.get(key)
            if isinstance(val, list):
                items = [item for item in val if isinstance(item, dict)]
                if items:
                    return items

        for val in data.values():
            if isinstance(val, list):
                items = [item for item in val if isinstance(item, dict)]
                if items:
                    return items

    return []


class TceRjSigfisSpikeClient:
    """Cliente HTTP resiliente para auditoria e extração de dados do TCE-RJ e SICONFI."""

    def __init__(
        self,
        tce_base_url: str = TCERJ_BASE_URL,
        siconfi_base_url: str = SICONFI_BASE_URL,
        user_agent: str = CANONICAL_USER_AGENT,
        default_timeout: float = 10.0,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.tce_base_url = tce_base_url.rstrip("/")
        self.siconfi_base_url = siconfi_base_url.rstrip("/")
        self.user_agent = user_agent
        self.default_timeout = default_timeout
        self.session = session or requests.Session()

    def __enter__(self) -> TceRjSigfisSpikeClient:
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self.close()

    def close(self) -> None:
        self.session.close()

    def _build_headers(self) -> dict[str, str]:
        return {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }

    def _execute_request(
        self,
        base_url: str,
        route: str,
        params: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
        service_label: str = "TCE-RJ",
    ) -> ProbeResult:
        """Executa requisição HTTP resiliente para um endpoint remoto medindo RTT e capturando falhas."""
        clean_route = route.strip("/")
        url = f"{base_url}/{clean_route}"
        effective_timeout = timeout if timeout is not None else self.default_timeout
        headers = self._build_headers()
        clean_params = {k: v for k, v in (params or {}).items() if v is not None}

        start_time = time.perf_counter()
        try:
            resp = self.session.get(url, params=clean_params, headers=headers, timeout=effective_timeout)
            rtt_ms = round((time.perf_counter() - start_time) * 1000, 2)

            if resp.status_code == 200:
                try:
                    payload = resp.json()
                    items = normalize_tce_response(payload)
                    total_rec: Optional[int] = None
                    err_msg: Optional[str] = None

                    if isinstance(payload, dict):
                        count_val = payload.get("Count") or payload.get("count")
                        if isinstance(count_val, int):
                            total_rec = count_val
                        if "erro" in payload or "error" in payload:
                            err_msg = str(payload.get("erro") or payload.get("error"))

                    return ProbeResult(
                        endpoint=f"/{clean_route}",
                        url=resp.url,
                        status_code=resp.status_code,
                        rtt_ms=rtt_ms,
                        count=len(items),
                        total_records=total_rec,
                        items=items,
                        timeout=False,
                        error=err_msg,
                    )
                except json.JSONDecodeError as json_err:
                    return ProbeResult(
                        endpoint=f"/{clean_route}",
                        url=resp.url,
                        status_code=resp.status_code,
                        rtt_ms=rtt_ms,
                        count=0,
                        total_records=None,
                        items=[],
                        timeout=False,
                        error=f"Falha ao decodificar JSON {service_label}: {json_err}",
                    )

            return ProbeResult(
                endpoint=f"/{clean_route}",
                url=resp.url,
                status_code=resp.status_code,
                rtt_ms=rtt_ms,
                count=0,
                total_records=None,
                items=[],
                timeout=False,
                error=f"HTTP status {resp.status_code}: {resp.text[:200]}",
            )

        except (requests.exceptions.Timeout, TimeoutError) as timeout_err:
            rtt_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.warning("Timeout excedido em %s na rota %s após %.2f ms", service_label, clean_route, rtt_ms)
            return ProbeResult(
                endpoint=f"/{clean_route}",
                url=url,
                status_code=None,
                rtt_ms=rtt_ms,
                count=0,
                total_records=None,
                items=[],
                timeout=True,
                error=f"Timeout de {effective_timeout}s excedido: {timeout_err}",
            )
        except requests.exceptions.RequestException as req_err:
            rtt_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error("Erro de requisição em %s na rota %s: %s", service_label, clean_route, req_err)
            return ProbeResult(
                endpoint=f"/{clean_route}",
                url=url,
                status_code=None,
                rtt_ms=rtt_ms,
                count=0,
                total_records=None,
                items=[],
                timeout=False,
                error=str(req_err),
            )

    def query_tce(
        self,
        route: str,
        params: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        """Executa requisição a um endpoint da API do TCE-RJ."""
        return self._execute_request(
            base_url=self.tce_base_url,
            route=route,
            params=params,
            timeout=timeout,
            service_label="TCE-RJ",
        )

    def query_siconfi(
        self,
        endpoint: str = "msc_patrimonial",
        params: Optional[dict[str, Any]] = None,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        """Executa requisição a um endpoint da API do SICONFI (STN)."""
        return self._execute_request(
            base_url=self.siconfi_base_url,
            route=endpoint,
            params=params,
            timeout=timeout,
            service_label="SICONFI",
        )

    def query_licitacoes(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("licitacoes", params=params, timeout=timeout)

    def query_compras_diretas(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("compras_diretas_municipio", params=params, timeout=timeout)

    def query_prestacao_contas(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("prestacao_contas_municipio", params=params, timeout=timeout)

    def query_situacao_funcional(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("situacao_funcional", params=params, timeout=timeout)

    def query_empenho(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("empenho_municipio", params=params, timeout=timeout)

    def query_receitas(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("receitas_municipio", params=params, timeout=timeout)

    def query_contratos(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("contratos_municipio", params=params, timeout=timeout)

    def query_gastos_pessoal(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("gastos_com_pessoal", params=params, timeout=timeout)

    def query_obras_paralisadas(
        self,
        municipio: str = "PORCIUNCULA",
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        return self.query_tce("obras_paralisadas", params=params, timeout=timeout)

    def query_dotacao(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("dotacao_municipio", params=params, timeout=timeout)

    def query_licitante_vencedor(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("licitante_vencedor_municipio", params=params, timeout=timeout)

    def query_licitante_perdedor(
        self,
        municipio: str = "PORCIUNCULA",
        ano: Optional[int] = None,
        limite: int = 10,
        inicio: int = 0,
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        params: dict[str, Any] = {"municipio": municipio, "limite": limite, "inicio": inicio}
        if ano is not None:
            params["ano"] = ano
        return self.query_tce("licitante_perdedor_municipio", params=params, timeout=timeout)

    def query_siconfi_msc(
        self,
        ibge: int = 3304102,
        ano: int = 2024,
        mes: int = 12,
        classe_conta: int = 1,
        tipo_matriz: str = "MSCC",
        timeout: Optional[float] = None,
    ) -> ProbeResult:
        """Consulta Matriz de Saldos Contábeis (MSC) do SICONFI para o ente especificado."""
        params: dict[str, Any] = {
            "id_ente": ibge,
            "an_referencia": ano,
            "me_referencia": mes,
            "co_tipo_matriz": tipo_matriz,
            "classe_conta": classe_conta,
            "id_tv": "ending_balance",
        }
        return self.query_siconfi("msc_patrimonial", params=params, timeout=timeout)

    def run_audit(
        self,
        municipio: str = "PORCIUNCULA",
        ano: int = 2024,
        mes: int = 12,
        limite: int = 10,
        timeout: Optional[float] = None,
    ) -> dict[str, ProbeResult]:
        """Audita as rotas chave do TCE-RJ e SICONFI, retornando um mapa consolidado de resultados."""
        audit_results: dict[str, ProbeResult] = {}

        tce_queries = [
            ("licitacoes", lambda: self.query_licitacoes(municipio=municipio, ano=ano, limite=limite, timeout=timeout)),
            (
                "compras_diretas_municipio",
                lambda: self.query_compras_diretas(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "prestacao_contas_municipio",
                lambda: self.query_prestacao_contas(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "situacao_funcional",
                lambda: self.query_situacao_funcional(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "contratos_municipio",
                lambda: self.query_contratos(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "gastos_com_pessoal",
                lambda: self.query_gastos_pessoal(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "obras_paralisadas",
                lambda: self.query_obras_paralisadas(municipio=municipio, limite=limite, timeout=timeout),
            ),
            (
                "dotacao_municipio",
                lambda: self.query_dotacao(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "empenho_municipio",
                lambda: self.query_empenho(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
            (
                "receitas_municipio",
                lambda: self.query_receitas(municipio=municipio, ano=ano, limite=limite, timeout=timeout),
            ),
        ]

        for name, query_fn in tce_queries:
            logger.info("Auditando rota TCE-RJ: %s...", name)
            audit_results[name] = query_fn()

        ibge_siconfi = SICONFI_IBGE_CODES.get(municipio.upper(), IBGE_CODES.get(municipio.upper(), 3304102))
        logger.info("Auditando SICONFI MSC Patrimonial (IBGE %d, ano %d, mês %d)...", ibge_siconfi, ano, mes)
        audit_results["siconfi_msc_patrimonial"] = self.query_siconfi_msc(
            ibge=ibge_siconfi,
            ano=ano,
            mes=mes,
            classe_conta=1,
            timeout=timeout,
        )

        return audit_results


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Spike de R&D — Viabilidade de Dados Granulares no TCE-RJ (SIGFIS) & SICONFI",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--municipio", type=str, default="PORCIUNCULA", help="Nome do município fluminense")
    parser.add_argument("--ano", type=int, default=2024, help="Ano de exercício fiscal")
    parser.add_argument("--mes", type=int, default=12, help="Mês de competência (1-12) para SICONFI")
    parser.add_argument("--limite", type=int, default=10, help="Quantidade máxima de registros por página")
    parser.add_argument("--inicio", type=int, default=0, help="Offset inicial de paginação")
    parser.add_argument("--timeout", type=float, default=10.0, help="Timeout em segundos para cada requisição HTTP")
    parser.add_argument(
        "--rota",
        type=str,
        default="licitacoes",
        help="Rota a consultar (licitacoes, compras_diretas, prestacao_contas, situacao_funcional, contratos, empenho, receitas, siconfi_msc, obras_paralisadas, gastos_pessoal, dotacao, audit)",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/spikes",
        help="Diretório onde amostras JSON serão salvas caso solicitado",
    )
    parser.add_argument(
        "--sample-output",
        "--output-sample",
        dest="sample_output",
        action="store_true",
        help="Exporta o resultado da consulta em arquivo JSON formatado",
    )
    parser.add_argument(
        "--audit",
        action="store_true",
        help="Executa auditoria completa de todas as rotas prioritárias",
    )
    return parser


def main(argv: Optional[list[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    with TceRjSigfisSpikeClient(default_timeout=args.timeout) as client:
        output_dir = Path(args.output_dir)
        if args.sample_output:
            output_dir.mkdir(parents=True, exist_ok=True)

        if args.audit or args.rota == "audit":
            print("\n=======================================================")
            print(f"AUDITORIA DE VIABILIDADE TCE-RJ / SICONFI — {args.municipio} ({args.ano})")
            print("=======================================================")
            results = client.run_audit(
                municipio=args.municipio,
                ano=args.ano,
                mes=args.mes,
                limite=args.limite,
                timeout=args.timeout,
            )

            print(f"{'Endpoint':<32} | {'Status':<7} | {'RTT (ms)':<9} | {'Qtd':<6} | {'Timeout':<7} | Detalhes")
            print("-" * 85)
            for name, res in results.items():
                status_display = str(res["status_code"]) if res["status_code"] is not None else "ERR"
                timeout_display = "SIM" if res["timeout"] else "NÃO"
                details = res["error"] if res["error"] else f"{res['count']} itens recebidos"
                print(
                    f"{name:<32} | {status_display:<7} | {res['rtt_ms']:<9.2f} | {res['count']:<6} | {timeout_display:<7} | {details}"
                )

            if args.sample_output:
                clean_muni = "".join(c for c in args.municipio.lower() if c.isalnum() or c in ("_", "-"))
                summary_path = output_dir / f"audit_{clean_muni}_{args.ano}.json"
                summary_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
                print(f"\n[Amostra salva em]: {summary_path}")

            return 0

        route_name = args.rota.lower().replace("-", "_")
        result: ProbeResult

        if route_name in ("licitacoes", "licitacao"):
            result = client.query_licitacoes(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("compras_diretas", "compras_diretas_municipio"):
            result = client.query_compras_diretas(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("prestacao_contas", "prestacao_contas_municipio"):
            result = client.query_prestacao_contas(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("situacao_funcional", "situacao_funcional_municipio"):
            result = client.query_situacao_funcional(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("empenho", "empenho_municipio"):
            result = client.query_empenho(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("receitas", "receitas_municipio"):
            result = client.query_receitas(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("contratos", "contratos_municipio"):
            result = client.query_contratos(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("gastos_pessoal", "gastos_com_pessoal"):
            result = client.query_gastos_pessoal(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("obras_paralisadas", "obras"):
            result = client.query_obras_paralisadas(
                municipio=args.municipio,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("dotacao", "dotacao_municipio"):
            result = client.query_dotacao(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("licitante_vencedor", "licitante_vencedor_municipio"):
            result = client.query_licitante_vencedor(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("licitante_perdedor", "licitante_perdedor_municipio"):
            result = client.query_licitante_perdedor(
                municipio=args.municipio,
                ano=args.ano,
                limite=args.limite,
                inicio=args.inicio,
                timeout=args.timeout,
            )
        elif route_name in ("siconfi_msc", "msc_patrimonial"):
            ibge = SICONFI_IBGE_CODES.get(args.municipio.upper(), IBGE_CODES.get(args.municipio.upper(), 3304102))
            result = client.query_siconfi_msc(
                ibge=ibge,
                ano=args.ano,
                mes=args.mes,
                classe_conta=1,
                timeout=args.timeout,
            )
        else:
            result = client.query_tce(
                route_name,
                params={"municipio": args.municipio, "ano": args.ano, "limite": args.limite, "inicio": args.inicio},
                timeout=args.timeout,
            )

        print(f"\nRota: {result['endpoint']}")
        print(f"URL: {result['url']}")
        print(f"Status HTTP: {result['status_code']}")
        print(f"RTT: {result['rtt_ms']:.2f} ms")
        print(f"Timeout: {result['timeout']}")
        print(f"Registros extraídos: {result['count']}")
        if result.get("total_records") is not None:
            print(f"Total no servidor: {result['total_records']}")
        if result["error"]:
            print(f"Erro: {result['error']}")

        if args.sample_output:
            clean_muni = "".join(c for c in args.municipio.lower() if c.isalnum() or c in ("_", "-"))
            sample_path = output_dir / f"{route_name}_{clean_muni}_{args.ano}.json"
            sample_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"[Amostra salva em]: {sample_path}")

        if result["error"] is not None or result["timeout"]:
            return 1

        return 0


if __name__ == "__main__":
    sys.exit(main())
