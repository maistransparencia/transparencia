from datetime import date
from typing import Any
from urllib.parse import urlencode

from elt.extract import base
from elt.extract.base import BaseExtractor


class FiorilliExtractor(BaseExtractor):
    """Extrator genérico para portais de transparência municipais baseados no sistema Fiorilli."""

    def __init__(
        self,
        base_path: str = "/Transparencia/VersaoJson/Despesas/",
        listagem: str = "DespesasGerais",
        table: str = "despesas_gerais",
        key_cols: list[str] | None = None,
        extra: dict[str, Any] | None = None,
        post_process: Any = None,
        base_url: str = "",
        portal_slug: str = "",
        cod_ibge: int | None = None,
        ano_inicial: int | None = None,
    ):
        clean_base_url = base_url.strip().rstrip("/")
        if not clean_base_url:
            raise ValueError("base_url é obrigatório e não pode ser vazio")
        if not portal_slug or not portal_slug.strip():
            raise ValueError("portal_slug é obrigatório e não pode ser vazio")
        if not base_path or not base_path.strip():
            raise ValueError("base_path é obrigatório e não pode ser vazio")
        if not listagem or not listagem.strip():
            raise ValueError("listagem é obrigatório e não pode ser vazio")

        super().__init__(
            base_path=base_path,
            listagem=listagem,
            table=table,
            key_cols=key_cols or [],
            extra=extra or {},
            post_process=post_process,
            base_url=clean_base_url,
        )
        self.portal_slug = portal_slug
        self.cod_ibge = cod_ibge
        self.ano_inicial = ano_inicial

    def get_params(self, empresa_id: str, year: int) -> dict[str, Any]:
        return {
            "ConectarExercicio": str(year),
            "Listagem": self.listagem,
            "DiaInicioPeriodo": "01",
            "MesInicialPeriodo": "01",
            "DiaFinalPeriodo": "31",
            "MesFinalPeriodo": "12",
            "Ano": str(year),
            "Empresa": str(empresa_id),
            "MostraDadosConsolidado": "False",
            **self.extra,
        }


class DespesasExtractor(FiorilliExtractor):
    def get_params(self, empresa_id: str, year: int) -> dict[str, Any]:
        params = super().get_params(empresa_id, year)
        if self.listagem == "DespesasporExigibilidade":
            params.update(
                {
                    "DiaInicioPeriodo": f"01.01.{year}",
                    "DiaFinalPeriodo": f"31.12.{year}",
                }
            )
            params.pop("MesInicialPeriodo", None)
            params.pop("MesFinalPeriodo", None)
            params.pop("Ano", None)
        return params


class ReceitasExtractor(FiorilliExtractor):
    def extract(self, empresa_id: str, year: int) -> list[dict]:
        current_year = date.today().year
        if year != current_year:
            reason = (
                f"O extractor de receitas aceita apenas o ano atual ({current_year}). "
                f"O portal de transparência municipal possui um bug estrutural na API JSON que ignora parâmetros históricos e "
                f"retorna dados incorretos (valores de {current_year} zerados) para anos anteriores. "
                f"Para carregar dados históricos anteriores a {current_year}, utilize o script de importação de CSV correspondente."
            )
            self.logger.warning(reason)
            raise ValueError(reason)
        return super().extract(empresa_id, year)


class LicitacoesExtractor(FiorilliExtractor):
    pass


class EmendasExtractor(FiorilliExtractor):
    def get_params(self, empresa_id: str, year: int) -> dict[str, Any]:
        if self.listagem in ["EmendasImpositivasArt166A", "CadEmendasImpositivas"]:
            return {
                "ConectarExercicio": str(year),
                "Listagem": self.listagem,
                "Empresa": str(empresa_id),
                "MostraDadosConsolidado": "False",
                **self.extra,
            }
        return super().get_params(empresa_id, year)


class TransferenciasExtractor(FiorilliExtractor):
    pass


class PessoalExtractor(FiorilliExtractor):
    def build_url(self, empresa_id: str, year: int, mes: str = "01") -> str:
        params = {
            "ConectarExercicio": str(year),
            "Listagem": self.listagem,
            "Empresa": str(empresa_id),
            "Ano": str(year),
            "MesFinalPeriodo": mes,
            **self.extra,
        }
        return f"{self.base_url}{self.base_path}?{urlencode(params)}"

    def extract(self, empresa_id: str, year: int) -> list[dict]:
        all_rows: list[dict] = []
        current_year = date.today().year
        for mes_int in range(1, 13):
            mes_str = f"{mes_int:02d}"
            url = self.build_url(empresa_id, year, mes=mes_str)
            self.logger.info(
                "Extraindo pessoal empresa=%s ano=%s mes=%s...",
                empresa_id,
                year,
                mes_str,
            )
            try:
                rows = base.fetch(url)
                if not rows:
                    if mes_int == 1:
                        # Entidades sem folha cadastrada não possuem dados em nenhum mês
                        break
                    if year >= current_year:
                        break
                    continue
                all_rows.extend(rows)
            except Exception as e:
                self.logger.warning(
                    "Erro ao extrair pessoal empresa=%s ano=%s mes=%s: %s",
                    empresa_id,
                    year,
                    mes_str,
                    e,
                )
                if year >= current_year:
                    break
        return all_rows


# Alias retrocompatível
SigcorpExtractor = FiorilliExtractor
