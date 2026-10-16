"""Testes unitários e de integração para o sincronizador de dados do IDEB do INEP."""

import io
import urllib.error
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from elt.scripts.sync_inep_ideb_seed import (
    DEFAULT_YEARS,
    check_cycle_published,
    extract_from_zip_bytes,
    extract_ideb_from_excel,
    is_year_in_seed,
    main,
    normalize_rede,
    parse_numeric,
    sync_inep_ideb_seed,
)

SEED_CSV_PATH = Path(__file__).resolve().parents[1] / "transform" / "seeds" / "seed_inep_ideb.csv"


class TestSanitizationAndNormalization:
    """Testes de funções puras de parsing e conversão."""

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("5.9", 5.9),
            ("5,9", 5.9),
            (4.5, 4.5),
            ("218.39", 218.39),
            ("218,39", 218.39),
            ("0.984589", 0.984589),
            ("100", 100.0),
            (10, 10.0),
            ("-", None),
            ("--", None),
            ("ND", None),
            ("nd", None),
            ("", None),
            ("   ", None),
            ("*", None),
            (None, None),
            (float("nan"), None),
        ],
    )
    def test_parse_numeric(self, raw, expected):
        result = parse_numeric(raw)
        if expected is None:
            assert result is None
        else:
            assert result is not None
            assert pytest.approx(result, rel=1e-5) == expected

    @pytest.mark.parametrize(
        ("raw", "expected"),
        [
            ("Municipal", "municipal"),
            ("MUNICIPAL", "municipal"),
            ("municipal", "municipal"),
            ("Estadual", "estadual"),
            ("ESTADUAL", "estadual"),
            ("Pública", "publica"),
            ("PÚBLICA", "publica"),
            ("Publica", "publica"),
            ("publica", "publica"),
            ("Federal", None),
            ("Privada", None),
            ("", None),
            (None, None),
        ],
    )
    def test_normalize_rede(self, raw, expected):
        assert normalize_rede(raw) == expected


class TestCheckCyclePing:
    """Testes da verificação leve HTTP HEAD para monitoramento autônomo."""

    @patch("urllib.request.urlopen")
    def test_check_cycle_published_200(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        assert check_cycle_published(2027) is True
        # Valida que verificou tanto anos iniciais quanto finais
        assert mock_urlopen.call_count == 2

    @patch("urllib.request.urlopen")
    def test_check_cycle_published_anos_finais_404(self, mock_urlopen):
        mock_resp_200 = MagicMock()
        mock_resp_200.status = 200
        mock_404 = urllib.error.HTTPError(
            url="http://fake",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None,  # type: ignore[arg-type]
        )
        mock_urlopen.side_effect = [
            MagicMock(__enter__=MagicMock(return_value=mock_resp_200)),
            mock_404,
        ]

        assert check_cycle_published(2027) is False

    @patch("urllib.request.urlopen")
    def test_check_cycle_published_404(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="http://fake",
            code=404,
            msg="Not Found",
            hdrs={},
            fp=None,  # type: ignore[arg-type]
        )

        assert check_cycle_published(2027) is False

    @patch("urllib.request.urlopen")
    def test_check_cycle_published_network_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError(reason="Connection refused")

        assert check_cycle_published(2027) is False


class TestExcelExtraction:
    """Testes de parsing estrutural das planilhas de divulgação oficial do INEP."""

    @pytest.fixture
    def synthetic_excel_bytes(self) -> bytes:
        """Gera em memória uma planilha com as 9 linhas de metadados antes do cabeçalho técnico."""
        # 9 linhas de metadados (índices 0 a 8)
        meta_rows = [
            ["Ministério da Educação"] + [""] * 15,
            ["Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira"] + [""] * 15,
            [""] * 16,
            ["Ensino Fundamental Regular - Anos Iniciais"] + [""] * 15,
            ["Indicadores educacionais compostos por: Taxa de Aprovação, SAEB e IDEB"] + [""] * 15,
            [""] * 16,
            ["Sigla da UF", "Código do Município", "Nome do Município", "Rede"] + [""] * 12,
            ["Matemática", "Língua Portuguesa"] + [""] * 14,
            ["1º ao 5º ano", "1º", "2º"] + [""] * 13,
        ]

        # Linha 9: Cabeçalho técnico
        header = [
            "SG_UF",
            "CO_MUNICIPIO",
            "NO_MUNICIPIO",
            "REDE",
            "VL_OBSERVADO_2021",
            "VL_OBSERVADO_2023",
            "VL_OBSERVADO_2025",
            "VL_PROJECAO_2021",
            "VL_NOTA_MATEMATICA_2021",
            "VL_NOTA_MATEMATICA_2023",
            "VL_NOTA_MATEMATICA_2025",
            "VL_NOTA_PORTUGUES_2021",
            "VL_NOTA_PORTUGUES_2023",
            "VL_NOTA_PORTUGUES_2025",
            "VL_INDICADOR_REND_2021",
            "VL_INDICADOR_REND_2023",
            "VL_INDICADOR_REND_2025",
        ]

        # Dados sintéticos: Porciúncula (RJ), Natividade (RJ) e São Paulo (SP - deve ser filtrado)
        data_rows = [
            # Porciúncula - Municipal
            [
                "RJ",
                "3304102",
                "Porciúncula",
                "Municipal",
                "5.2",
                "4.5",
                "5.9",
                "6.4",
                "210.79",
                "190.18",
                "218.39",
                "198.28",
                "175.60",
                "210.91",
                "0.92546",
                "0.94245",
                "0.98458",
            ],
            # Porciúncula - Estadual (sem nota em anos iniciais)
            [
                "RJ",
                "3304102",
                "Porciúncula",
                "Estadual",
                "-",
                "-",
                "-",
                "6.0",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
                "-",
            ],
            # Natividade - Municipal
            [
                "RJ",
                "3303104",
                "Natividade",
                "Municipal",
                "5.2",
                "5.7",
                "6.0",
                "6.1",
                "205.00",
                "215.00",
                "220.00",
                "195.00",
                "208.00",
                "215.00",
                "0.95000",
                "0.96000",
                "0.97000",
            ],
            # Município de SP (deve ser ignorado no filtro de UF=RJ)
            [
                "SP",
                "3550308",
                "São Paulo",
                "Municipal",
                "5.8",
                "5.9",
                "6.0",
                "6.2",
                "220.00",
                "225.00",
                "230.00",
                "210.00",
                "215.00",
                "220.00",
                "0.98000",
                "0.98500",
                "0.99000",
            ],
        ]

        all_grid = meta_rows + [header] + data_rows
        df_synthetic = pd.DataFrame(all_grid)

        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df_synthetic.to_excel(writer, sheet_name="IDEB_AI_MUNICÍPIOS", header=False, index=False)
        return buf.getvalue()

    def test_extract_ideb_from_excel(self, synthetic_excel_bytes):
        records = extract_ideb_from_excel(
            io.BytesIO(synthetic_excel_bytes),
            etapa_ensino="anos_iniciais",
            years=[2021, 2023, 2025],
            uf="RJ",
        )

        assert len(records) > 0
        df = pd.DataFrame(records)

        # SP deve ter sido filtrado
        assert 3550308 not in df["cod_ibge"].values

        # Apenas RJ
        ibge_codes = set(df["cod_ibge"].unique())
        assert ibge_codes == {3304102, 3303104}

        # Validação Porciúncula Municipal
        porc_mun = df[(df["cod_ibge"] == 3304102) & (df["rede"] == "municipal")]
        assert len(porc_mun) == 3

        row_2023 = porc_mun[porc_mun["ano"] == 2023].iloc[0]
        assert row_2023["nota_ideb"] == 4.5
        assert row_2023["saeb_matematica"] == 190.18
        assert row_2023["saeb_lingua_portuguesa"] == 175.60

        row_2025 = porc_mun[porc_mun["ano"] == 2025].iloc[0]
        assert row_2025["nota_ideb"] == 5.9
        assert row_2025["saeb_matematica"] == 218.39
        assert row_2025["saeb_lingua_portuguesa"] == 210.91

        # Validação de valores nulos (Porciúncula Estadual)
        porc_est = df[(df["cod_ibge"] == 3304102) & (df["rede"] == "estadual")]
        assert pd.isna(porc_est[porc_est["ano"] == 2025].iloc[0]["nota_ideb"])

    def test_extract_from_zip_bytes(self, synthetic_excel_bytes):
        zip_buf = io.BytesIO()
        import zipfile

        with zipfile.ZipFile(zip_buf, "w") as z:
            z.writestr("planilha_divulgacao.xlsx", synthetic_excel_bytes)

        records = extract_from_zip_bytes(
            zip_buf.getvalue(),
            etapa_ensino="anos_iniciais",
            years=[2021, 2023, 2025],
            uf="RJ",
        )
        # 3 linhas (Porciúncula mun + est, Natividade mun) x 3 anos = 9 registros
        assert len(records) == 9


class TestSeedFileIntegrity:
    """Validações do arquivo físico de seed do dbt."""

    def test_seed_file_exists(self):
        assert SEED_CSV_PATH.exists(), f"Seed file não encontrado em {SEED_CSV_PATH}"
        assert SEED_CSV_PATH.stat().st_size > 0

    def test_seed_columns_and_grain(self):
        df = pd.read_csv(SEED_CSV_PATH)
        expected_cols = [
            "cod_ibge",
            "ano",
            "rede",
            "etapa_ensino",
            "nota_ideb",
            "meta_ideb",
            "saeb_matematica",
            "saeb_lingua_portuguesa",
            "taxa_aprovacao",
        ]
        assert list(df.columns) == expected_cols

        # Unicidade no grão
        duplicates = df.duplicated(subset=["cod_ibge", "ano", "rede", "etapa_ensino"]).sum()
        assert duplicates == 0, f"Encontradas {duplicates} linhas duplicadas no grão primário da seed"

        # Categorias normalizadas em snake_case
        assert set(df["rede"].unique()).issubset({"municipal", "estadual", "publica"})
        assert set(df["etapa_ensino"].unique()).issubset({"anos_iniciais", "anos_finais"})

        # Anos esperados (subset para compatibilidade com futuros ciclos no CI)
        assert {2021, 2023, 2025}.issubset(set(df["ano"].unique()))

    def test_porciuncula_acceptance_values(self):
        """Critério de aceitação: Porciúncula contendo Ideb 5.9 em 2025 e 4.5 em 2023."""
        df = pd.read_csv(SEED_CSV_PATH)
        porc_mun_ai = df[
            (df["cod_ibge"] == 3304102) & (df["rede"] == "municipal") & (df["etapa_ensino"] == "anos_iniciais")
        ]
        assert len(porc_mun_ai) == 3

        val_2023 = porc_mun_ai[porc_mun_ai["ano"] == 2023]["nota_ideb"].iloc[0]
        val_2025 = porc_mun_ai[porc_mun_ai["ano"] == 2025]["nota_ideb"].iloc[0]

        assert val_2023 == 4.5
        assert val_2025 == 5.9


class TestIsYearInSeed:
    """Testes unitários para a função de verificação de idempotência is_year_in_seed."""

    def test_is_year_in_seed_existing_year(self):
        assert is_year_in_seed(2025, SEED_CSV_PATH) is True
        assert is_year_in_seed(2021, SEED_CSV_PATH) is True

    def test_is_year_in_seed_missing_year(self):
        assert is_year_in_seed(2099, SEED_CSV_PATH) is False

    def test_is_year_in_seed_nonexistent_file(self, tmp_path):
        fake_file = tmp_path / "nonexistent.csv"
        assert is_year_in_seed(2025, fake_file) is False


class TestSyncTargetYearInclusion:
    """Testes unitários para inclusão automática do target_year em sync_inep_ideb_seed."""

    @patch("elt.scripts.sync_inep_ideb_seed.download_zip")
    @patch("elt.scripts.sync_inep_ideb_seed.extract_from_zip_bytes")
    def test_target_year_included_in_default_years(self, mock_extract, mock_download, tmp_path):
        mock_download.return_value = b"fake_zip"
        mock_extract.return_value = [
            {
                "cod_ibge": 3304102,
                "ano": 2027,
                "rede": "municipal",
                "etapa_ensino": "anos_iniciais",
                "nota_ideb": 6.0,
                "meta_ideb": None,
                "saeb_matematica": None,
                "saeb_lingua_portuguesa": None,
                "taxa_aprovacao": None,
            }
        ]

        out_csv = tmp_path / "output_test.csv"
        sync_inep_ideb_seed(output_path=out_csv, target_year=2027, years=None)

        # Verifica que extract_from_zip_bytes recebeu years contendo DEFAULT_YEARS + [2027]
        for call in mock_extract.call_args_list:
            called_years = call.kwargs.get("years")
            assert 2027 in called_years
            assert set(DEFAULT_YEARS).issubset(set(called_years))


class TestMainCliCheckNext:
    """Testes unitários para o CLI e exit codes de --check-next."""

    @patch("elt.scripts.sync_inep_ideb_seed.is_year_in_seed", return_value=True)
    def test_cli_check_next_already_in_seed_exits_1(self, _mock_in_seed):
        with patch("sys.argv", ["sync_inep_ideb_seed.py", "--check-next", "2025"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1

    @patch("elt.scripts.sync_inep_ideb_seed.is_year_in_seed", return_value=False)
    @patch("elt.scripts.sync_inep_ideb_seed.check_cycle_published", return_value=True)
    def test_cli_check_next_published_exits_0(self, _mock_check, _mock_in_seed):
        with patch("sys.argv", ["sync_inep_ideb_seed.py", "--check-next", "2027"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 0

    @patch("elt.scripts.sync_inep_ideb_seed.is_year_in_seed", return_value=False)
    @patch("elt.scripts.sync_inep_ideb_seed.check_cycle_published", return_value=False)
    def test_cli_check_next_not_published_exits_1(self, _mock_check, _mock_in_seed):
        with patch("sys.argv", ["sync_inep_ideb_seed.py", "--check-next", "2027"]):
            with pytest.raises(SystemExit) as exc_info:
                main()
            assert exc_info.value.code == 1
