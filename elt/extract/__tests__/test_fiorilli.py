import socket
from datetime import date
from unittest.mock import MagicMock, patch

import pytest
from elt.core.config import PortalConfig
from elt.extract.base import EndpointConfig
from elt.extract.fiorilli.api_endpoints import (
    ENDPOINT_NAMES,
    get_endpoint_configs,
    post_process_contratos,
    post_process_despesas_extra_orcamentaria,
    post_process_despesas_gerais,
    post_process_despesas_por_exigibilidade,
    post_process_despesas_restos_pagar,
    post_process_diarias,
    post_process_emendas_cad,
    post_process_pessoal,
    post_process_receita_detalhes,
    post_process_receita_orcamentaria,
    post_process_transferencias,
)
from elt.extract.fiorilli.extractor import (
    DespesasExtractor,
    EmendasExtractor,
    FiorilliExtractor,
    LicitacoesExtractor,
    PessoalExtractor,
    ReceitasExtractor,
    SigcorpExtractor,
    TransferenciasExtractor,
)
from elt.extract.porciuncula_prefeitura.extractor import PorciunculaExtractor


@pytest.fixture(autouse=True)
def block_external_network(monkeypatch):
    """Garante isolamento estrito contra requisições externas à rede pública (Regras 5 e 15)."""
    original_connect = socket.socket.connect

    def _guarded_connect(self, address):
        if isinstance(address, tuple) and address:
            host = address[0]
            if host in ("127.0.0.1", "localhost", "::1"):
                return original_connect(self, address)
        elif isinstance(address, str):
            return original_connect(self, address)
        raise RuntimeError(f"Tentativa de requisição de rede externa para {address} bloqueada!")

    monkeypatch.setattr(socket.socket, "connect", _guarded_connect)


def test_network_blocker_triggers_on_external_attempt():
    """Valida que o interceptador de rede falha se houver tentativa de rede externa."""
    with socket.socket() as s:
        with pytest.raises(RuntimeError, match="bloqueada"):
            s.connect(("8.8.8.8", 80))


def test_fiorilli_extractor_dynamic_parametrization():
    """Valida que FiorilliExtractor constrói URLs e parâmetros com host e slug específicos."""
    extractor = FiorilliExtractor(
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
        base_path="/Transparencia/VersaoJson/Despesas/",
        listagem="DespesasGerais",
        table="despesas_gerais",
        extra={"Filtro": "Ativo"},
    )
    url = extractor.build_url(empresa_id="1", year=2024)

    assert "https://transparencia.natividade.rj.gov.br/Transparencia/VersaoJson/Despesas/?" in url
    assert "ConectarExercicio=2024" in url
    assert "Empresa=1" in url
    assert "Listagem=DespesasGerais" in url
    assert "Filtro=Ativo" in url


def test_fiorilli_extractor_validation_errors():
    """Valida que parâmetros obrigatórios vazios disparam ValueError precocemente."""
    with pytest.raises(ValueError, match="base_url é obrigatório"):
        FiorilliExtractor(base_url="", portal_slug="natividade_prefeitura")

    with pytest.raises(ValueError, match="base_url é obrigatório"):
        FiorilliExtractor(base_url="   ", portal_slug="natividade_prefeitura")

    with pytest.raises(ValueError, match="portal_slug é obrigatório"):
        FiorilliExtractor(base_url="https://transparencia.natividade.rj.gov.br", portal_slug="")

    with pytest.raises(ValueError, match="base_path é obrigatório"):
        FiorilliExtractor(
            base_url="https://transparencia.natividade.rj.gov.br",
            portal_slug="natividade_prefeitura",
            base_path="",
        )

    with pytest.raises(ValueError, match="listagem é obrigatório"):
        FiorilliExtractor(
            base_url="https://transparencia.natividade.rj.gov.br",
            portal_slug="natividade_prefeitura",
            listagem="",
        )


def test_portal_config_declarative_loading():
    """Valida carregamento tipado de Natividade, Bom Jesus do Itabapoana e Porciúncula."""
    # Natividade
    cfg_nat = PortalConfig.load("natividade_prefeitura")
    assert cfg_nat.slug == "natividade_prefeitura"
    assert cfg_nat.cod_ibge == 3303401
    assert cfg_nat.base_host == "https://transparencia.natividade.rj.gov.br"
    assert cfg_nat.empresa_padrao == "1"
    assert cfg_nat.provider == "fiorilli"
    assert cfg_nat.rpps is not None
    assert cfg_nat.rpps.get("sigla") == "IPAMN"
    orgaos_nat = cfg_nat.load_orgaos()
    assert "1" in orgaos_nat
    assert "NATIVIDADE" in orgaos_nat["1"]

    # Bom Jesus do Itabapoana
    cfg_bj = PortalConfig.load("bom_jesus_itabapoana_prefeitura")
    assert cfg_bj.slug == "bom_jesus_itabapoana_prefeitura"
    assert cfg_bj.cod_ibge == 3300605
    assert cfg_bj.base_host == "https://transparencia.bomjesus.rj.gov.br"
    assert cfg_bj.empresa_padrao == "1"
    assert cfg_bj.provider == "fiorilli"
    assert cfg_bj.rpps is not None
    assert cfg_bj.rpps.get("sigla") == "FUNPREV"
    orgaos_bj = cfg_bj.load_orgaos()
    assert "1" in orgaos_bj
    assert "BOM JESUS DO ITABAPOANA" in orgaos_bj["1"]

    # Porciúncula
    cfg_porc = PortalConfig.load("porciuncula_prefeitura")
    assert cfg_porc.slug == "porciuncula_prefeitura"
    assert cfg_porc.cod_ibge == 3304102
    assert cfg_porc.provider == "fiorilli"

    # Inexistente
    with pytest.raises(FileNotFoundError):
        PortalConfig.load("portal_fantasma_inexistente")


def test_pessoal_extractor_monthly_pagination():
    """Valida extração mensal de folha iterando pelos meses 01 a 12."""
    extractor = PessoalExtractor(
        base_path="/Transparencia/VersaoJson/Pessoal/",
        listagem="Servidores",
        table="pessoal",
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )

    call_urls = []

    def mock_fetch(url):
        call_urls.append(url)
        return [{"matricula": "100", "mes": url[-2:]}]

    with patch("elt.extract.base.fetch", side_effect=mock_fetch):
        # Ano passado para garantir loop completo até o mês 12
        rows = extractor.extract(empresa_id="1", year=2023)

    assert len(rows) == 12
    assert len(call_urls) == 12
    assert "MesFinalPeriodo=01" in call_urls[0]
    assert "MesFinalPeriodo=12" in call_urls[-1]


def test_pessoal_extractor_empty_month_one_halts_early():
    """Valida que quando o mês 1 não possui registros a extração interrompe imediatamente."""
    extractor = PessoalExtractor(
        base_path="/Transparencia/VersaoJson/Pessoal/",
        listagem="Servidores",
        table="pessoal",
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )

    mock_fetch = MagicMock(return_value=[])
    with patch("elt.extract.base.fetch", mock_fetch):
        rows = extractor.extract(empresa_id="99", year=2024)

    assert rows == []
    assert mock_fetch.call_count == 1


def test_despesas_extractor_exigibilidade_params():
    """Valida ajuste de parâmetros para DespesasporExigibilidade."""
    extractor = DespesasExtractor(
        base_path="/Transparencia/VersaoJson/Despesas/",
        listagem="DespesasporExigibilidade",
        table="despesas_por_exigibilidade_1",
        base_url="https://transparencia.bomjesus.rj.gov.br",
        portal_slug="bom_jesus_itabapoana_prefeitura",
        extra={"strTipoLista": "1"},
    )
    params = extractor.get_params(empresa_id="1", year=2024)

    assert params["DiaInicioPeriodo"] == "01.01.2024"
    assert params["DiaFinalPeriodo"] == "31.12.2024"
    assert "MesInicialPeriodo" not in params
    assert "MesFinalPeriodo" not in params
    assert "Ano" not in params
    assert params["strTipoLista"] == "1"


def test_receitas_extractor_year_guard():
    """Valida que ReceitasExtractor rejeita anos anteriores ao corrente por bug conhecido da API Fiorilli."""
    extractor = ReceitasExtractor(
        base_path="/Transparencia/VersaoJson/Receitas/",
        listagem="ReceitaOrcamentaria",
        table="receita_orcamentaria",
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )

    with pytest.raises(ValueError, match="aceita apenas o ano atual"):
        extractor.extract(empresa_id="1", year=2020)

    current_year = date.today().year
    with patch("elt.extract.base.fetch", return_value=[{"codigo": "123"}]):
        rows = extractor.extract(empresa_id="1", year=current_year)
    assert len(rows) == 1


def test_emendas_extractor_params():
    """Valida que EmendasExtractor customiza parâmetros para listagens específicas."""
    extractor = EmendasExtractor(
        base_path="/Transparencia/VersaoJson/Transferencias/",
        listagem="EmendasImpositivasArt166A",
        table="emendas_impositivas",
        base_url="https://transparencia.bomjesus.rj.gov.br",
        portal_slug="bom_jesus_itabapoana_prefeitura",
    )
    params = extractor.get_params(empresa_id="1", year=2024)
    assert params["ConectarExercicio"] == "2024"
    assert params["Listagem"] == "EmendasImpositivasArt166A"
    assert params["Empresa"] == "1"
    assert params["MostraDadosConsolidado"] == "False"


def test_post_processors():
    """Valida sanitização e normalização em todas as funções post_process."""
    # Contratos
    raw_contrato = {
        "codigo": "10/2024",
        "proclic": "05/2024",
        "valcon": "50000.00",
        "vigeni": "01/01/2024",
        "vigenf": "31/12/2024",
    }
    processed_contrato = post_process_contratos(raw_contrato)
    assert processed_contrato["numero"] == "10/2024"
    assert processed_contrato["licitacao_numero"] == "05"
    assert processed_contrato["valor"] == "50000.00"

    # Pessoal
    raw_pessoal = {"registro": "9999"}
    processed_pessoal = post_process_pessoal(raw_pessoal)
    assert processed_pessoal["matricula"] == "9999"

    # Despesas Gerais
    raw_despesa = {"pkemp": "EMP123"}
    processed_despesa = post_process_despesas_gerais(raw_despesa)
    assert processed_despesa["numero"] == "EMP123"

    # Despesas Restos a Pagar
    raw_rp = {"codigo": "RP123"}
    processed_rp = post_process_despesas_restos_pagar(raw_rp)
    assert processed_rp["numero"] == "RP123"

    # Despesas Extraorçamentária
    raw_extra = {"numeroguia": "GUIA456"}
    processed_extra = post_process_despesas_extra_orcamentaria(raw_extra)
    assert processed_extra["numero"] == "GUIA456"

    # Diárias
    raw_diaria = {"ordempagamento": "OP789"}
    processed_diaria = post_process_diarias(raw_diaria)
    assert processed_diaria["numero"] == "OP789"

    # Emendas CAD
    raw_emenda = {"pk_ep_emenda": "EME10"}
    processed_emenda = post_process_emendas_cad(raw_emenda)
    assert processed_emenda["numero"] == "EME10"

    # Receita Detalhes
    raw_rec_det = {"nlanc": "LAN10"}
    processed_rec_det = post_process_receita_detalhes(raw_rec_det)
    assert processed_rec_det["codigo"] == "LAN10"

    # Receita Orçamentária (normalização de fonte_stn)
    raw_rec_orc = {"fonte_stn": "15000000"}
    processed_rec_orc = post_process_receita_orcamentaria(raw_rec_orc)
    assert processed_rec_orc["fontestn"] == "15000000"

    # Transferências
    raw_transf = {"mes": "05", "cnpjrecebedora": "28920999000106"}
    processed_transf = post_process_transferencias(raw_transf)
    assert processed_transf["codigo"] == "05-28920999000106"

    # Exigibilidade
    raw_exig = {"tipolista": "1", "empenho": "123"}
    processed_exig = post_process_despesas_por_exigibilidade(raw_exig)
    assert processed_exig["tipo"] == "1"
    assert processed_exig["empenho"] == "123"


def test_porciuncula_backward_compatibility():
    """Valida compatibilidade reversa total com PorciunculaExtractor."""
    assert issubclass(PorciunculaExtractor, FiorilliExtractor)
    assert issubclass(PorciunculaExtractor, SigcorpExtractor)

    extractor = PorciunculaExtractor()
    assert extractor.portal_slug == "porciuncula_prefeitura"
    assert extractor.cod_ibge == 3304102

    params = extractor.get_params(empresa_id="7", year=2024)
    assert params["ConectarExercicio"] == "2024"
    assert params["Empresa"] == "7"
    assert params["Listagem"] == "DespesasGerais"


def test_get_endpoint_configs_factory():
    """Valida que get_endpoint_configs retorna os 20 endpoints com base_url e classes corretas."""
    configs = get_endpoint_configs(
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )
    assert len(configs) == 20
    for cfg in configs:
        assert isinstance(cfg, EndpointConfig)
        assert cfg.base_url == "https://transparencia.natividade.rj.gov.br"
        assert issubclass(cfg.extractor_cls, FiorilliExtractor)

    table_names = {cfg.table for cfg in configs}
    assert "despesas_gerais" in table_names
    assert "despesas_por_orgao" in table_names
    assert "receita_orcamentaria" in table_names
    assert "licitacoes" in table_names
    assert "contratos" in table_names
    assert "pessoal" in table_names


def test_municipal_endpoints_modules():
    """Valida módulos específicos de endpoints de cada município."""
    from elt.extract.bom_jesus_itabapoana_prefeitura.api_endpoints import (
        ENDPOINT_CONFIGS as BJ_CONFIGS,
    )
    from elt.extract.natividade_prefeitura.api_endpoints import (
        ENDPOINT_CONFIGS as NAT_CONFIGS,
    )
    from elt.extract.porciuncula_prefeitura.api_endpoints import (
        ENDPOINT_CONFIGS as PORC_CONFIGS,
    )

    assert len(NAT_CONFIGS) == 20
    assert NAT_CONFIGS[0].base_url == "https://transparencia.natividade.rj.gov.br"

    assert len(BJ_CONFIGS) == 20
    assert BJ_CONFIGS[0].base_url == "https://transparencia.bomjesus.rj.gov.br"

    assert len(PORC_CONFIGS) == 20
    assert PORC_CONFIGS[0].base_url == "https://transparencia.porciuncula.rj.gov.br"


def test_licitacoes_and_transferencias_extractors():
    """Valida subclasses diretas e lista de nomes de endpoints."""
    lic = LicitacoesExtractor(
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )
    assert isinstance(lic, FiorilliExtractor)
    assert isinstance(lic, SigcorpExtractor)

    transf = TransferenciasExtractor(
        base_url="https://transparencia.bomjesus.rj.gov.br",
        portal_slug="bom_jesus_itabapoana_prefeitura",
    )
    assert isinstance(transf, FiorilliExtractor)
    assert isinstance(transf, SigcorpExtractor)
    assert "DespesasGerais" in ENDPOINT_NAMES


def test_extractors_with_mock_fiorilli_fetch(mock_fiorilli_fetch, fiorilli_synthetic_payload):
    """Valida execução do método extract() contra a fixture sintética mock_fiorilli_fetch."""
    desp = DespesasExtractor(
        base_path="/Transparencia/VersaoJson/Despesas/",
        listagem="DespesasPorOrgao",
        table="despesas_por_orgao",
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )
    rows_desp = desp.extract(empresa_id="1", year=2024)
    assert len(rows_desp) == len(fiorilli_synthetic_payload["DespesasPorOrgao"])
    assert rows_desp[0]["codigo"] == "01"

    lic = LicitacoesExtractor(
        base_path="/Transparencia/VersaoJson/LicitacoesEContratos/",
        listagem="Licitacoes",
        table="licitacoes",
        base_url="https://transparencia.bomjesus.rj.gov.br",
        portal_slug="bom_jesus_itabapoana_prefeitura",
    )
    rows_lic = lic.extract(empresa_id="1", year=2024)
    assert len(rows_lic) == len(fiorilli_synthetic_payload["Licitacoes"])
    assert rows_lic[0]["numero"] == "001/2024"

    emendas = EmendasExtractor(
        base_path="/Transparencia/VersaoJson/Transferencias/",
        listagem="EmendasImpositivasArt166A",
        table="emendas_impositivas",
        base_url="https://transparencia.natividade.rj.gov.br",
        portal_slug="natividade_prefeitura",
    )
    rows_emendas = emendas.extract(empresa_id="1", year=2024)
    assert len(rows_emendas) == len(fiorilli_synthetic_payload["EmendasImpositivasArt166A"])

    transf = TransferenciasExtractor(
        base_path="/Transparencia/VersaoJson/Transferencias/",
        listagem="Transf",
        table="transferencias",
        base_url="https://transparencia.bomjesus.rj.gov.br",
        portal_slug="bom_jesus_itabapoana_prefeitura",
    )
    rows_transf = transf.extract(empresa_id="1", year=2024)
    assert len(rows_transf) == len(fiorilli_synthetic_payload["Transf"])


def test_extract_run_cli_with_fiorilli_endpoint(tmp_path, monkeypatch):
    """Valida execução da CLI elt.extract.run.main() com endpoint municipal Fiorilli."""
    from elt.extract import run as extract_run

    fake_payload = [{"ano": 2024, "empresa": "1", "codigo": "01", "empenhado": "500"}]

    def fake_fetch(url):
        return fake_payload

    monkeypatch.setattr("elt.extract.base.fetch", fake_fetch)
    monkeypatch.setattr(
        "sys.argv",
        [
            "run.py",
            "--portal",
            "natividade_prefeitura",
            "--only",
            "DespesasPorOrgao",
            "--years",
            "2024",
        ],
    )
    monkeypatch.chdir(tmp_path)

    extract_run.main()

    out_file = tmp_path / "data" / "raw_runs" / "natividade_prefeitura"
    assert out_file.exists()
    json_files = list(out_file.rglob("*.json"))
    assert len(json_files) >= 1
    content = json_files[0].read_text(encoding="utf-8")
    assert "empenhado" in content
