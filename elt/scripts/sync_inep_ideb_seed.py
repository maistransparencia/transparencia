"""Sincronizador canônico da seed do IDEB/Saeb oficial do INEP.

Baixa os pacotes oficiais de divulgação do IDEB do INEP (anos iniciais e finais),
extrai os dados históricos e recentes (2021, 2023, 2025) para os municípios do Estado
do Rio de Janeiro e gera o arquivo seed versionado `elt/transform/seeds/seed_inep_ideb.csv`.
"""

import argparse
import io
import logging
import ssl
import sys
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

INEP_BASE_URL = "https://download.inep.gov.br/ideb/resultados"
DEFAULT_YEARS = [2021, 2023, 2025]
DEFAULT_TARGET_YEAR = 2025
DEFAULT_UF = "RJ"

REDE_MAP: dict[str, str] = {
    "municipal": "municipal",
    "estadual": "estadual",
    "pública": "publica",
    "publica": "publica",
}

ETAPAS_CONFIG: list[dict[str, str]] = [
    {
        "etapa_ensino": "anos_iniciais",
        "zip_prefix": "divulgacao_anos_iniciais_municipios",
    },
    {
        "etapa_ensino": "anos_finais",
        "zip_prefix": "divulgacao_anos_finais_municipios",
    },
]


def create_insecure_ssl_context() -> ssl.SSLContext:
    """Cria contexto SSL permissivo para lidar com certificados intermediários e cifras legadas do INEP."""
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    try:
        ctx.maximum_version = ssl.TLSVersion.TLSv1_2
    except Exception:
        pass
    for cipher in ["DEFAULT@SECLEVEL=1", "ALL:@SECLEVEL=1", "HIGH:!DH:!aNULL"]:
        try:
            ctx.set_ciphers(cipher)
            break
        except Exception:
            continue
    return ctx


def parse_numeric(val: Any) -> float | None:
    """Converte valores brutos da planilha do INEP em float ou None (para células vazias, '-', 'ND')."""
    if val is None or pd.isna(val):
        return None
    s = str(val).strip()
    if s in ("", "-", "ND", "nd", "None", "nan", "*", "--"):
        return None
    s = s.replace(",", ".")
    try:
        parsed = float(s)
        if pd.isna(parsed):
            return None
        return parsed
    except (ValueError, TypeError):
        return None


def normalize_rede(raw_rede: str | None) -> str | None:
    """Normaliza dependência administrativa para lowercase snake_case (municipal, estadual, publica)."""
    if not raw_rede:
        return None
    cleaned = raw_rede.strip().lower()
    return REDE_MAP.get(cleaned)


def check_cycle_published(year: int, timeout: int = 5) -> bool:
    """Realiza verificação leve HTTP HEAD contra os endpoints do INEP para verificar se o ciclo foi publicado.

    Retorna True se ambos os pacotes (anos iniciais e anos finais) retornarem HTTP 200.
    """
    ctx = create_insecure_ssl_context()
    for cfg in ETAPAS_CONFIG:
        zip_prefix = cfg["zip_prefix"]
        url = f"{INEP_BASE_URL}/{zip_prefix}_{year}.zip"
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
            method="HEAD",
        )
        try:
            with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
                if resp.status != 200:
                    return False
        except urllib.error.HTTPError as e:
            if e.code == 404:
                logger.info("Pacote %s_%s ainda não publicado no INEP (HTTP 404).", zip_prefix, year)
            else:
                logger.warning("Falha HTTP %s ao verificar pacote %s_%s no INEP.", e.code, zip_prefix, year)
            return False
        except Exception as e:
            logger.warning("Erro de conexão ao verificar pacote %s_%s no INEP: %s", zip_prefix, year, e)
            return False
    return True


def download_zip(url: str, timeout: int = 60) -> bytes:
    """Baixa o pacote ZIP de resultados do INEP via HTTPS."""
    logger.info("Baixando %s ...", url)
    ctx = create_insecure_ssl_context()
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
        if resp.status != 200:
            raise RuntimeError(f"Falha ao baixar {url}: HTTP {resp.status}")
        data = resp.read()
    logger.info("Download concluído com sucesso (%d bytes).", len(data))
    return data


def extract_ideb_from_excel(
    excel_file: bytes | io.BytesIO | Path | str,
    etapa_ensino: str,
    years: list[int] | None = None,
    uf: str | None = DEFAULT_UF,
) -> list[dict[str, Any]]:
    """Extrai os dados do IDEB/Saeb da planilha Excel oficial do INEP para os anos e UF especificados."""
    xl = pd.ExcelFile(excel_file)
    sheet_name = xl.sheet_names[0]
    # As planilhas do INEP possuem 9 linhas de metadados; o cabeçalho técnico está na linha index 9
    df = xl.parse(sheet_name, skiprows=9)

    # Filtra por UF especificada caso não seja "ALL" ou None
    if uf is not None and uf.strip().upper() != "ALL" and "SG_UF" in df.columns:
        df = df[df["SG_UF"].astype(str).str.strip().str.upper() == uf.strip().upper()]

    if years is None:
        # Auto-detecta dinamicamente todos os anos observados disponíveis na planilha oficial
        detected_years = sorted(
            {
                int(str(c).split("_")[-1])
                for c in df.columns
                if str(c).startswith("VL_OBSERVADO_") and str(c).split("_")[-1].isdigit()
            }
        )
        years = detected_years if detected_years else DEFAULT_YEARS

    records: list[dict[str, Any]] = []

    for _, row in df.iterrows():
        raw_rede = str(row.get("REDE", "")).strip()
        rede = normalize_rede(raw_rede)
        if not rede:
            continue

        raw_cod_ibge = row.get("CO_MUNICIPIO")
        if raw_cod_ibge is None or pd.isna(raw_cod_ibge):
            continue

        try:
            cod_ibge = int(float(str(raw_cod_ibge).strip()))
        except (ValueError, TypeError):
            continue

        for ano in years:
            nota_ideb = parse_numeric(row.get(f"VL_OBSERVADO_{ano}"))
            meta_ideb = parse_numeric(row.get(f"VL_PROJECAO_{ano}"))

            saeb_matematica = parse_numeric(row.get(f"VL_NOTA_MATEMATICA_{ano}"))
            saeb_lingua_portuguesa = parse_numeric(row.get(f"VL_NOTA_PORTUGUES_{ano}"))
            taxa_aprovacao = parse_numeric(row.get(f"VL_INDICADOR_REND_{ano}"))

            records.append(
                {
                    "cod_ibge": cod_ibge,
                    "ano": ano,
                    "rede": rede,
                    "etapa_ensino": etapa_ensino,
                    "nota_ideb": nota_ideb,
                    "meta_ideb": meta_ideb,
                    "saeb_matematica": saeb_matematica,
                    "saeb_lingua_portuguesa": saeb_lingua_portuguesa,
                    "taxa_aprovacao": taxa_aprovacao,
                }
            )

    return records


def extract_from_zip_bytes(
    zip_bytes: bytes,
    etapa_ensino: str,
    years: list[int] | None = None,
    uf: str | None = DEFAULT_UF,
) -> list[dict[str, Any]]:
    """Extrai os dados da planilha contida dentro de um arquivo ZIP em memória."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        xlsx_candidates = [
            n
            for n in z.namelist()
            if n.lower().endswith(".xlsx") and not n.startswith("__MACOSX") and not Path(n).name.startswith("._")
        ]
        if not xlsx_candidates:
            raise ValueError("Nenhum arquivo .xlsx encontrado dentro do arquivo ZIP fornecido.")
        xlsx_name = xlsx_candidates[0]
        xlsx_bytes = z.read(xlsx_name)

    return extract_ideb_from_excel(io.BytesIO(xlsx_bytes), etapa_ensino=etapa_ensino, years=years, uf=uf)


def sync_inep_ideb_seed(
    output_path: Path | str,
    target_year: int = DEFAULT_TARGET_YEAR,
    years: list[int] | None = None,
    uf: str | None = DEFAULT_UF,
) -> Path:
    """Sincroniza e consolida os dados do IDEB gerando o arquivo CSV de seed."""
    effective_years = sorted(set((years if years is not None else DEFAULT_YEARS) + [target_year]))

    out_file = Path(output_path)
    all_records: list[dict[str, Any]] = []

    for cfg in ETAPAS_CONFIG:
        etapa_ensino = cfg["etapa_ensino"]
        zip_prefix = cfg["zip_prefix"]
        url = f"{INEP_BASE_URL}/{zip_prefix}_{target_year}.zip"
        zip_bytes = download_zip(url)
        records = extract_from_zip_bytes(zip_bytes, etapa_ensino=etapa_ensino, years=effective_years, uf=uf)
        logger.info("Extraídos %d registros para etapa '%s'.", len(records), etapa_ensino)
        all_records.extend(records)

    df_out = pd.DataFrame(all_records)

    # Ordenação determinística para controle de versão consistente
    sort_cols = ["cod_ibge", "ano", "etapa_ensino", "rede"]
    df_out = df_out.sort_values(by=sort_cols).reset_index(drop=True)

    # Remoção defensiva de possíveis duplicatas no grão único
    df_out = df_out.drop_duplicates(subset=sort_cols)

    out_file.parent.mkdir(parents=True, exist_ok=True)
    df_out.to_csv(out_file, index=False, na_rep="")
    logger.info("Seed do IDEB gerada com sucesso em '%s' com %d linhas.", out_file, len(df_out))
    return out_file


def is_year_in_seed(year: int, seed_path: Path | str = "elt/transform/seeds/seed_inep_ideb.csv") -> bool:
    """Verifica se o ano de avaliação já consta no arquivo de seed existente."""
    path = Path(seed_path)
    if not path.exists():
        return False
    try:
        df = pd.read_csv(path, usecols=["ano"])
        return int(year) in df["ano"].unique()
    except Exception:
        return False


def main() -> None:
    """Ponto de entrada de linha de comando."""
    parser = argparse.ArgumentParser(description="Sincronizador da seed do IDEB oficial do INEP")
    parser.add_argument(
        "--year",
        type=int,
        default=DEFAULT_TARGET_YEAR,
        help=f"Ano de divulgação do INEP a ser processado (padrão: {DEFAULT_TARGET_YEAR})",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="elt/transform/seeds/seed_inep_ideb.csv",
        help="Caminho do arquivo CSV de destino da seed",
    )
    parser.add_argument(
        "--uf",
        type=str,
        default=DEFAULT_UF,
        help=f"Sigla da UF para filtragem (padrão: {DEFAULT_UF}, ou 'ALL' para todos os estados)",
    )
    parser.add_argument(
        "--years",
        nargs="+",
        type=int,
        default=None,
        help="Lista de anos a extrair (padrão: anos padrão do módulo mais o ano alvo)",
    )
    parser.add_argument(
        "--check-next",
        type=int,
        metavar="YEAR",
        help="Executa apenas a verificação leve se o próximo ciclo bienal já foi publicado no INEP",
    )
    args = parser.parse_args()

    if args.check_next:
        if is_year_in_seed(args.check_next, args.output):
            logger.info("Ciclo %s já consta na seed '%s'. Nenhuma ação necessária.", args.check_next, args.output)
            sys.exit(1)

        published = check_cycle_published(args.check_next)
        if published:
            logger.info(
                "NOVO CICLO DETECTADO: Ciclo %s está disponível para download e não consta na seed!",
                args.check_next,
            )
            sys.exit(0)
        else:
            logger.info("Ciclo %s não detectado no INEP.", args.check_next)
            sys.exit(1)

    sync_inep_ideb_seed(output_path=args.output, target_year=args.year, years=args.years, uf=args.uf)


if __name__ == "__main__":
    main()
