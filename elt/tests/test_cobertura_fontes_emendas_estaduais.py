import csv

import yaml

from elt.extract.emendas_estaduais import CAMINHO_FONTES, carregar_fontes

CAMINHO_PORTAIS = CAMINHO_FONTES.parents[1] / "transform" / "seeds" / "seed_portais.csv"


def _ufs_dos_portais() -> set[str]:
    with CAMINHO_PORTAIS.open(encoding="utf-8", newline="") as arquivo:
        return {linha["uf"] for linha in csv.DictReader(arquivo)}


def test_toda_uf_dos_portais_tem_fonte_ou_decisao_explicita():
    configuradas = {fonte.uf for fonte in carregar_fontes()}
    dados = yaml.safe_load(CAMINHO_FONTES.read_text(encoding="utf-8")) or {}
    sem_fonte = {item["uf"] for item in dados.get("ufs_sem_fonte", [])}
    faltando = _ufs_dos_portais() - configuradas - sem_fonte
    assert not faltando, (
        f"UF sem decisão sobre emendas estaduais: {sorted(faltando)}. "
        "Adicione uma entrada em `fontes` ou em `ufs_sem_fonte` (com motivo) em elt/fontes/emendas_estaduais.yml"
    )


def test_uf_sem_fonte_tem_motivo_e_nao_duplica_fonte_configurada():
    configuradas = {fonte.uf for fonte in carregar_fontes()}
    dados = yaml.safe_load(CAMINHO_FONTES.read_text(encoding="utf-8")) or {}
    itens = dados.get("ufs_sem_fonte", [])
    assert all(item.get("motivo") for item in itens)
    assert not configuradas & {item["uf"] for item in itens}
