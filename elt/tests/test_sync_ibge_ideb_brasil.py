"""Testes do sincronizador da média nacional do IDEB (API do IBGE, pesquisa 40)."""

import csv
from unittest.mock import MagicMock, patch

import pytest
import requests

from elt.scripts.sync_ibge_ideb_brasil import (
    IbgeIdebError,
    montar_linhas,
    serie_do_indicador,
    sync_ibge_ideb_brasil,
)


def _resposta(indicador: int, serie: dict[str, str]) -> list[dict]:
    return [{"id": indicador, "res": [{"localidade": "0", "res": serie}]}]


def _http(corpo, status: int = 200) -> MagicMock:
    resp = MagicMock(status_code=status)
    resp.json.return_value = corpo
    return resp


class TestSerieDoIndicador:
    def test_devolve_notas_por_ano_e_ignora_ano_sem_nota(self):
        corpo = _resposta(78187, {"2005": "-", "2021": "5.5", "2025": "6.1"})
        assert serie_do_indicador(corpo, 78187) == {2021: 5.5, 2025: 6.1}

    @pytest.mark.parametrize("corpo", [[], [{"id": 1}], {"id": 78187}, None])
    def test_formato_inesperado_levanta_erro(self, corpo):
        with pytest.raises(IbgeIdebError):
            serie_do_indicador(corpo, 78187)


class TestMontarLinhas:
    def test_filtra_pelo_primeiro_ano_e_ordena_por_etapa_e_ano(self):
        series = {"anos_iniciais": {2019: 5.7, 2023: 5.7, 2021: 5.5}, "anos_finais": {2021: 4.9}}
        assert montar_linhas(series, 2021) == [
            {"ano": 2021, "rede": "publica", "etapa_ensino": "anos_finais", "nota_ideb": 4.9},
            {"ano": 2021, "rede": "publica", "etapa_ensino": "anos_iniciais", "nota_ideb": 5.5},
            {"ano": 2023, "rede": "publica", "etapa_ensino": "anos_iniciais", "nota_ideb": 5.7},
        ]


class TestSync:
    def _respostas(self):
        return {
            "78187": _http(_resposta(78187, {"2021": "5.5", "2025": "6.1"})),
            "78192": _http(_resposta(78192, {"2021": "4.9", "2025": "5.0"})),
        }

    def test_grava_o_csv_com_as_duas_etapas(self, tmp_path):
        respostas = self._respostas()
        with patch(
            "elt.scripts.sync_ibge_ideb_brasil.requests.get", side_effect=lambda url, **_: respostas[url.split("/")[-3]]
        ):
            total = sync_ibge_ideb_brasil(tmp_path / "seed.csv", 2021)
        assert total == 4
        with (tmp_path / "seed.csv").open(encoding="utf-8") as arquivo:
            linhas = list(csv.DictReader(arquivo))
        assert {(linha["etapa_ensino"], linha["ano"], linha["nota_ideb"]) for linha in linhas} == {
            ("anos_iniciais", "2021", "5.5"),
            ("anos_iniciais", "2025", "6.1"),
            ("anos_finais", "2021", "4.9"),
            ("anos_finais", "2025", "5.0"),
        }

    def test_erro_http_nao_regrava_o_seed(self, tmp_path):
        destino = tmp_path / "seed.csv"
        destino.write_text("antigo", encoding="utf-8")
        with patch("elt.scripts.sync_ibge_ideb_brasil.requests.get", return_value=_http([], status=503)):
            with pytest.raises(IbgeIdebError, match="HTTP 503"):
                sync_ibge_ideb_brasil(destino, 2021)
        assert destino.read_text(encoding="utf-8") == "antigo"

    def test_api_indisponivel_levanta_erro(self, tmp_path):
        with patch("elt.scripts.sync_ibge_ideb_brasil.requests.get", side_effect=requests.ConnectionError("fora")):
            with pytest.raises(IbgeIdebError, match="indisponível"):
                sync_ibge_ideb_brasil(tmp_path / "seed.csv", 2021)

    def test_sem_nota_a_partir_do_ano_levanta_erro(self, tmp_path):
        respostas = {
            "78187": _http(_resposta(78187, {"2019": "5.7"})),
            "78192": _http(_resposta(78192, {"2019": "4.6"})),
        }
        with patch(
            "elt.scripts.sync_ibge_ideb_brasil.requests.get", side_effect=lambda url, **_: respostas[url.split("/")[-3]]
        ):
            with pytest.raises(IbgeIdebError, match="nenhuma nota"):
                sync_ibge_ideb_brasil(tmp_path / "seed.csv", 2021)
