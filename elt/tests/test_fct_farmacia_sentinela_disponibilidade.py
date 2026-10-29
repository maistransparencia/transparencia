"""Testes de integração do mart fct_farmacia_sentinela_disponibilidade (medicamentos-sentinela)."""

from datetime import date, timedelta

import pytest
from sqlalchemy import text

_SCHEMA = "raw_farmacia_sus"
_HOJE = date.today()


def _dia(dias_atras: int) -> str:
    return (_HOJE - timedelta(days=dias_atras)).isoformat()


@pytest.fixture
def portais(conn):
    slugs = [
        linha[0]
        for linha in conn.execute(
            text(
                "SELECT portal_slug FROM analytics.dim_portais WHERE cod_ibge IS NOT NULL ORDER BY portal_slug LIMIT 2"
            )
        )
    ]
    assert len(slugs) == 2
    return slugs


@pytest.fixture
def raw(conn):
    def limpar():
        for tabela in ("estoque_medicamentos", "estabelecimentos_cnes", "coletas"):
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela}"))
        conn.commit()

    limpar()

    def coleta(portal):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.coletas (portal_slug, status_coleta, total_registros_estoque, data_coleta) "
                "VALUES (:p, 'sucesso', '0', :d)"
            ),
            {"p": portal, "d": f"{_dia(0)}T12:00:00"},
        )

    def estoque(portal, id_registro, cnes, medicamento, data_posicao, quantidade="10", validade=None):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.estoque_medicamentos "
                "(portal_slug, id_registro, codigo_cnes, nome_medicamento, quantidade_estoque, data_posicao_estoque, data_validade) "
                "VALUES (:p, :i, :c, :m, :q, :d, :v)"
            ),
            {
                "p": portal,
                "i": id_registro,
                "c": cnes,
                "m": medicamento,
                "q": quantidade,
                "d": data_posicao,
                "v": validade,
            },
        )

    yield type("Raw", (), {"coleta": staticmethod(coleta), "estoque": staticmethod(estoque)})
    conn.rollback()
    limpar()


def _por_sentinela(conn, portal, cnes):
    linhas = conn.execute(
        text(
            "SELECT codigo_principio_ativo, status_disponibilidade, quantidade_apresentacoes_com_estoque "
            "FROM analytics.fct_farmacia_sentinela_disponibilidade "
            "WHERE portal_slug = :p AND codigo_cnes = :c"
        ),
        {"p": portal, "c": cnes},
    ).fetchall()
    return {linha[0]: (linha[1], linha[2]) for linha in linhas}


def test_casa_sal_acento_e_apresentacao_e_gera_linha_explicita_para_ausentes(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Losartana Potássica 50mg", _dia(1))
    raw.estoque(portal, "a2", "1001", "ÁCIDO ACETILSALICÍLICO 100 mg", _dia(1))
    raw.estoque(portal, "a3", "1001", "Losartana Potássica 100mg", _dia(1))
    conn.commit()

    mapa = _por_sentinela(conn, portal, "1001")
    assert len(mapa) == 21
    assert mapa["losartana"] == ("com_registro_estoque", 2)
    assert mapa["acido_acetilsalicilico"] == ("com_registro_estoque", 1)
    assert mapa["captopril"] == ("sem_registro_estoque", 0)


def test_expoe_validade_dos_lotes_para_a_consulta_decidir_o_que_ja_venceu(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "v1", "1001", "Captopril 25mg", _dia(1), validade=_dia(5))
    raw.estoque(portal, "v2", "1001", "Captopril 25mg", _dia(1), validade=_dia(9))
    raw.estoque(portal, "v3", "1001", "Dipirona", _dia(1), validade=_dia(1))
    raw.estoque(portal, "v4", "1001", "Dipirona", _dia(1))
    raw.estoque(portal, "v5", "1001", "Metformina 850mg", _dia(1), validade=_dia(2))
    raw.estoque(portal, "v6", "1001", "Metformina 850mg", _dia(1), validade=_dia(-90))
    raw.estoque(portal, "v7", "1001", "Losartana Potássica 50mg", _dia(1), quantidade="0", validade=_dia(-5))
    conn.commit()

    linhas = conn.execute(
        text(
            "SELECT codigo_principio_ativo, status_disponibilidade, possui_lote_sem_validade, data_validade_mais_tardia "
            "FROM analytics.fct_farmacia_sentinela_disponibilidade WHERE portal_slug = :p AND codigo_cnes = :c"
        ),
        {"p": portal, "c": "1001"},
    ).fetchall()
    mapa = {linha[0]: (linha[1], linha[2], linha[3].isoformat() if linha[3] else None) for linha in linhas}
    # lotes todos vencidos: segue com registro; quem decide e a consulta, com a data de hoje
    assert mapa["captopril"] == ("com_registro_estoque", False, _dia(5))
    assert mapa["dipirona"] == ("com_registro_estoque", True, _dia(1))
    assert mapa["metformina"] == ("com_registro_estoque", False, _dia(-90))
    # lote sem saldo nao conta nem para a validade
    assert mapa["losartana"] == ("sem_registro_estoque", False, None)
    assert mapa["anlodipino"] == ("sem_registro_estoque", False, None)


def test_dose_fixa_e_insulina_analoga_nao_casam(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Amoxicilina + Clavulanato", _dia(1))
    raw.estoque(portal, "a2", "1001", "Paracetamol + Codeína", _dia(1))
    raw.estoque(portal, "a3", "1001", "Insulina Glargina", _dia(1))
    raw.estoque(portal, "a4", "1001", "Losartana associada a hidroclorotiazida", _dia(1))
    conn.commit()

    mapa = _por_sentinela(conn, portal, "1001")
    for codigo in ("amoxicilina", "paracetamol", "insulina", "losartana", "hidroclorotiazida"):
        assert mapa[codigo] == ("sem_registro_estoque", 0)


def test_combinacao_nao_conta_mas_e_sinalizada(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "VALSARTANA + HIDROCLOROTIAZIDA 320 + 25 MG COMPRIMIDO", _dia(1))
    raw.estoque(portal, "a2", "1001", "Levanlodipino, Besilato 5,0 MG", _dia(1))
    raw.estoque(portal, "a3", "1002", "Hidroclorotiazida 25 mg", _dia(1))
    raw.estoque(portal, "a4", "1002", "OLMESARTANA + HIDROCLOROTIAZIDA 40 + 25 MG", _dia(1))
    conn.commit()

    linhas = conn.execute(
        text(
            "SELECT codigo_cnes, codigo_principio_ativo, status_disponibilidade, "
            "quantidade_apresentacoes_combinacao_com_estoque "
            "FROM analytics.fct_farmacia_sentinela_disponibilidade "
            "WHERE portal_slug = :p AND codigo_principio_ativo IN ('hidroclorotiazida', 'anlodipino')"
        ),
        {"p": portal},
    ).fetchall()
    mapa = {(linha[0], linha[1]): (linha[2], linha[3]) for linha in linhas}
    assert mapa[("1001", "hidroclorotiazida")] == ("sem_registro_estoque", 1)
    assert mapa[("1002", "hidroclorotiazida")] == ("com_registro_estoque", 1)
    assert mapa[("1001", "anlodipino")] == ("sem_registro_estoque", 0)


def test_insulina_nph_e_regular_contam_para_o_mesmo_codigo(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Insulina Humana NPH 100 UI/mL", _dia(1))
    raw.estoque(portal, "a2", "1001", "Insulina Humana Regular 100 UI/mL", _dia(1))
    conn.commit()

    assert _por_sentinela(conn, portal, "1001")["insulina"] == ("com_registro_estoque", 2)


def test_quantidade_zero_e_sem_registro(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Dipirona 500mg", _dia(1), "0")
    raw.estoque(portal, "a2", "1001", "Metformina 850mg", _dia(1))
    conn.commit()

    mapa = _por_sentinela(conn, portal, "1001")
    assert mapa["dipirona"] == ("sem_registro_estoque", 0)
    assert mapa["metformina"] == ("com_registro_estoque", 1)


def test_unidade_inativa_fica_fora_do_denominador(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Dipirona 500mg", _dia(1))
    raw.estoque(portal, "a2", "2002", "Dipirona 500mg", _dia(40))
    conn.commit()

    unidades = conn.execute(
        text(
            "SELECT DISTINCT codigo_cnes FROM analytics.fct_farmacia_sentinela_disponibilidade WHERE portal_slug = :p"
        ),
        {"p": portal},
    ).fetchall()
    assert [linha[0] for linha in unidades] == ["1001"]


def test_isolamento_entre_portais_com_mesmo_cnes(conn, raw, portais):
    portal_a, portal_b = portais
    raw.coleta(portal_a)
    raw.coleta(portal_b)
    raw.estoque(portal_a, "a1", "1001", "Dipirona 500mg", _dia(1))
    raw.estoque(portal_b, "b1", "1001", "Captopril 25mg", _dia(1))
    conn.commit()

    mapa_a = _por_sentinela(conn, portal_a, "1001")
    mapa_b = _por_sentinela(conn, portal_b, "1001")
    assert mapa_a["dipirona"][0] == "com_registro_estoque"
    assert mapa_a["captopril"][0] == "sem_registro_estoque"
    assert mapa_b["captopril"][0] == "com_registro_estoque"
    assert mapa_b["dipirona"][0] == "sem_registro_estoque"


def test_portal_em_apagao_nao_gera_linhas(conn, raw, portais):
    raw.coleta(portais[0])
    conn.commit()

    total = conn.execute(
        text("SELECT count(*) FROM analytics.fct_farmacia_sentinela_disponibilidade WHERE portal_slug = :p"),
        {"p": portais[0]},
    ).scalar()
    assert total == 0


def test_destaque_card_inicial_exposto_e_restrito_aos_seis_remedios_comuns(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "a1", "1001", "Dipirona 500mg", _dia(1))
    conn.commit()

    destacados = conn.execute(
        text(
            "SELECT codigo_principio_ativo, destaque_card_inicial "
            "FROM analytics.fct_farmacia_sentinela_disponibilidade "
            "WHERE portal_slug = :p AND codigo_cnes = '1001'"
        ),
        {"p": portal},
    ).fetchall()
    mapa = {linha[0]: linha[1] for linha in destacados}
    assert all(isinstance(valor, bool) for valor in mapa.values())
    assert {codigo for codigo, valor in mapa.items() if valor} == {
        "dipirona",
        "paracetamol",
        "losartana",
        "metformina",
        "amoxicilina",
        "omeprazol",
    }
    assert mapa["insulina"] is False
