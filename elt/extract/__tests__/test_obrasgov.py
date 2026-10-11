"""Testes unitários para o extrator e carregador do ObrasGov.br."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from elt.extract.obrasgov import ObrasGovExtractor
from elt.load.obrasgov import (
    ensure_obrasgov_tables,
    load_obrasgov_all,
    load_obrasgov_execucoes_fisicas,
    load_obrasgov_geometrias,
    load_obrasgov_historico_paralisacoes,
    load_obrasgov_projetos,
)


def test_obrasgov_extractor_success():
    extractor = ObrasGovExtractor(min_interval_seconds=0)

    mock_geo_resp = {
        "data": [
            {
                "id_projeto_investimento": "PROJ-01",
                "id_geometria": 101,
                "cod_ibge": 3304102,
                "origem_geometria": "Par de Lat/Long",
            }
        ],
        "total_pages": 1,
    }

    mock_proj_resp = {
        "data": [
            {
                "id_projeto_investimento": "PROJ-01",
                "desc_nome": "Construção de Escola Municipal",
                "situacao": "Em Execução",
                "organizacao_resp": "Secretaria de Obras",
                "investimentos_previstos": [{"vl_investimento_previsto": 500000.0}],
                "dt_inicial_prevista": "2024-01-15",
                "dt_final_prevista": "2024-12-20",
                "pins": [
                    {
                        "pin": "POINT(-42.1 -22.1)",
                        "latitude": "-22.12345678",
                        "longitude": "-42.98765432)",
                    }
                ],
            }
        ]
    }

    mock_exec_resp = {
        "data": [
            {
                "id_projeto_investimento": "PROJ-01",
                "id_execucao_fisica": 201,
                "percentual_execucao_fisica": 45.5,
                "dt_atualizacao_execucao": "2024-06-30",
            }
        ],
        "total_pages": 1,
    }

    mock_hist_resp = {
        "data": [],
        "total_pages": 0,
    }

    def fake_request(endpoint: str, params=None, session=None):
        if endpoint == "geometria":
            return mock_geo_resp
        if endpoint == "projeto-investimento":
            return mock_proj_resp
        if endpoint == "execucao-fisica":
            return mock_exec_resp
        if endpoint == "historico-situacao-cancelada-paralisada":
            return mock_hist_resp
        return None

    with patch.object(extractor, "_request", side_effect=fake_request):
        data = extractor.extract(portal_slug="porciuncula_prefeitura", cod_ibge=3304102)

    assert len(data["projetos"]) == 1
    assert data["projetos"][0]["id_projeto_investimento"] == "PROJ-01"
    assert data["projetos"][0]["desc_nome"] == "Construção de Escola Municipal"
    assert data["projetos"][0]["valor_investimento_previsto"] == "500000.0"
    assert data["projetos"][0]["portal_slug"] == "porciuncula_prefeitura"

    assert len(data["geometrias"]) == 1
    assert data["geometrias"][0]["latitude"] == "-22.12345678"
    assert data["geometrias"][0]["longitude"] == "-42.98765432"

    assert len(data["execucoes_fisicas"]) == 1
    assert data["execucoes_fisicas"][0]["percentual_execucao_fisica"] == "45.5"


def test_obrasgov_extractor_empty_municipality():
    extractor = ObrasGovExtractor(min_interval_seconds=0)

    mock_geo_resp = {
        "data": [],
        "total_pages": 0,
    }

    with patch.object(extractor, "_request", return_value=mock_geo_resp):
        data = extractor.extract(portal_slug="municipio_vazio", cod_ibge=9999999)

    assert data["projetos"] == []
    assert data["geometrias"] == []
    assert data["execucoes_fisicas"] == []
    assert data["historico_paralisacoes"] == []


def test_obrasgov_extractor_retry_on_failure():
    extractor = ObrasGovExtractor(min_interval_seconds=0, max_retries=3)

    fail_resp = MagicMock()
    fail_resp.status_code = 500

    success_resp = MagicMock()
    success_resp.status_code = 200
    success_resp.json.return_value = {"data": [{"id_geometria": 1}], "total_pages": 1}

    with patch("time.sleep") as mock_sleep, patch("requests.get", side_effect=[fail_resp, success_resp]):
        res = extractor._request("geometria")
        assert res == {"data": [{"id_geometria": 1}], "total_pages": 1}
        assert mock_sleep.called


def test_load_obrasgov_idempotency(engine):
    ensure_obrasgov_tables(engine, schema="raw_obrasgov")

    projetos = [
        {
            "portal_slug": "porciuncula_prefeitura",
            "id_projeto_investimento": "OBRA-100",
            "desc_nome": "Reforma da UBS Centro",
            "situacao": "Em Execução",
            "organizacao_resp": "Secretaria Municipal de Saúde",
            "valor_investimento_previsto": "150000.00",
            "dt_inicial_prevista": "2024-02-01",
            "dt_final_prevista": "2024-08-30",
            "data_extracao": "2024-10-11T00:00:00",
        }
    ]

    geometrias = [
        {
            "portal_slug": "porciuncula_prefeitura",
            "id_projeto_investimento": "OBRA-100",
            "id_geometria": "0",
            "latitude": "-20.95847000",
            "longitude": "-42.03242000",
            "origem_geometria": "pin",
            "data_extracao": "2024-10-11T00:00:00",
        }
    ]

    execucoes = [
        {
            "portal_slug": "porciuncula_prefeitura",
            "id_projeto_investimento": "OBRA-100",
            "id_execucao_fisica": "1",
            "percentual_execucao_fisica": "60.00",
            "dt_atualizacao_execucao": "2024-07-15",
            "data_extracao": "2024-10-11T00:00:00",
        }
    ]

    historico = [
        {
            "portal_slug": "porciuncula_prefeitura",
            "id_projeto_investimento": "OBRA-100",
            "id_historico_situacao_investimento": "1",
            "descricao_historico_situacao_investimento": "Paralisada",
            "data_historico_situacao_investimento": "2024-05-10",
            "justificativa_cancelada_paralisada": "Aguardando liberação de aditivo contratual",
            "data_extracao": "2024-10-11T00:00:00",
        }
    ]

    # Primeira carga
    count_p1 = load_obrasgov_projetos(engine, projetos, schema="raw_obrasgov")
    count_g1 = load_obrasgov_geometrias(engine, geometrias, schema="raw_obrasgov")
    count_e1 = load_obrasgov_execucoes_fisicas(engine, execucoes, schema="raw_obrasgov")
    count_h1 = load_obrasgov_historico_paralisacoes(engine, historico, schema="raw_obrasgov")

    assert count_p1 == 1
    assert count_g1 == 1
    assert count_e1 == 1
    assert count_h1 == 1

    # Segunda carga idêntica (deve atualizar sem duplicar ou dar erro)
    count_p2 = load_obrasgov_projetos(engine, projetos, schema="raw_obrasgov")
    assert count_p2 == 1

    # Teste de load_obrasgov_all
    counts_all = load_obrasgov_all(
        engine,
        {
            "projetos": projetos,
            "geometrias": geometrias,
            "execucoes_fisicas": execucoes,
            "historico_paralisacoes": historico,
        },
        schema="raw_obrasgov",
    )
    assert counts_all["projetos"] == 1
    assert counts_all["geometrias"] == 1
    assert counts_all["execucoes_fisicas"] == 1
    assert counts_all["historico_paralisacoes"] == 1


def test_extract_run_only_obrasgov(tmp_path, monkeypatch):
    import elt.extract.run as extract_run

    sample_data = {
        "projetos": [{"id_projeto_investimento": "OBRA-100"}],
        "geometrias": [{"id_projeto_investimento": "OBRA-100", "id_geometria": 0}],
        "execucoes_fisicas": [{"id_projeto_investimento": "OBRA-100", "id_execucao_fisica": 1}],
        "historico_paralisacoes": [{"id_projeto_investimento": "OBRA-100", "id_historico_situacao_investimento": 1}],
    }
    test_args = [
        "run.py",
        "--portal",
        "porciuncula_prefeitura",
        "--years",
        "2024",
        "--only",
        "obrasgov",
    ]

    with (
        patch("sys.argv", test_args),
        patch.object(ObrasGovExtractor, "extract", return_value=sample_data) as mock_extract,
    ):
        monkeypatch.setattr(
            "elt.extract.run.Path",
            lambda p: tmp_path / p if isinstance(p, str) and p.startswith("data/raw_runs") else Path(p),
        )
        extract_run.main()

        assert mock_extract.call_count == 1
        written_files = list(tmp_path.rglob("*.json"))
        assert len(written_files) == 4
        file_names = {f.name for f in written_files}
        assert file_names == {
            "projetos.json",
            "geometrias.json",
            "execucoes_fisicas.json",
            "historico_paralisacoes.json",
        }


def test_load_run_obrasgov(tmp_path):
    import elt.load.run as load_run

    run_dir = tmp_path / "data" / "raw_runs" / "porciuncula_prefeitura" / "20260101_120000"
    obrasgov_dir = run_dir / "obrasgov"
    obrasgov_dir.mkdir(parents=True)

    projetos_file = obrasgov_dir / "projetos.json"
    sample_projetos = [{"id_projeto_investimento": "OBRA-100"}]
    projetos_file.write_text(json.dumps(sample_projetos))

    geometrias_file = obrasgov_dir / "geometrias.json"
    sample_geometrias = [{"id_projeto_investimento": "OBRA-100", "id_geometria": "0"}]
    geometrias_file.write_text(json.dumps(sample_geometrias))

    execucoes_file = obrasgov_dir / "execucoes_fisicas.json"
    sample_execucoes = [{"id_projeto_investimento": "OBRA-100", "id_execucao_fisica": "1"}]
    execucoes_file.write_text(json.dumps(sample_execucoes))

    historico_file = obrasgov_dir / "historico_paralisacoes.json"
    sample_historico = [{"id_projeto_investimento": "OBRA-100", "id_historico_situacao_investimento": "1"}]
    historico_file.write_text(json.dumps(sample_historico))

    test_args = [
        "run.py",
        "--portal",
        "porciuncula_prefeitura",
        "--dir",
        str(run_dir),
    ]

    with (
        patch("sys.argv", test_args),
        patch("elt.load.run.get_engine") as mock_engine,
        patch("elt.load.run._upsert_raw"),
        patch("elt.load.obrasgov.ensure_obrasgov_tables") as mock_ensure,
        patch("elt.load.obrasgov.load_obrasgov_projetos", return_value=1) as mock_load_proj,
        patch("elt.load.obrasgov.load_obrasgov_geometrias", return_value=1) as mock_load_geo,
        patch("elt.load.obrasgov.load_obrasgov_execucoes_fisicas", return_value=1) as mock_load_exec,
        patch("elt.load.obrasgov.load_obrasgov_historico_paralisacoes", return_value=1) as mock_load_hist,
    ):
        load_run.main()
        assert mock_ensure.call_count >= 1
        mock_load_proj.assert_called_once_with(mock_engine.return_value, sample_projetos, schema="raw_obrasgov")
        mock_load_geo.assert_called_once_with(mock_engine.return_value, sample_geometrias, schema="raw_obrasgov")
        mock_load_exec.assert_called_once_with(mock_engine.return_value, sample_execucoes, schema="raw_obrasgov")
        mock_load_hist.assert_called_once_with(mock_engine.return_value, sample_historico, schema="raw_obrasgov")
