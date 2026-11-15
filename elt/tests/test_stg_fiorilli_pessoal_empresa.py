"""O staging único da folha remapeia o código de entidade pelo seed, por portal, sem literal no SQL."""

import pytest
from sqlalchemy import text

_ANO = "2043"

# (portal_slug, empresa, matricula): mesma chave de origem em dois portais
_LINHAS = [
    ("porciuncula_prefeitura", "001", "m1"),
    ("porciuncula_prefeitura", "000", "m2"),
    ("natividade_prefeitura", "001", "m1"),
    ("natividade_prefeitura", "000", "m2"),
]


@pytest.fixture
def seed_pessoal(conn):
    def limpar():
        conn.execute(text("DELETE FROM raw_fiorilli.pessoal WHERE ano = :ano"), {"ano": _ANO})
        conn.commit()

    limpar()
    for portal_slug, empresa, matricula in _LINHAS:
        conn.execute(
            text(
                """
                INSERT INTO raw_fiorilli.pessoal (portal_slug, ano, empresa, mes, matricula, proventos)
                VALUES (:portal_slug, :ano, :empresa, '1', :matricula, '100,00')
                """
            ),
            {"portal_slug": portal_slug, "ano": _ANO, "empresa": empresa, "matricula": matricula},
        )
    conn.commit()
    yield
    limpar()


@pytest.mark.usefixtures("seed_pessoal")
def test_codigo_de_entidade_segue_o_mapeamento_de_cada_portal(conn):
    rows = conn.execute(
        text(
            """
            SELECT portal_slug, matricula, empresa_id
            FROM stg_fiorilli__pessoal
            WHERE ano = :ano
            """
        ),
        {"ano": int(_ANO)},
    ).all()
    # empresa_id é recalculado com max(mes) por portal/ano/empresa; ambas as matrículas ficam no mês 1
    assert {(r.portal_slug, r.matricula): r.empresa_id for r in rows} == {
        ("porciuncula_prefeitura", "m1"): "7",
        ("porciuncula_prefeitura", "m2"): "7",
        ("natividade_prefeitura", "m1"): "1",
        ("natividade_prefeitura", "m2"): "6",
    }
