from unittest.mock import MagicMock, patch

import pytest
import requests
from elt.core.config import PortalConfig
from elt.extract.inep_censo import (
    INDICADORES_FUNDAMENTAL_MUNICIPAL,
    INDICADORES_INFANTIL_MUNICIPAL,
    InepCensoError,
    InepCensoExtractor,
    codigo_localidade,
    extract_and_load_inep_censo,
    serie_do_indicador,
    somar_series,
)

LOCALIDADE = "330410"


def _portal(cod_ibge: int = 3304102) -> PortalConfig:
    return PortalConfig(
        slug="portal_teste",
        display_name="Portal",
        uf="XX",
        portal_url="https://exemplo.test",
        base_host="exemplo.test",
        cidade_clean="EXEMPLO",
        ano_inicial=2023,
        empresa_padrao="1",
        assets={},
        cod_ibge=cod_ibge,
    )


def _resposta(indicador: int, serie: dict[str, str | None], localidade: str = LOCALIDADE) -> list[dict]:
    return [{"id": indicador, "res": [{"localidade": localidade, "res": serie, "notas": {}}]}]


def _extrator_com(serie_por_indicador) -> InepCensoExtractor:
    """Extrator cujo HTTP devolve a série (`{ano: valor}`) calculada para cada indicador."""
    extrator = InepCensoExtractor()

    def falso_get(url, timeout):
        indicador = int(url.split("/indicadores/")[1].split("/")[0])
        resp = MagicMock(status_code=200)
        resp.json.return_value = _resposta(indicador, serie_por_indicador(indicador))
        return resp

    patcher = patch("elt.extract.inep_censo.requests.get", side_effect=falso_get)
    patcher.start()
    extrator._patcher = patcher  # type: ignore[attr-defined]
    return extrator


@pytest.fixture(autouse=True)
def _parar_patches():
    yield
    patch.stopall()


def test_codigo_localidade_remove_digito_verificador():
    assert codigo_localidade(3304102) == "330410"


def test_soma_cada_etapa_por_ano_do_censo():
    infantil = [{"2024": 300, "2025": 280}, {"2024": 370, "2025": 360}]
    fundamental = [{"2024": 100, "2025": 90} for _ in range(9)]
    por_ano = somar_series(infantil, fundamental)
    assert por_ano[2024].matriculas_educacao_infantil == 670
    assert por_ano[2024].matriculas_ensino_fundamental == 900
    assert por_ano[2025].matriculas_ensino_fundamental == 810


def test_ano_ausente_em_alguma_serie_nao_entra():
    infantil = [{"2024": 1, "2025": 1}, {"2024": 1}]
    fundamental = [{"2024": 100, "2025": 90}] * 9
    assert set(somar_series(infantil, fundamental)) == {2024}


def test_serie_ignora_valor_nao_numerico():
    resposta = _resposta(77941, {"2023": "10", "2024": "-", "2025": None})
    assert serie_do_indicador(resposta, 77941, LOCALIDADE) == {"2023": 10}


@pytest.mark.parametrize("resposta", [[], {"erro": 1}, [{"id": 1, "res": []}], _resposta(77941, {}, "999999")])
def test_resposta_fora_do_formato_falha(resposta):
    with pytest.raises(InepCensoError):
        serie_do_indicador(resposta, 77941, LOCALIDADE)


def test_extrai_soma_do_fundamental_municipal_por_ano():
    extrator = _extrator_com(lambda _: {"2023": "200", "2024": "222"})
    linhas = extrator.extrair_portal(_portal(), [2023, 2024])
    assert [
        (linha["ano"], linha["matriculas_educacao_infantil"], linha["matriculas_ensino_fundamental"])
        for linha in linhas
    ] == [
        (2023, 400, 1800),
        (2024, 444, 1998),
    ]
    assert {linha["portal_slug"] for linha in linhas} == {"portal_teste"}
    assert len(INDICADORES_FUNDAMENTAL_MUNICIPAL) == 9
    assert len(INDICADORES_INFANTIL_MUNICIPAL) == 2


def test_ano_pedido_sem_dado_e_ignorado():
    extrator = _extrator_com(lambda _: {"2023": "10"})
    linhas = extrator.extrair_portal(_portal(), [2023, 2026])
    assert [linha["ano"] for linha in linhas] == [2023]


def test_nenhum_ano_com_dado_levanta_erro():
    extrator = _extrator_com(lambda _: {"2023": "10"})
    with pytest.raises(InepCensoError):
        extrator.extrair_portal(_portal(), [2030])


def test_http_inesperado_falha():
    with patch("elt.extract.inep_censo.requests.get", return_value=MagicMock(status_code=500)):
        with pytest.raises(InepCensoError, match="500"):
            InepCensoExtractor().extrair_portal(_portal(), [2024])


def test_api_indisponivel_falha_com_a_causa():
    with patch("elt.extract.inep_censo.requests.get", side_effect=requests.ConnectionError("sem rede")):
        with pytest.raises(InepCensoError, match="sem rede"):
            InepCensoExtractor().extrair_portal(_portal(), [2024])


def test_erro_nao_grava_nada():
    db = MagicMock()
    with patch("elt.extract.inep_censo.requests.get", side_effect=requests.ConnectionError("x")):
        with pytest.raises(InepCensoError):
            extract_and_load_inep_censo(_portal(), [2024], db=db, extractor=InepCensoExtractor())
    db.begin.assert_not_called()


def test_grava_apenas_anos_com_dado():
    extrator = _extrator_com(lambda _: {"2024": "10"})
    with (
        patch("elt.extract.inep_censo.ensure_inep_censo_table"),
        patch("elt.extract.inep_censo.load_inep_censo_matriculas", return_value=1) as carga,
    ):
        total = extract_and_load_inep_censo(_portal(), [2024], db=MagicMock(), extractor=extrator)
    assert total == 1
    assert [linha["ano"] for linha in carga.call_args.args[1]] == [2024]
