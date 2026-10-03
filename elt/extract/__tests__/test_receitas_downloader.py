"""Testes unitários para o módulo centralizado receitas_downloader."""

from pathlib import Path
from unittest.mock import MagicMock

from elt.extract.fiorilli.receitas_downloader import (
    REPORT_ACTION_MAP,
    REPORTS,
    get_report_action_id,
    load_progress,
    normalize_csv_to_utf8,
    report_key,
    save_progress,
    wait_for_transparencia_app,
)


def test_report_key_format():
    """Valida o formato da chave única de progresso de relatórios."""
    key = report_key(2024, "1", "ReceitaOrcamentaria")
    assert key == "2024|1|ReceitaOrcamentaria"


def test_save_and_load_progress(tmp_path: Path):
    """Valida persistência e leitura incremental de progresso."""
    prog_path = tmp_path / "progress.json"
    assert load_progress(prog_path) == set()

    completed = {"2024|1|ReceitaOrcamentaria", "2024|1|ReceitaUniao"}
    save_progress(prog_path, completed)

    loaded = load_progress(prog_path)
    assert loaded == completed


def test_load_progress_legacy_fallback(tmp_path: Path):
    """Valida fallback para arquivo de progresso legada caso o novo não exista."""
    new_path = tmp_path / "new_progress.json"
    legacy_path = tmp_path / "legacy_progress.json"

    save_progress(legacy_path, {"2023|1|ReceitaOrcamentaria"})

    loaded = load_progress(new_path, legacy_path)
    assert loaded == {"2023|1|ReceitaOrcamentaria"}


def test_normalize_csv_to_utf8(tmp_path: Path):
    """Valida conversão de encoding ISO-8859-1 para UTF-8 sem perda de caracteres acentuados."""
    csv_file = tmp_path / "teste.csv"
    conteudo_latin1 = "Código;Descrição;Arrecadação\n1;Transferência da União;1000,00".encode("latin1")
    csv_file.write_bytes(conteudo_latin1)

    normalize_csv_to_utf8(csv_file)

    lido = csv_file.read_text(encoding="utf-8")
    assert "Código;Descrição;Arrecadação" in lido
    assert "Transferência da União" in lido


def test_report_action_map_coverage():
    """Garante que todos os relatórios padrões possuem mapeamento direto de action ID."""
    for report_text, _ in REPORTS:
        assert report_text in REPORT_ACTION_MAP
        assert REPORT_ACTION_MAP[report_text].startswith("lnk")


def test_get_report_action_id_fallback():
    """Valida que get_report_action_id retorna action_id encontrado ou None para acionar fallback."""
    mock_page = MagicMock()
    mock_page.evaluate.return_value = "lnkReceitaOrcamentaria"

    action_id = get_report_action_id(mock_page, "Arrecadação Orçamentária - Geral")
    assert action_id == "lnkReceitaOrcamentaria"

    mock_page.evaluate.return_value = None
    assert get_report_action_id(mock_page, "Inexistente") is None


def test_wait_for_transparencia_app_selectors():
    """Valida que wait_for_transparencia_app aguarda o menu e combos por ID e não seletor de texto oculto."""
    mock_page = MagicMock()

    wait_for_transparencia_app(mock_page, timeout_ms=5000)

    # Verifica que #LnkMenuReceitas foi aguardado
    mock_page.locator.assert_any_call("#LnkMenuReceitas")
    mock_page.locator.assert_any_call("#cmbExercicio_I")
    mock_page.locator.assert_any_call("#cmbEntidadeContabil_I")

    # Garante que NENHUM locator busca 'a:has-text' (que gerava o timeout)
    for call in mock_page.locator.call_args_list:
        selector = call[0][0]
        assert "a:has-text" not in selector
