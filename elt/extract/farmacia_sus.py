"""Extrator do estoque de medicamentos (BNAFAR/Hórus) e dos estabelecimentos (CNES).

Consome a API de dados abertos do Ministério da Saúde filtrando pelo código IBGE
de 6 dígitos do município. Os nomes de campo do payload são mapeados de forma
tolerante.
Falha de coleta nunca é confundida com apagão: quando o estoque não pode ser
consultado, a coleta é registrada como `falha` e nenhum estoque é emitido.
"""

from __future__ import annotations

import hashlib
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)

FARMACIA_SUS_BASE_URL = "https://apidadosabertos.saude.gov.br"
ENDPOINT_ESTOQUE = "/daf/estoque-medicamentos-bnafar-horus"
ENDPOINT_ESTABELECIMENTOS_CNES = "/cnes/estabelecimentos"
# A API do Ministério da Saúde não respondeu a User-Agents não-navegador em teste ao vivo.
DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; TransparenciaPublica/1.0)"
TAMANHO_PAGINA = 1000
MAXIMO_PAGINAS = 100
CHAVE_REGISTROS_ESTOQUE = "parametros"

CAMPOS_CNES = ("codigo_cnes", "co_cnes", "cnes")
CAMPOS_LOTE = ("numero_lote", "lote")
CAMPOS_MEDICAMENTO = (
    "descricao_produto",
    "nome_medicamento",
    "descricao_medicamento",
    "nome_produto",
    "medicamento",
    "descricao",
)
CAMPOS_QUANTIDADE = ("quantidade_estoque", "quantidade_em_estoque", "quantidade", "qt_estoque")
CAMPOS_DATA_POSICAO = ("data_posicao_estoque", "data_posicao", "data_atualizacao")
CAMPOS_NOME_UNIDADE = ("nome_fantasia", "razao_social", "nome_razao_social", "nome_estabelecimento", "nome")
CAMPOS_LOGRADOURO = ("endereco_estabelecimento", "endereco", "logradouro")
CAMPOS_NUMERO = ("numero_estabelecimento", "numero_endereco", "numero")
CAMPOS_BAIRRO = ("bairro_estabelecimento", "bairro")
CAMPOS_LATITUDE = ("nu_latitude", "latitude")
CAMPOS_LONGITUDE = ("nu_longitude", "longitude")
CAMPOS_TELEFONE = ("numero_telefone_estabelecimento", "telefone", "numero_telefone")


def codigo_ibge6(cod_ibge: int | str) -> str:
    """Converte o código IBGE de 7 dígitos para o de 6 dígitos usado pela API do SUS."""
    codigo = int(cod_ibge)
    return str(codigo // 10 if codigo >= 1_000_000 else codigo)


def _primeiro_valor(registro: dict[str, Any], chaves: tuple[str, ...]) -> str | None:
    for chave in chaves:
        valor = registro.get(chave)
        if valor is not None and str(valor).strip() != "":
            return str(valor).strip()
    return None


def _coordenada(registro: dict[str, Any], chaves: tuple[str, ...]) -> float | None:
    for chave in chaves:
        valor = registro.get(chave)
        if valor is None or str(valor).strip() == "":
            continue
        try:
            return float(str(valor).strip().replace(",", "."))
        except ValueError:
            continue
    return None


def _extrair_registros(corpo: Any) -> list[dict[str, Any]]:
    if isinstance(corpo, list):
        return [r for r in corpo if isinstance(r, dict)]
    if isinstance(corpo, dict):
        principal = corpo.get(CHAVE_REGISTROS_ESTOQUE)
        if isinstance(principal, list):
            return [r for r in principal if isinstance(r, dict)]
        for valor in corpo.values():
            if isinstance(valor, list):
                return [r for r in valor if isinstance(r, dict)]
    return []


def _mapear_estoque(portal_slug: str, data_coleta: str, registro: dict[str, Any]) -> dict[str, Any] | None:
    nome_medicamento = _primeiro_valor(registro, CAMPOS_MEDICAMENTO)
    if nome_medicamento is None:
        return None
    codigo_cnes = _primeiro_valor(registro, CAMPOS_CNES)
    data_posicao = _primeiro_valor(registro, CAMPOS_DATA_POSICAO)
    numero_lote = _primeiro_valor(registro, CAMPOS_LOTE)
    chave = "|".join([portal_slug, codigo_cnes or "", nome_medicamento, data_posicao or "", numero_lote or ""])
    return {
        "portal_slug": portal_slug,
        "id_registro": hashlib.sha256(chave.encode("utf-8")).hexdigest(),
        "codigo_cnes": codigo_cnes,
        "nome_medicamento": nome_medicamento,
        "quantidade_estoque": _primeiro_valor(registro, CAMPOS_QUANTIDADE),
        "numero_lote": numero_lote,
        "data_posicao_estoque": data_posicao,
        "data_coleta": data_coleta,
    }


def _competencia_cnes(registro: dict[str, Any]) -> int:
    try:
        return int(registro.get("nu_comp") or 0)
    except (TypeError, ValueError):
        return 0


def _mapear_estabelecimento(portal_slug: str, data_coleta: str, registro: dict[str, Any]) -> dict[str, Any] | None:
    codigo_cnes = _primeiro_valor(registro, CAMPOS_CNES)
    if codigo_cnes is None:
        return None
    endereco = ", ".join(
        parte
        for parte in (
            _primeiro_valor(registro, CAMPOS_LOGRADOURO),
            _primeiro_valor(registro, CAMPOS_NUMERO),
            _primeiro_valor(registro, CAMPOS_BAIRRO),
        )
        if parte
    )
    return {
        "portal_slug": portal_slug,
        "codigo_cnes": codigo_cnes,
        "nome_estabelecimento": _primeiro_valor(registro, CAMPOS_NOME_UNIDADE),
        "endereco_estabelecimento": endereco or None,
        "telefone_estabelecimento": _primeiro_valor(registro, CAMPOS_TELEFONE),
        "latitude_estabelecimento": _coordenada(registro, CAMPOS_LATITUDE),
        "longitude_estabelecimento": _coordenada(registro, CAMPOS_LONGITUDE),
        "data_coleta": data_coleta,
    }


class FarmaciaSusExtractor:
    """Cliente da API de dados abertos do Ministério da Saúde (estoque BNAFAR/Hórus e CNES)."""

    def __init__(
        self,
        base_url: str = FARMACIA_SUS_BASE_URL,
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

    def _request(self, endpoint: str, params: dict[str, Any], session: requests.Session) -> Any:
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {"User-Agent": self.user_agent, "Accept": "application/json"}
        last_err: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            self._wait_rate_limit()
            try:
                self._last_request_time = time.monotonic()
                resp = session.get(url, params=params, headers=headers, timeout=self.timeout)
                if resp.status_code == 200:
                    return resp.json()
                if resp.status_code == 204:
                    return None
                if resp.status_code == 404:
                    raise RuntimeError(f"HTTP 404 em {url}")
                if resp.status_code == 429 or resp.status_code >= 500:
                    last_err = RuntimeError(f"HTTP {resp.status_code} em {url}")
                    logger.warning(
                        "Tentativa %d/%d falhou com HTTP %d para %s.", attempt, self.max_retries, resp.status_code, url
                    )
                    time.sleep(2**attempt)
                    continue
                resp.raise_for_status()
            except (requests.RequestException, json.JSONDecodeError) as exc:
                last_err = exc
                logger.warning("Tentativa %d/%d falhou (%s) para %s.", attempt, self.max_retries, exc, url)
                time.sleep(2**attempt)

        raise last_err or RuntimeError(f"Falha ao consultar {url} após {self.max_retries} tentativas")

    def _extract_paginado(self, endpoint: str, ibge6: str, session: requests.Session) -> list[dict[str, Any]]:
        acumulado: list[dict[str, Any]] = []
        anterior: str | None = None
        for _ in range(MAXIMO_PAGINAS):
            corpo = self._request(
                endpoint,
                {"codigo_municipio": ibge6, "limit": TAMANHO_PAGINA, "offset": len(acumulado)},
                session,
            )
            registros = _extrair_registros(corpo)
            assinatura = json.dumps(registros, sort_keys=True, default=str)
            # Protege contra APIs que ignoram `offset` e repetem a mesma página.
            if not registros or assinatura == anterior:
                return acumulado
            anterior = assinatura
            acumulado.extend(registros)
            if len(registros) < TAMANHO_PAGINA:
                return acumulado
        raise RuntimeError(f"Limite de {MAXIMO_PAGINAS} páginas atingido em {endpoint}: extração truncada")

    def extract(self, portal_slug: str, cod_ibge: int | str) -> dict[str, list[dict[str, Any]]]:
        """Extrai estoque e estabelecimentos do município.

        Retorna sempre a chave `coletas` (uma linha). As chaves `estoque_medicamentos` e
        `estabelecimentos_cnes` só existem quando a coleta do estoque foi bem-sucedida;
        em falha, a coleta é registrada como `falha` (nunca como apagão).
        """
        data_coleta = datetime.now(timezone.utc).isoformat()
        session = requests.Session()

        def coleta_com_falha(ibge6: str | None, erro: Exception | str) -> dict[str, list[dict[str, Any]]]:
            return {
                "coletas": [
                    {
                        "portal_slug": portal_slug,
                        "codigo_ibge6": ibge6,
                        "status_coleta": "falha",
                        "total_registros_estoque": "0",
                        "total_registros_cnes": "0",
                        "mensagem_erro": str(erro),
                        "data_coleta": data_coleta,
                    }
                ]
            }

        ibge6: str | None = None
        try:
            ibge6 = codigo_ibge6(cod_ibge)
            registros_estoque = self._extract_paginado(ENDPOINT_ESTOQUE, ibge6, session)
        except Exception as exc:
            logger.warning("Falha ao extrair estoque da farmácia SUS (%s): %s", portal_slug, exc)
            return coleta_com_falha(ibge6, exc)

        estoque = [
            linha
            for linha in (_mapear_estoque(portal_slug, data_coleta, r) for r in registros_estoque)
            if linha is not None
        ]
        if registros_estoque and not estoque:
            erro = f"{len(registros_estoque)} registros retornados, nenhum mapeado (possível mudança de campos)"
            logger.warning("Farmácia SUS (%s): %s", portal_slug, erro)
            return coleta_com_falha(ibge6, erro)

        try:
            registros_cnes: list[dict[str, Any]] | None = self._extract_paginado(
                ENDPOINT_ESTABELECIMENTOS_CNES, ibge6, session
            )
        except Exception as exc:
            logger.warning(
                "Falha ao extrair CNES (%s): %s. Estabelecimentos anteriores serão preservados.", portal_slug, exc
            )
            registros_cnes = None

        resultado: dict[str, list[dict[str, Any]]] = {}
        if registros_cnes is not None:
            # CNES é a fonte primária: o estoque vem primeiro e o CNES sobrescreve apenas valores não nulos,
            # logo o estoque só preenche (inclusive latitude/longitude) quando o CNES vier nulo.
            cnes_por_codigo: dict[str, dict[str, Any]] = {}
            # O CNES repete o estabelecimento por competência (nu_comp, AAAAMM): a mais recente prevalece.
            cnes_por_competencia = sorted(registros_cnes, key=_competencia_cnes)
            for registro in [*registros_estoque, *cnes_por_competencia]:
                linha = _mapear_estabelecimento(portal_slug, data_coleta, registro)
                if linha is None:
                    continue
                chave = linha["codigo_cnes"].lstrip("0") or "0"
                anterior = cnes_por_codigo.get(chave, {})
                cnes_por_codigo[chave] = {**anterior, **{k: v for k, v in linha.items() if v is not None}}
            resultado["estabelecimentos_cnes"] = list(cnes_por_codigo.values())
        resultado["estoque_medicamentos"] = estoque
        resultado["coletas"] = [
            {
                "portal_slug": portal_slug,
                "codigo_ibge6": ibge6,
                "status_coleta": "sucesso",
                "total_registros_estoque": str(len(estoque)),
                "total_registros_cnes": str(len(resultado.get("estabelecimentos_cnes", []))),
                "mensagem_erro": None,
                "data_coleta": data_coleta,
            }
        ]
        return resultado
