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

    def coleta(portal, status="sucesso", dias_atras=0):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.coletas (portal_slug, status_coleta, total_registros_estoque, data_coleta) "
                "VALUES (:p, :s, '0', :d)"
            ),
            {"p": portal, "s": status, "d": _dia(dias_atras)},
        )

    def estoque(portal, id_registro, cnes, medicamento, data_posicao, quantidade="10"):
        conn.execute(
            text(
                f"INSERT INTO {_SCHEMA}.estoque_medicamentos "
                "(portal_slug, id_registro, codigo_cnes, nome_medicamento, quantidade_estoque, data_posicao_estoque) "
                "VALUES (:p, :i, :c, :m, :q, :d)"
            ),
            {"p": portal, "i": id_registro, "c": cnes, "m": medicamento, "q": quantidade, "d": data_posicao},
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
