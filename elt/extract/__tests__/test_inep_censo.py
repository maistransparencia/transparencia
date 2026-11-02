import io
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from elt.core.config import PortalConfig
from elt.extract.inep_censo import (
    InepCensoError,
    InepCensoExtractor,
    MatriculasMunicipio,
    agregar_matriculas,
    extract_and_load_inep_censo,
    ler_matriculas_do_zip,
)

CABECALHO = "NU_ANO_CENSO;CO_MUNICIPIO;NO_ENTIDADE;TP_DEPENDENCIA;TP_SITUACAO_FUNCIONAMENTO;QT_MAT_BAS"


def _csv(*linhas: str) -> str:
    return "\n".join([CABECALHO, *linhas]) + "\n"


def _portal():
    return PortalConfig.load("porciuncula_prefeitura")


def test_soma_so_escolas_municipais_em_atividade_do_municipio():
    cod = _portal().cod_ibge
    texto = _csv(
        f"2024;{cod};ESCOLA A;3;1;1000",
        f"2024;{cod};ESCOLA B;3;1;1001",
        f"2024;{cod};ESCOLA PARALISADA;3;2;500",
        f"2024;{cod};ESCOLA ESTADUAL;2;1;700",
        f"2024;{cod};ESCOLA PRIVADA;4;1;300",
        f"2024;{cod + 1};OUTRO MUNICIPIO;3;1;900",
    )
    assert agregar_matriculas(io.StringIO(texto), cod) == MatriculasMunicipio(2001, 2)


def test_matricula_vazia_conta_zero_mas_a_escola_conta():
    cod = _portal().cod_ibge
    resultado = agregar_matriculas(io.StringIO(_csv(f"2024;{cod};A;3;1;", f"2024;{cod};B;3;1;10")), cod)
    assert resultado == MatriculasMunicipio(10, 2)


def test_municipio_sem_escola_municipal_nao_gera_registro():
    cod = _portal().cod_ibge
    assert agregar_matriculas(io.StringIO(_csv(f"2024;{cod};A;2;1;50")), cod) is None


def test_csv_sem_coluna_obrigatoria_falha():
    with pytest.raises(InepCensoError, match="QT_MAT_BAS"):
        agregar_matriculas(io.StringIO("CO_MUNICIPIO;TP_DEPENDENCIA;TP_SITUACAO_FUNCIONAMENTO\n1;3;1\n"), 1)


def test_le_csv_latin1_dentro_do_zip(tmp_path: Path):
    cod = _portal().cod_ibge
    caminho = tmp_path / "censo.zip"
    conteudo = _csv(f"2024;{cod};ESCOLA JOÃO D'ÁVILA;3;1;42").encode("latin1")
    with zipfile.ZipFile(caminho, "w") as arquivo:
        arquivo.writestr("microdados_censo_escolar_2024/dados/microdados_ed_basica_2024.csv", conteudo)
    assert ler_matriculas_do_zip(caminho, 2024, cod) == MatriculasMunicipio(42, 1)


def test_zip_sem_csv_esperado_falha(tmp_path: Path):
    caminho = tmp_path / "censo.zip"
    with zipfile.ZipFile(caminho, "w") as arquivo:
        arquivo.writestr("outro.csv", "x")
    with pytest.raises(InepCensoError, match="não encontrado"):
        ler_matriculas_do_zip(caminho, 2024, 1)


def _resposta(status: int):
    resp = MagicMock()
    resp.status_code = status
    resp.iter_content.return_value = [b"x"]
    resp.__enter__.return_value = resp
    return resp


def test_404_ignora_o_ano_e_demais_anos_seguem():
    extrator = InepCensoExtractor()
    with patch("elt.extract.inep_censo.requests.get", return_value=_resposta(404)):
        assert extrator.matriculas_do_ano(2099, 1) is None


def test_http_inesperado_falha():
    with patch("elt.extract.inep_censo.requests.get", return_value=_resposta(500)):
        with pytest.raises(InepCensoError, match="HTTP 500"):
            InepCensoExtractor().matriculas_do_ano(2024, 1)


def test_nenhum_ano_com_dado_levanta_erro_e_nao_grava():
    db = MagicMock()
    with patch.object(InepCensoExtractor, "matriculas_do_ano", return_value=None):
        with pytest.raises(InepCensoError, match="sem nenhum dado"):
            extract_and_load_inep_censo(_portal(), [2024, 2025], db=db)
    db.assert_not_called()


def test_grava_apenas_anos_com_dado():
    portal = _portal()
    por_ano = {2024: MatriculasMunicipio(2001, 5), 2025: None}
    extrator = InepCensoExtractor()
    with patch.object(InepCensoExtractor, "matriculas_do_ano", side_effect=lambda ano, _: por_ano[ano]):
        linhas = extrator.extrair_portal(portal, [2024, 2025])
    assert [(item["portal_slug"], item["ano"], item["matriculas_educacao_basica"]) for item in linhas] == [
        (portal.slug, 2024, 2001)
    ]


def test_bundle_tls_inclui_o_intermediario_do_inep_e_mantem_verificacao():
    from elt.extract.inep_censo import CERTIFICADO_INTERMEDIARIO, InepCensoExtractor

    bundle = Path(InepCensoExtractor()._bundle_tls).read_text(encoding="ascii")
    assert CERTIFICADO_INTERMEDIARIO.read_text(encoding="ascii").strip() in bundle
    assert bundle.count("BEGIN CERTIFICATE") > 100


def test_qt_mat_bas_nao_numerico_vira_erro_controlado():
    from elt.extract.inep_censo import InepCensoError, agregar_matriculas

    csv_texto = "CO_MUNICIPIO;TP_DEPENDENCIA;TP_SITUACAO_FUNCIONAMENTO;QT_MAT_BAS\n3304102;3;1;NA\n"
    with pytest.raises(InepCensoError):
        agregar_matriculas(io.StringIO(csv_texto), 3304102)
