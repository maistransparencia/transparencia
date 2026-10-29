"""Testes de integração do mart fct_farmacia_estoque (conformidade Lei 14.654/2023)."""

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

    def coleta(portal, status="sucesso", dias_atras=0, hora="12:00:00"):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.coletas (portal_slug, status_coleta, total_registros_estoque, data_coleta) "
                "VALUES (:p, :s, '0', :d)"
            ),
            {"p": portal, "s": status, "d": f"{_dia(dias_atras)}T{hora}"},
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

    def cnes(portal, codigo, nome):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.estabelecimentos_cnes "
                "(portal_slug, codigo_cnes, nome_estabelecimento, endereco_estabelecimento, telefone_estabelecimento, "
                "latitude_estabelecimento, longitude_estabelecimento) "
                "VALUES (:p, :c, :n, 'Rua A, 10', '2299999999', '-21.12340000', '-42.5678')"
            ),
            {"p": portal, "c": codigo, "n": nome},
        )

    yield type(
        "Raw", (), {"coleta": staticmethod(coleta), "estoque": staticmethod(estoque), "cnes": staticmethod(cnes)}
    )
    conn.rollback()
    limpar()


def _linhas(conn, portal):
    return conn.execute(
        text(
            "SELECT status_conformidade, nome_medicamento, nome_unidade, codigo_cnes, quantidade_estoque, "
            "data_posicao_mais_recente FROM analytics.fct_farmacia_estoque WHERE portal_slug = :p "
            "ORDER BY nome_medicamento"
        ),
        {"p": portal},
    ).fetchall()


def _status(conn, portal):
    return [linha[0] for linha in _linhas(conn, portal)]


def test_transmissor_recente_e_conforme_com_itens_vigentes_e_isolamento_de_tenant(conn, raw, portais):
    portal_a, portal_b = portais
    raw.coleta(portal_a)
    raw.coleta(portal_b)
    raw.cnes(portal_a, "0001234", "UBS Central")
    raw.cnes(portal_b, "1234", "UBS de Outro Municipio")
    raw.estoque(portal_a, "a1", "0001234", "Losartana 50mg", _dia(4), "1.234,5")
    raw.estoque(portal_a, "a2", "9999", "Dipirona", _dia(4))
    raw.estoque(portal_a, "a3", "0001234", "Medicamento Antigo", _dia(40))
    conn.commit()

    linhas_a = _linhas(conn, portal_a)
    assert [(linha[0], linha[1], linha[2]) for linha in linhas_a] == [
        ("conforme", "Dipirona", None),
        ("conforme", "Losartana 50mg", "UBS Central"),
    ]
    assert linhas_a[1][3] == "1234"
    assert float(linhas_a[1][4]) == 1234.5

    # Portal B tem coleta bem-sucedida e nenhum estoque: não herda dados do portal A.
    assert [(linha[0], linha[1]) for linha in _linhas(conn, portal_b)] == [("apagao", None)]


def test_data_validade_do_lote_e_exposta_e_nula_quando_a_fonte_nao_informa(conn, raw, portais):
    portal = portais[0]
    raw.coleta(portal)
    raw.estoque(portal, "d1", "1001", "Dipirona", _dia(1), validade=_dia(-3))
    raw.estoque(portal, "d2", "1001", "Amoxicilina", _dia(1))
    conn.commit()

    linhas = conn.execute(
        text(
            "SELECT nome_medicamento, data_validade FROM analytics.fct_farmacia_estoque "
            "WHERE portal_slug = :p ORDER BY nome_medicamento"
        ),
        {"p": portal},
    ).fetchall()
    assert [(linha[0], linha[1].isoformat() if linha[1] else None) for linha in linhas] == [
        ("Amoxicilina", None),
        ("Dipirona", _dia(-3)),
    ]


def test_posicao_defasada_e_apagao_sem_itens(conn, raw, portais):
    raw.coleta(portais[0])
    raw.estoque(portais[0], "a1", "1234", "Losartana 50mg", _dia(16))
    conn.commit()

    assert [(linha[0], linha[1]) for linha in _linhas(conn, portais[0])] == [("apagao", None)]


def test_limite_de_quinze_dias_e_inclusivo(conn, raw, portais):
    raw.coleta(portais[0])
    raw.estoque(portais[0], "a1", "1234", "Losartana 50mg", _dia(15))
    conn.commit()

    assert _status(conn, portais[0]) == ["conforme"]


def test_unidade_legada_parada_nao_contamina_nem_esconde_apagao(conn, raw, portais):
    portal_a, portal_b = portais
    raw.coleta(portal_a)
    raw.coleta(portal_b)
    # Portal A: uma unidade ativa e uma legada parada -> conforme, só itens da ativa.
    raw.estoque(portal_a, "a1", "1", "Ativo", _dia(2))
    raw.estoque(portal_a, "a2", "2", "Legado", _dia(900))
    # Portal B: apenas unidade legada -> apagão real.
    raw.estoque(portal_b, "b1", "2", "Legado", _dia(900))
    conn.commit()

    assert [(linha[0], linha[1]) for linha in _linhas(conn, portal_a)] == [("conforme", "Ativo")]
    assert [(linha[0], linha[1]) for linha in _linhas(conn, portal_b)] == [("apagao", None)]


def test_unidade_usa_apenas_sua_ultima_posicao(conn, raw, portais):
    raw.coleta(portais[0])
    raw.estoque(portais[0], "a1", "1", "Atual", _dia(1))
    raw.estoque(portais[0], "a2", "1", "Anterior", _dia(8))
    conn.commit()

    assert [linha[1] for linha in _linhas(conn, portais[0])] == ["Atual"]


def test_falha_de_coleta_ou_ausencia_de_coleta_e_indisponivel_nunca_apagao(conn, raw, portais):
    raw.coleta(portais[0], status="falha")
    raw.estoque(portais[0], "a1", "1234", "Losartana 50mg", _dia(2))
    conn.commit()

    assert _status(conn, portais[0]) == ["indisponivel"]
    assert _status(conn, portais[1]) == ["indisponivel"]


def test_coleta_antiga_e_indisponivel(conn, raw, portais):
    raw.coleta(portais[0], dias_atras=20)
    raw.estoque(portais[0], "a1", "1234", "Losartana 50mg", _dia(21))
    conn.commit()

    assert _status(conn, portais[0]) == ["indisponivel"]


def test_posicao_futura_nao_conta_como_vigente(conn, raw, portais):
    raw.coleta(portais[0])
    raw.estoque(portais[0], "a1", "1234", "Futuro", _dia(-5))
    conn.commit()

    assert [(linha[0], linha[1]) for linha in _linhas(conn, portais[0])] == [("apagao", None)]


def test_sem_nome_de_medicamento_nao_e_conforme(conn, raw, portais):
    raw.coleta(portais[0])
    raw.estoque(portais[0], "a1", "1234", None, _dia(2))
    conn.commit()

    assert _status(conn, portais[0]) == ["apagao"]


def test_coordenadas_da_unidade_sao_expostas_como_numeric(conn, raw, portais):
    raw.coleta(portais[0])
    raw.cnes(portais[0], "1234", "UBS Central")
    raw.estoque(portais[0], "a1", "1234", "Losartana", _dia(1))
    conn.commit()

    latitude, longitude = conn.execute(
        text("SELECT latitude_unidade, longitude_unidade FROM analytics.fct_farmacia_estoque WHERE portal_slug = :p"),
        {"p": portais[0]},
    ).one()
    assert (float(latitude), float(longitude)) == (-21.1234, -42.5678)


def test_varias_coletas_usam_apenas_a_mais_recente_sem_duplicar(conn, raw, portais):
    portal_a, _ = portais
    raw.coleta(portal_a, status="falha", dias_atras=1)
    raw.coleta(portal_a, hora="08:00:00")
    raw.coleta(portal_a, hora="18:00:00")
    raw.cnes(portal_a, "1234", "UBS Central")
    raw.estoque(portal_a, "a1", "1234", "Dipirona", _dia(1))
    raw.estoque(portal_a, "a2", "1234", "Dipirona", _dia(3))
    conn.commit()

    assert [(linha[0], linha[1]) for linha in _linhas(conn, portal_a)] == [("conforme", "Dipirona")]


def _executar_historico(pg, test_mode):
    from elt.conftest import _run_dbt

    _run_dbt(
        pg.url(),
        "run",
        "--select",
        "fct_farmacia_estoque_historico",
        "--vars",
        '{"test_mode": %s}' % ("true" if test_mode else "false"),
    )


def _historico(conn, portais):
    return [
        tuple(linha)
        for linha in conn.execute(
            text(
                "SELECT portal_slug, codigo_cnes, numero_lote, data_posicao_estoque, quantidade_estoque "
                "FROM analytics.fct_farmacia_estoque_historico WHERE portal_slug = ANY(:p) "
                "ORDER BY portal_slug, data_posicao_estoque, codigo_cnes NULLS FIRST, numero_lote NULLS FIRST"
            ),
            {"p": portais},
        )
    ]


def _estoque_com_lote(conn, portal, id_registro, cnes, lote, data_posicao, quantidade, data_coleta):
    conn.execute(
        text(
            f"INSERT INTO {_SCHEMA}.estoque_medicamentos (portal_slug, id_registro, codigo_cnes, nome_medicamento, "
            "numero_lote, quantidade_estoque, data_posicao_estoque, data_coleta) VALUES (:p, :i, :c, 'Dipirona', :l, :q, :d, :dc)"
        ),
        {"p": portal, "i": id_registro, "c": cnes, "l": lote, "q": quantidade, "d": data_posicao, "dc": data_coleta},
    )


@pytest.mark.usefixtures("raw")
def test_historico_de_estoque_soma_isola_portais_e_incremental_nao_duplica_nem_perde_dias(pg, conn, portais):
    portal_a, portal_b = portais
    d1, d2 = _dia(3), _dia(2)
    # Mesma chave logica (cnes 1234, sem lote, d1) em dois registros: somados. CNES e lote vazios saem NULL.
    _estoque_com_lote(conn, portal_a, "a1", "1234", None, d1, "5", f"{d1}T10:00:00")
    _estoque_com_lote(conn, portal_a, "a2", "01234", "", d1, "2", f"{d1}T10:00:00")
    _estoque_com_lote(conn, portal_a, "a3", None, "L1", d1, "4", f"{d1}T10:00:00")
    _estoque_com_lote(conn, portal_b, "a1", "1234", None, d1, "9", f"{d1}T10:00:00")
    conn.commit()
    try:
        _executar_historico(pg, test_mode=True)
        assert _historico(conn, [portal_a, portal_b]) == [
            (portal_a, None, "L1", date.fromisoformat(d1), 4),
            (portal_a, "1234", None, date.fromisoformat(d1), 7),
            (portal_b, "1234", None, date.fromisoformat(d1), 9),
        ]

        # Carga incremental: nova posicao e novo registro na chave logica ja existente (d1), reprocessada por inteiro.
        _estoque_com_lote(conn, portal_a, "a4", "1234", None, d2, "3", f"{d2}T10:00:00")
        _estoque_com_lote(conn, portal_a, "a5", "1234", None, d1, "1", f"{d2}T10:00:00")
        conn.commit()
        _executar_historico(pg, test_mode=False)
        _executar_historico(pg, test_mode=False)
        assert _historico(conn, [portal_a, portal_b]) == [
            (portal_a, None, "L1", date.fromisoformat(d1), 4),
            (portal_a, "1234", None, date.fromisoformat(d1), 8),
            (portal_a, "1234", None, date.fromisoformat(d2), 3),
            (portal_b, "1234", None, date.fromisoformat(d1), 9),
        ]
    finally:
        conn.rollback()
        for tabela in ("estoque_medicamentos",):
            conn.execute(text(f"DELETE FROM {_SCHEMA}.{tabela}"))
        conn.commit()
        _executar_historico(pg, test_mode=True)


def test_historico_de_estoque_tem_contrato_e_coletas_sao_listadas_por_portal(conn, raw, portais):
    portal_a, portal_b = portais
    raw.coleta(portal_a, dias_atras=1)
    raw.coleta(portal_a, status="falha")
    raw.coleta(portal_b)
    conn.commit()

    coletas = conn.execute(
        text(
            "SELECT portal_slug, status_coleta FROM analytics.fct_farmacia_coletas_historico ORDER BY portal_slug, status_coleta"
        )
    ).fetchall()
    assert [tuple(c) for c in coletas] == [(portal_a, "falha"), (portal_a, "sucesso"), (portal_b, "sucesso")]


def test_staging_data_impossivel_vira_nula_sem_quebrar_o_cast(conn, raw, portais):
    portal_a, _ = portais
    for id_registro, data_posicao in (
        ("d1", "2026-13-45"),
        ("d2", "31/02/2026"),
        ("d3", "2026-02-29"),
        ("d4", "15/10/2026"),
        ("d5", "2028-02-29"),
    ):
        raw.estoque(portal_a, id_registro, "1234", "Dipirona", data_posicao)
    conn.commit()

    linhas = conn.execute(
        text(
            "SELECT id_registro, data_posicao_estoque FROM analytics.stg_farmacia_sus__estoque_medicamentos "
            "WHERE portal_slug = :p ORDER BY id_registro"
        ),
        {"p": portal_a},
    ).fetchall()

    assert [(linha[0], linha[1] and linha[1].isoformat()) for linha in linhas] == [
        ("d1", None),
        ("d2", None),
        ("d3", None),
        ("d4", "2026-10-15"),
        ("d5", "2028-02-29"),
    ]


@pytest.mark.usefixtures("raw")
def test_staging_data_validade_e_convertida_e_invalida_vira_nula(conn, portais):
    portal_a, _ = portais
    for id_registro, validade in (("v1", "2027-12-30"), ("v2", "2026-13-45"), ("v3", None)):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.estoque_medicamentos (portal_slug, id_registro, nome_medicamento, "
                "data_posicao_estoque, data_validade) VALUES (:p, :i, 'Dipirona', :d, :v)"
            ),
            {"p": portal_a, "i": id_registro, "d": _dia(1), "v": validade},
        )
    conn.commit()

    linhas = conn.execute(
        text(
            "SELECT id_registro, data_validade FROM analytics.stg_farmacia_sus__estoque_medicamentos "
            "WHERE portal_slug = :p ORDER BY id_registro"
        ),
        {"p": portal_a},
    ).fetchall()

    assert [(linha[0], linha[1] and linha[1].isoformat()) for linha in linhas] == [
        ("v1", "2027-12-30"),
        ("v2", None),
        ("v3", None),
    ]
