import csv

from elt.extract.saude_datasus import CAMINHO_FONTES, _ler_configuracao, carregar_fontes

CAMINHO_PORTAIS = CAMINHO_FONTES.parents[1] / "transform" / "seeds" / "seed_portais.csv"


def _ufs_dos_portais() -> set[str]:
    with CAMINHO_PORTAIS.open(encoding="utf-8", newline="") as arquivo:
        return {linha["uf"] for linha in csv.DictReader(arquivo)}


def test_toda_uf_dos_portais_tem_fonte_ou_decisao_explicita():
    configuradas = {fonte.uf for fonte in carregar_fontes()}
    sem_fonte = {item["uf"] for item in _ler_configuracao(CAMINHO_FONTES).get("ufs_sem_fonte", [])}
    faltando = _ufs_dos_portais() - configuradas - sem_fonte
    assert not faltando, (
        f"UF sem decisão sobre a fonte do DATASUS: {sorted(faltando)}. "
        "Adicione uma entrada em `fontes` ou em `ufs_sem_fonte` (com motivo) em elt/fontes/saude_datasus.yml"
    )


def test_uf_sem_fonte_tem_motivo_e_nao_duplica_fonte_configurada():
    configuradas = {fonte.uf for fonte in carregar_fontes()}
    itens = _ler_configuracao(CAMINHO_FONTES).get("ufs_sem_fonte", [])
    assert all(item.get("motivo") for item in itens)
    assert not configuradas & {item["uf"] for item in itens}


def test_toda_fonte_configurada_tem_as_quatro_fontes_com_os_campos_do_modelo_comum():
    obrigatorios = {
        "leitos": {"municipio", "competencia", "tipo_leito", "leitos_existentes", "leitos_sus"},
        "profissionais": {"municipio", "competencia", "pessoa", "atende_sus"},
        "sia": {"municipio", "competencia", "quantidade"},
        "sih": {"municipio", "ano", "mes"},
    }
    for fonte in carregar_fontes():
        for nome, campos in obrigatorios.items():
            assert campos <= set(getattr(fonte, nome).campos), (fonte.uf, nome)
