import argparse
import json
import logging
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests
from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine

from elt.core.config import PortalConfig
from elt.core.db import Connectable, get_engine, upsert

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
    "natureza_conta",
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
        ano = ano or datetime.now().year
        mes = mes or datetime.now().month

        client = session or requests
        params: dict[str, str | int] = {
            "id_ente": ibge,
            "an_referencia": str(ano),
            "me_referencia": str(mes),
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
    def _safe_int(val: Any, default: int = 0) -> int:
        if val is None or val == "":
            return default
        try:
            return int(val)
        except (ValueError, TypeError):
            return default

    @staticmethod
    def _safe_float(val: Any, default: float = 0.0) -> float:
        if val is None or val == "":
            return default
        try:
            return float(val)
        except (ValueError, TypeError):
            return default

    @classmethod
    def normalize_item(
        cls,
        item: dict[str, Any],
        ano: int,
        mes: int,
        ibge: int,
        extracted_at: str | None = None,
    ) -> dict[str, Any]:
        """Normaliza as colunas de retorno do SICONFI para o esquema raw da tabela siconfi_msc_patrimonial."""
        item_ano = cls._safe_int(item.get("exercicio") or item.get("an_referencia"), ano)
        item_mes = cls._safe_int(item.get("mes_referencia") or item.get("me_referencia"), mes)
        item_ibge = cls._safe_int(item.get("cod_ibge") or item.get("id_ente"), ibge)
        fonte = item.get("fonte_recursos")

        return {
            "ano": item_ano,
            "mes_referencia": item_mes,
            "cod_ibge": item_ibge,
            "tipo_matriz": str(item.get("tipo_matriz") or item.get("co_tipo_matriz") or "MSCC"),
            "classe_conta": cls._safe_int(item.get("classe_conta"), 1),
            "conta_contabil": str(item.get("conta_contabil") or ""),
            "poder_orgao": str(item.get("poder_orgao") or ""),
            "financeiro_permanente": cls._safe_int(item.get("financeiro_permanente"), 1),
            "ano_fonte_recursos": cls._safe_int(item.get("ano_fonte_recursos"), 0),
            "fonte_recursos": str(fonte) if fonte is not None and str(fonte).strip() != "" else "sem_fonte",
            "valor": cls._safe_float(item.get("valor"), 0.0),
            "natureza_conta": str(item.get("natureza_conta") or "D"),
            "tipo_valor": str(item.get("tipo_valor") or "ending_balance"),
            "data_referencia": str(item.get("data_referencia") or ""),
            "data_extracao": extracted_at or datetime.now(timezone.utc).isoformat(),
        }


def ensure_siconfi_table(engine: Connectable, schema: str = "raw_porciuncula_prefeitura") -> None:
    """Garante a existência da tabela raw de MSC Patrimonial no schema especificado."""
    ddl = f"""
    CREATE SCHEMA IF NOT EXISTS "{schema}";
    CREATE TABLE IF NOT EXISTS "{schema}"."siconfi_msc_patrimonial" (
        ano INTEGER NOT NULL,
        mes_referencia INTEGER NOT NULL,
        cod_ibge INTEGER NOT NULL,
        tipo_matriz TEXT NOT NULL,
        classe_conta INTEGER NOT NULL,
        conta_contabil TEXT NOT NULL,
        poder_orgao TEXT NOT NULL,
        financeiro_permanente INTEGER NOT NULL,
        ano_fonte_recursos INTEGER NOT NULL,
        fonte_recursos TEXT NOT NULL,
        valor NUMERIC NOT NULL,
        natureza_conta TEXT NOT NULL,
        tipo_valor TEXT NOT NULL,
        data_referencia TEXT,
        data_extracao TEXT,
        PRIMARY KEY (ano, mes_referencia, cod_ibge, conta_contabil, poder_orgao, fonte_recursos, ano_fonte_recursos, financeiro_permanente, tipo_valor, natureza_conta)
    );
    """
    if isinstance(engine, Engine):
        with engine.begin() as conn:
            conn.execute(text(ddl))
    elif isinstance(engine, Connection):
        engine.execute(text(ddl))


def load_siconfi_msc(db: Connectable, rows: list[dict[str, Any]]) -> int:
    """Insere ou atualiza os registros de MSC Patrimonial na tabela raw_<portal>.siconfi_msc_patrimonial."""
    if not rows:
        return 0
    return upsert(db, "siconfi_msc_patrimonial", rows, KEY_COLS)


def extract_and_load_siconfi(
    portal: PortalConfig,
    years: list[int] | None = None,
    db: Connectable | None = None,
    run_dir: Path | None = None,
    save_raw: bool = True,
    session: requests.Session | None = None,
) -> int:
    """Extrai dados da MSC Patrimonial do SICONFI para os anos informados, salvando raw JSON e/ou inserindo no banco."""
    years = years or list(range(portal.ano_inicial, date.today().year + 1))
    extractor = SiconfiMscExtractor()
    total_loaded = 0

    if db is not None:
        ensure_siconfi_table(db, portal.raw_schema)

    for year in years:
        logger.info("Extraindo SICONFI MSC Patrimonial para IBGE %s, ano %s...", portal.cod_ibge, year)
        rows = extractor.extract_ano(portal.cod_ibge, year, session=session)
        logger.info("Extraídos %d registros da MSC Patrimonial para %s", len(rows), year)

        if save_raw and run_dir:
            out_file = run_dir / "siconfi_msc_patrimonial" / f"{portal.cod_ibge}_{year}.json"
            out_file.parent.mkdir(parents=True, exist_ok=True)
            out_file.write_text(json.dumps(rows, ensure_ascii=False, indent=2))
            logger.info("Arquivo raw salvo em %s", out_file)

        if db is not None and rows:
            loaded = load_siconfi_msc(db, rows)
            logger.info("Inseridos/atualizados %d registros na tabela siconfi_msc_patrimonial", loaded)
            total_loaded += loaded

    return total_loaded


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Extrai e carrega Matriz de Saldos Contábeis (MSC) do SICONFI")
    parser.add_argument(
        "--portal", default="porciuncula_prefeitura", help="Portal slug (default: porciuncula_prefeitura)"
    )
    parser.add_argument("--years", nargs="+", type=int, help="Anos a extrair (default: todos desde ano_inicial)")
    parser.add_argument("--raw-only", action="store_true", help="Apenas salva o arquivo JSON cru sem carregar no banco")
    parser.add_argument("--load-only", action="store_true", help="Apenas carrega arquivos JSON já existentes no banco")
    parser.add_argument("--dir", help="Diretório customizado de saída ou entrada para raw JSON")
    args = parser.parse_args()

    portal = PortalConfig.load(args.portal)

    if args.load_only:
        run_dir = Path(args.dir) if args.dir else Path(f"data/raw_runs/{portal.slug}")
        if not run_dir.exists():
            raise ValueError(f"Diretório {run_dir} não existe.")
        engine = get_engine()
        ensure_siconfi_table(engine, portal.raw_schema)
        total = 0
        for json_file in sorted(run_dir.rglob("*.json")):
            if json_file.parent.name == "siconfi_msc_patrimonial":
                rows = json.loads(json_file.read_text(encoding="utf-8"))
                loaded = load_siconfi_msc(engine, rows)
                logger.info("Carregados %d registros de %s", loaded, json_file)
                total += loaded
        logger.info("Carga concluída. Total: %d registros.", total)
        return

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = Path(args.dir) if args.dir else Path(f"data/raw_runs/{portal.slug}/{timestamp}")
    run_dir.mkdir(parents=True, exist_ok=True)

    db_engine: Connectable | None = None if args.raw_only else get_engine()
    total = extract_and_load_siconfi(
        portal=portal,
        years=args.years,
        db=db_engine,
        run_dir=run_dir,
        save_raw=True,
    )
    logger.info("Extração e carga SICONFI concluída. Total de registros carregados: %d", total)


if __name__ == "__main__":
    main()
