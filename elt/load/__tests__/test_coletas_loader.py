"""Tests for the per-source collection log (raw_coletas.registro_coletas)."""

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import pytest
from elt.extract.saude_datasus import FONTE_DA_TABELA
from elt.load import run as load_run
from elt.load.coletas import (
    MUNICIPAL_PORTAL_SOURCE,
    SCHEMA,
    load_source_catalog,
    record_collections,
    record_failures,
)
from elt.load.run import _farmacia_collection_succeeded
from sqlalchemy import text

_RUN_PY = Path(__file__).resolve().parents[1] / "run.py"
_COLLECTED_AT = datetime(2026, 11, 10, 8, 30, tzinfo=timezone.utc)


def _rows(engine, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(
                f"SELECT fonte, coletado_em, frequencia_esperada, total_linhas FROM {SCHEMA}.registro_coletas "
                "WHERE portal_slug = :p ORDER BY fonte, coletado_em"
            ),
            {"p": portal},
        ).fetchall()


@pytest.fixture
def clean(engine):
    def wipe():
        with engine.begin() as conn:
            conn.execute(text(f"DELETE FROM {SCHEMA}.registro_coletas"))

    wipe()
    yield
    wipe()


@pytest.mark.usefixtures("clean")
def test_records_one_row_per_source_with_catalog_frequency_and_isolates_portals(engine):
    record_collections(engine, "portal_a", {"portal_municipal": 120, "pncp": 0}, _COLLECTED_AT)
    record_collections(engine, "portal_b", {"siconfi_rgf": 7}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == [
        ("pncp", _COLLECTED_AT.isoformat(), "semanal", "0"),
        ("portal_municipal", _COLLECTED_AT.isoformat(), "diaria", "120"),
    ]
    assert _rows(engine, "portal_b") == [("siconfi_rgf", _COLLECTED_AT.isoformat(), "mensal", "7")]


@pytest.mark.usefixtures("clean")
def test_reloading_same_run_is_idempotent_and_new_run_appends(engine):
    later = datetime(2026, 11, 11, 8, 30, tzinfo=timezone.utc)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, _COLLECTED_AT)
    record_collections(engine, "portal_a", {"portal_municipal": 1}, later)

    assert [row[1] for row in _rows(engine, "portal_a")] == [_COLLECTED_AT.isoformat(), later.isoformat()]


@pytest.mark.usefixtures("clean")
def test_unknown_source_is_rejected_and_nothing_is_written(engine):
    with pytest.raises(ValueError, match="fonte_inventada"):
        record_collections(engine, "portal_a", {"portal_municipal": 1, "fonte_inventada": 1}, _COLLECTED_AT)

    assert _rows(engine, "portal_a") == []


def test_every_source_recorded_by_load_runner_is_monitored_in_catalog():
    catalog = load_source_catalog()
    added = set(re.findall(r'rows_loaded\["([a-z_]+)"\]', _RUN_PY.read_text(encoding="utf-8")))

    # siope e siops entram por chave dinamica em rows_loaded[source]; a saude grava a coleta no proprio extrator.
    dynamic = {"siope", "siops"}
    recorded = added | dynamic | set(FONTE_DA_TABELA.values()) | {MUNICIPAL_PORTAL_SOURCE}
    assert recorded <= catalog.keys()
    assert {fonte for fonte in recorded if catalog[fonte]["monitoramento"] != "monitorado"} == set()
    assert {fonte for fonte, row in catalog.items() if row["monitoramento"] == "monitorado"} == recorded


def test_farmacia_counts_as_collected_only_when_collection_succeeded(tmp_path):
    def collection(status):
        directory = tmp_path / status
        directory.mkdir()
        (directory / "coletas.json").write_text(json.dumps([{"status_coleta": status}]))
        return directory

    assert _farmacia_collection_succeeded(collection("sucesso"))
    assert not _farmacia_collection_succeeded(collection("falha"))
    assert not _farmacia_collection_succeeded(tmp_path)


def _run_main(monkeypatch, engine, run_dir, *, farmacia_rows=1, siconfi_rgf_rows=1):
    """Executa main() sobre um diretório de coleta, com extração e carga das fontes substituídas por dublês."""
    portal = SimpleNamespace(slug="portal_a", provider="fiorilli")
    monkeypatch.setattr(sys, "argv", ["run", "--portal", "portal_a", "--dir", str(run_dir)])
    monkeypatch.setattr(load_run.PortalConfig, "load", lambda slug: portal)
    monkeypatch.setattr(
        load_run, "importlib", SimpleNamespace(import_module=lambda name: SimpleNamespace(ENDPOINT_CONFIGS=[]))
    )
    monkeypatch.setattr(load_run, "get_engine", lambda: engine)
    monkeypatch.setattr(load_run, "_upsert_raw", lambda *args, **kwargs: 0)
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_dir", lambda *args: farmacia_rows)
    monkeypatch.setattr("elt.load.siconfi.ensure_siconfi_rgf_table", lambda *args: None)
    monkeypatch.setattr("elt.load.siconfi.load_siconfi_rgf", lambda *args, **kwargs: siconfi_rgf_rows)
    load_run.main()


def _write_run(base, name, farmacia_status="sucesso"):
    run_dir = base / name
    (run_dir / "farmacia_sus").mkdir(parents=True)
    (run_dir / "farmacia_sus" / "coletas.json").write_text(json.dumps([{"status_coleta": farmacia_status}]))
    (run_dir / "siconfi_rgf").mkdir()
    (run_dir / "siconfi_rgf" / "dados.json").write_text("[]")
    return run_dir


@pytest.mark.usefixtures("clean")
def test_main_records_each_source_that_loaded_rows(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")

    _run_main(monkeypatch, engine, run_dir)

    assert [(fonte, frequencia, total) for fonte, _, frequencia, total in _rows(engine, "portal_a")] == [
        ("farmacia_sus", "diaria", "1"),
        ("siconfi_rgf", "mensal", "1"),
    ]


@pytest.mark.usefixtures("clean")
def test_main_does_not_record_failed_farmacia_collection(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000", farmacia_status="falha")

    _run_main(monkeypatch, engine, run_dir)

    assert [fonte for fonte, *_ in _rows(engine, "portal_a")] == ["siconfi_rgf"]


@pytest.mark.usefixtures("clean")
def test_main_records_source_that_responded_with_zero_rows(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")

    _run_main(monkeypatch, engine, run_dir, farmacia_rows=0, siconfi_rgf_rows=0)

    assert [(fonte, total) for fonte, _, _, total in _rows(engine, "portal_a")] == [
        ("farmacia_sus", "0"),
        ("siconfi_rgf", "0"),
    ]


@pytest.mark.usefixtures("clean")
def test_main_does_not_record_unrecognized_pncp_file(monkeypatch, engine, tmp_path):
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "pncp").mkdir(parents=True)
    (run_dir / "pncp" / "desconhecido.json").write_text("[]")
    monkeypatch.setattr("elt.load.pncp.ensure_pncp_tables", lambda *args: None)

    _run_main(monkeypatch, engine, run_dir)

    assert _rows(engine, "portal_a") == []


@pytest.mark.usefixtures("clean")
def test_main_records_nothing_when_run_directory_has_no_timestamp(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "coleta_manual")

    _run_main(monkeypatch, engine, run_dir)

    assert _rows(engine, "portal_a") == []


@pytest.mark.usefixtures("clean")
def test_main_loads_siope_and_siops_json_and_records_collections_with_catalog_frequency(monkeypatch, engine, tmp_path):
    run_dir = tmp_path / "20261110_083000"
    for table in ("siope_indicadores", "siops_indicadores"):
        (run_dir / table).mkdir(parents=True)
        (run_dir / table / "indicadores.json").write_text(json.dumps([{"portal_slug": "portal_a"}]))
    loaded = {}
    for source in ("siope", "siops"):
        monkeypatch.setattr(f"elt.load.{source}.ensure_{source}_table", lambda *args: None)
        monkeypatch.setattr(
            f"elt.load.{source}.load_{source}_indicadores",
            lambda db, rows, schema, source=source: loaded.setdefault(source, len(rows)),
        )

    _run_main(monkeypatch, engine, run_dir)

    assert loaded == {"siope": 1, "siops": 1}
    assert [(fonte, frequencia, total) for fonte, _, frequencia, total in _rows(engine, "portal_a")] == [
        ("siope", "mensal", "1"),
        ("siops", "mensal", "1"),
    ]


def _outcomes(engine, portal):
    with engine.connect() as conn:
        return conn.execute(
            text(
                f"SELECT fonte, resultado, erro_codigo, total_linhas FROM {SCHEMA}.registro_coletas "
                "WHERE portal_slug = :p ORDER BY fonte, coletado_em"
            ),
            {"p": portal},
        ).fetchall()


def _write_failed_requests(run_dir, *rows):
    header = "timestamp,listagem,empresa,year,error,fonte,erro_codigo\n"
    lines = [f"2026-11-10T08:00:00,{listagem},x,2026,boom,{fonte},{codigo}\n" for listagem, fonte, codigo in rows]
    (run_dir / "failed_requests.csv").write_text(header + "".join(lines))


def test_catalog_marks_suspicious_empty_sources_as_decided():
    catalog = load_source_catalog()

    assert {fonte for fonte, row in catalog.items() if row["resposta_vazia_e_suspeita"] == "true"} == {
        "portal_municipal",
        "farmacia_sus",
        "siope",
        "siops",
    }


@pytest.mark.usefixtures("clean")
def test_record_failures_writes_failure_without_touching_previous_success(engine):
    record_collections(engine, "portal_a", {"pncp": 5}, _COLLECTED_AT)
    later = datetime(2026, 11, 11, 8, 30, tzinfo=timezone.utc)

    record_failures(engine, "portal_a", {"pncp": "fonte_fora_do_ar"}, later)

    assert _outcomes(engine, "portal_a") == [
        ("pncp", "sucesso", None, "5"),
        ("pncp", "falha", "fonte_fora_do_ar", None),
    ]


@pytest.mark.usefixtures("clean")
def test_main_skips_failed_source_keeps_farmacia_history_records_failure_and_exits_nonzero(
    monkeypatch, engine, tmp_path
):
    run_dir = _write_run(tmp_path, "20261110_083000")
    _write_failed_requests(run_dir, ("farmacia_sus", "farmacia_sus", "fonte_fora_do_ar"))
    history = []
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_coletas", lambda eng, rows, slug: history.append(rows))
    full_loads = []
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_dir", lambda *args: full_loads.append(args) or 1)

    with pytest.raises(SystemExit) as exit_info:
        _run_main(monkeypatch, engine, run_dir)

    assert exit_info.value.code == 1
    assert full_loads == []
    assert history == [[{"status_coleta": "sucesso"}]]
    assert _outcomes(engine, "portal_a") == [
        ("farmacia_sus", "falha", "fonte_fora_do_ar", None),
        ("siconfi_rgf", "sucesso", None, "1"),
    ]


@pytest.mark.usefixtures("clean")
def test_main_format_change_skips_every_file_of_the_source_and_leaves_previous_rows_intact(
    monkeypatch, engine, tmp_path
):
    from elt.load.siope import SCHEMA as siope_schema
    from elt.load.siope import ensure_siope_table

    ensure_siope_table(engine, siope_schema)

    def siope_rows():
        with engine.connect() as conn:
            return conn.execute(text(f"SELECT count(*) FROM {siope_schema}.siope_indicadores")).scalar()

    rows_before = siope_rows()
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "siope_indicadores").mkdir(parents=True)
    (run_dir / "siope_indicadores" / "indicadores.json").write_text(json.dumps([{"portal_slug": "portal_a", "x": 1}]))
    _write_failed_requests(run_dir, ("siope", "siope", "formato_mudou"))

    with pytest.raises(SystemExit):
        _run_main(monkeypatch, engine, run_dir)

    assert siope_rows() == rows_before
    assert _outcomes(engine, "portal_a") == [("siope", "falha", "formato_mudou", None)]


@pytest.mark.usefixtures("clean")
def test_main_flags_suspicious_empty_response_when_last_good_collection_had_rows(monkeypatch, engine, tmp_path):
    record_collections(engine, "portal_a", {"siope": 12}, datetime(2026, 11, 1, 8, 30, tzinfo=timezone.utc))
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "siope_indicadores").mkdir(parents=True)
    (run_dir / "siope_indicadores" / "indicadores.json").write_text("[]")
    loaded = []
    monkeypatch.setattr("elt.load.siope.ensure_siope_table", lambda *args: None)
    monkeypatch.setattr("elt.load.siope.load_siope_indicadores", lambda *args, **kwargs: loaded.append(1) or 0)

    with pytest.raises(SystemExit) as exit_info:
        _run_main(monkeypatch, engine, run_dir)

    assert exit_info.value.code == 1
    assert loaded == []
    assert _outcomes(engine, "portal_a")[-1] == ("siope", "falha", "resposta_vazia_suspeita", None)


@pytest.mark.usefixtures("clean")
def test_main_records_legitimate_empty_response_as_success(monkeypatch, engine, tmp_path):
    # Fonte não marcada: vazio é normal mesmo depois de uma coleta com linhas.
    record_collections(engine, "portal_a", {"siconfi_rgf": 9}, datetime(2026, 11, 1, 8, 30, tzinfo=timezone.utc))
    run_dir = _write_run(tmp_path, "20261110_083000")

    _run_main(monkeypatch, engine, run_dir, farmacia_rows=0, siconfi_rgf_rows=0)

    assert ("siconfi_rgf", "sucesso", None, "0") in _outcomes(engine, "portal_a")


@pytest.mark.usefixtures("clean")
def test_main_marked_source_empty_without_previous_rows_is_legitimate(monkeypatch, engine, tmp_path):
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "siope_indicadores").mkdir(parents=True)
    (run_dir / "siope_indicadores" / "indicadores.json").write_text("[]")
    monkeypatch.setattr("elt.load.siope.ensure_siope_table", lambda *args: None)
    monkeypatch.setattr("elt.load.siope.load_siope_indicadores", lambda *args, **kwargs: 0)

    _run_main(monkeypatch, engine, run_dir)

    assert _outcomes(engine, "portal_a") == [("siope", "sucesso", None, "0")]


@pytest.mark.usefixtures("clean")
def test_main_failure_in_one_source_does_not_stop_the_others(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")
    _write_failed_requests(run_dir, ("siconfi_rgf", "siconfi_rgf", "erro_inesperado"))

    with pytest.raises(SystemExit):
        _run_main(monkeypatch, engine, run_dir)

    assert _outcomes(engine, "portal_a") == [
        ("farmacia_sus", "sucesso", None, "1"),
        ("siconfi_rgf", "falha", "erro_inesperado", None),
    ]


@pytest.mark.usefixtures("clean")
def test_failure_in_portal_a_leaves_portal_b_history_untouched(engine):
    record_collections(engine, "portal_b", {"pncp": 3}, _COLLECTED_AT)

    record_failures(engine, "portal_a", {"pncp": "formato_mudou"}, _COLLECTED_AT)

    assert _outcomes(engine, "portal_b") == [("pncp", "sucesso", None, "3")]


@pytest.mark.usefixtures("clean")
def test_main_flags_suspicious_empty_farmacia_and_leaves_cnes_intact(monkeypatch, engine, tmp_path):
    record_collections(engine, "portal_a", {"farmacia_sus": 8}, datetime(2026, 11, 1, 8, 30, tzinfo=timezone.utc))
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "farmacia_sus").mkdir(parents=True)
    for name, content in (
        ("coletas.json", [{"status_coleta": "sucesso"}]),
        ("estoque_medicamentos.json", []),
        ("estabelecimentos_cnes.json", []),
    ):
        (run_dir / "farmacia_sus" / name).write_text(json.dumps(content))
    with engine.begin() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS raw_farmacia_sus"))
        conn.execute(text("CREATE TABLE IF NOT EXISTS raw_farmacia_sus.teste_cnes_guard (marca TEXT)"))
        conn.execute(text("DELETE FROM raw_farmacia_sus.teste_cnes_guard"))
        conn.execute(text("INSERT INTO raw_farmacia_sus.teste_cnes_guard VALUES ('anterior')"))
    calls = []
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_dir", lambda *args: calls.append(args) or 0)
    monkeypatch.setattr("elt.load.farmacia_sus.load_farmacia_sus_coletas", lambda *args: calls.append(args) or 0)

    with pytest.raises(SystemExit) as exit_info:
        _run_main(monkeypatch, engine, run_dir)

    with engine.connect() as conn:
        guard = conn.execute(text("SELECT marca FROM raw_farmacia_sus.teste_cnes_guard")).fetchall()
        conn.execute(text("DROP TABLE raw_farmacia_sus.teste_cnes_guard"))
        conn.commit()
    assert exit_info.value.code == 1
    assert calls == []
    assert guard == [("anterior",)]
    assert _outcomes(engine, "portal_a")[-1] == ("farmacia_sus", "falha", "resposta_vazia_suspeita", None)


@pytest.mark.usefixtures("clean")
def test_main_flags_suspicious_empty_portal_municipal(monkeypatch, engine, tmp_path):
    record_collections(
        engine, "portal_a", {MUNICIPAL_PORTAL_SOURCE: 40}, datetime(2026, 11, 1, 8, 30, tzinfo=timezone.utc)
    )
    run_dir = tmp_path / "20261110_083000"
    (run_dir / "raw_receitas").mkdir(parents=True)
    (run_dir / "raw_receitas" / "1_2026.json").write_text("[]")
    endpoint = SimpleNamespace(table="raw_receitas", key_cols=["id"], post_process=None)
    monkeypatch.setattr(
        load_run, "importlib", SimpleNamespace(import_module=lambda name: SimpleNamespace(ENDPOINT_CONFIGS=[endpoint]))
    )
    upserts = []

    def run():
        # _run_main reinstala o importlib de dublê; reaplica o endpoint depois dele.
        original = load_run.main
        monkeypatch.setattr(sys, "argv", ["run", "--portal", "portal_a", "--dir", str(run_dir)])
        monkeypatch.setattr(
            load_run.PortalConfig,
            "load",
            lambda slug: SimpleNamespace(slug="portal_a", provider="fiorilli"),
        )
        monkeypatch.setattr(load_run, "get_engine", lambda: engine)
        monkeypatch.setattr(load_run, "_upsert_raw", lambda *args, **kwargs: upserts.append(args) or 0)
        original()

    with pytest.raises(SystemExit) as exit_info:
        run()

    assert exit_info.value.code == 1
    assert [args[2] for args in upserts] == ["metadata"]
    assert _outcomes(engine, "portal_a")[-1] == (MUNICIPAL_PORTAL_SOURCE, "falha", "resposta_vazia_suspeita", None)


@pytest.mark.usefixtures("clean")
def test_main_first_error_code_wins_when_source_fails_twice(monkeypatch, engine, tmp_path):
    run_dir = _write_run(tmp_path, "20261110_083000")
    _write_failed_requests(
        run_dir,
        ("siconfi_rgf", "siconfi_rgf", "fonte_fora_do_ar"),
        ("siconfi_rgf", "siconfi_rgf", "formato_mudou"),
    )

    with pytest.raises(SystemExit):
        _run_main(monkeypatch, engine, run_dir)

    assert ("siconfi_rgf", "falha", "fonte_fora_do_ar", None) in _outcomes(engine, "portal_a")
