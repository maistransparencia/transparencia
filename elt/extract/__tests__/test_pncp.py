from unittest.mock import MagicMock, patch

from elt.extract.pncp import (
    DEFAULT_CNPJ_PORCIUNCULA,
    PncpExtractor,
)
from elt.load.pncp import (
    ensure_pncp_tables,
    load_pncp_compras,
    load_pncp_itens,
    load_pncp_itens_resultados,
)


def test_pncp_extractor_fetch_publicacoes():
    extractor = PncpExtractor(min_interval_seconds=0)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"totalRegistros": 1, "data": [{"numeroCompra": "001/2024"}]}

    with patch("requests.get", return_value=mock_resp) as mock_get:
        res = extractor.fetch_publicacoes("20240101", "20240131", DEFAULT_CNPJ_PORCIUNCULA)
        assert res is not None
        assert res["totalRegistros"] == 1
        assert mock_get.call_count == 1
        call_kwargs = mock_get.call_args.kwargs
        assert call_kwargs["params"]["dataInicial"] == "20240101"
        assert call_kwargs["params"]["cnpj"] == DEFAULT_CNPJ_PORCIUNCULA


def test_pncp_extractor_fetch_compra_and_itens():
    extractor = PncpExtractor(min_interval_seconds=0)

    mock_resp_compra = MagicMock()
    mock_resp_compra.status_code = 200
    mock_resp_compra.json.return_value = {"numeroControlePNCP": "123", "objetoCompra": "Objeto completo"}

    mock_resp_itens = MagicMock()
    mock_resp_itens.status_code = 200
    mock_resp_itens.json.return_value = [{"numeroItem": 1, "descricaoItem": "Item A"}]

    with patch("requests.get", side_effect=[mock_resp_compra, mock_resp_itens]):
        compra = extractor.fetch_compra(DEFAULT_CNPJ_PORCIUNCULA, 2024, 1)
        assert compra["objetoCompra"] == "Objeto completo"

        itens = extractor.fetch_itens(DEFAULT_CNPJ_PORCIUNCULA, 2024, 1)
        assert len(itens) == 1
        assert itens[0]["descricaoItem"] == "Item A"


def test_pncp_normalization():
    compra_raw = {
        "numeroControlePNCP": "28920999000106-1-000001/2024",
        "cnpjOrgao": "28920999000106",
        "anoCompra": 2024,
        "sequencialCompra": 1,
        "numeroCompra": "001/2024",
        "objetoCompra": "Aquisição integral de medicamentos",
        "linkSistemaOrigem": "https://pncp.gov.br/app/editais/1",
        "valorTotalEstimado": 150000.5,
    }
    norm_compra = PncpExtractor.normalize_compra(compra_raw)
    assert norm_compra["numero_controle_pncp"] == "28920999000106-1-000001/2024"
    assert norm_compra["objeto_compra"] == "Aquisição integral de medicamentos"
    assert norm_compra["link_sistema_origem"] == "https://pncp.gov.br/app/editais/1"

    item_raw = {
        "numeroControlePNCP": "28920999000106-1-000001/2024",
        "numeroItem": 1,
        "descricaoItem": "Dipirona 500mg",
        "quantidade": 1000,
        "unidadeMedida": "cx",
        "valorUnitarioEstimado": 10.5,
        "valorTotalEstimado": 10500.0,
    }
    norm_item = PncpExtractor.normalize_item(item_raw)
    assert norm_item["numero_item"] == "1"
    assert norm_item["descricao"] == "Dipirona 500mg"

    res_raw = {
        "numeroControlePNCP": "28920999000106-1-000001/2024",
        "numeroItem": 1,
        "sequencialResultado": 1,
        "fornecedor_nome": "Farma Distribuidora LTDA",
        "fornecedor_cnpj_cpf": "11.222.333/0001-44",
        "valorUnitarioHomologado": 9.5,
        "valorTotalHomologado": 9500.0,
        "percentualDesconto": 9.52,
    }
    norm_res = PncpExtractor.normalize_item_resultado(res_raw)
    assert norm_res["fornecedor_nome"] == "Farma Distribuidora LTDA"
    assert norm_res["valor_total_homologado"] == "9500.0"


def test_pncp_load_into_db(engine):
    ensure_pncp_tables(engine)

    compra = PncpExtractor.normalize_compra(
        {
            "numeroControlePNCP": "28920999000106-1-000001/2024",
            "anoCompra": 2024,
            "numeroCompra": "001/2024",
            "objetoCompra": "Objeto completo PNCP",
            "linkSistemaOrigem": "https://pncp.gov.br/app/editais/test",
        }
    )
    count_compra = load_pncp_compras(engine, [compra])
    assert count_compra == 1

    item = PncpExtractor.normalize_item(
        {
            "numeroControlePNCP": "28920999000106-1-000001/2024",
            "anoCompra": 2024,
            "numeroCompra": "001/2024",
            "numeroItem": 1,
            "descricaoItem": "Item Teste",
            "quantidade": 10,
            "valorTotalEstimado": 100.0,
        }
    )
    count_item = load_pncp_itens(engine, [item])
    assert count_item == 1

    resultado = PncpExtractor.normalize_item_resultado(
        {
            "numeroControlePNCP": "28920999000106-1-000001/2024",
            "anoCompra": 2024,
            "numeroItem": 1,
            "sequencialResultado": 1,
            "fornecedor_nome": "Vencedor Teste",
            "valorTotalHomologado": 90.0,
            "percentualDesconto": 10.0,
        }
    )
    count_res = load_pncp_itens_resultados(engine, [resultado])
    assert count_res == 1
