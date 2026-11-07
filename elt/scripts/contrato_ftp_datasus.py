"""Teste de contrato do FTP do DATASUS a partir do ambiente da carga (GitHub Actions, ubuntu-latest).

Mede, para cada UF configurada: conexão e listagem de cada pasta, download, descompactação e leitura de cada arquivo da
competência, espaço em disco usado e livre, e quantas repetições o cliente precisou. Não grava nada no banco e não
registra dado pessoal: só tempos, tamanhos e contagens. Saída em tabela Markdown (e no resumo do job, se houver).
"""

import argparse
import logging
import os
import shutil
import time
from pathlib import Path

from elt.extract import saude_datasus as ds

LINHAS: list[str] = []


def _registrar(texto: str) -> None:
    print(texto, flush=True)
    LINHAS.append(texto)


def medir_uf(fonte: ds.FonteDatasus, competencia: int, repeticoes: int) -> None:
    esperas: list[float] = []

    def dormir(segundos: float) -> None:
        esperas.append(segundos)
        time.sleep(segundos)

    inicio = time.monotonic()
    with ds.ClienteFtp(fonte.host, dormir=dormir) as cliente:
        _registrar(f"\n### {fonte.uf} {competencia} ({fonte.host})\n")
        _registrar("| Etapa | Arquivo | Tamanho baixado (MB) | Tamanho do .dbf (MB) | Segundos | Livre em disco (GB) |")
        _registrar("|---|---|---|---|---|---|")
        for nome_fonte in ("leitos", "profissionais", "sia", "sih"):
            arquivo = getattr(fonte, nome_fonte)
            t0 = time.monotonic()
            listagem = cliente.listar(arquivo.pasta)
            _registrar(
                f"| listar {nome_fonte} | {len(listagem)} nomes | | | {time.monotonic() - t0:.1f} | "
                f"{shutil.disk_usage('/').free / 1e9:.1f} |"
            )
            for nome in ds.arquivos_da_competencia(listagem, arquivo, fonte.uf, competencia):
                with ds.pasta_temporaria() as pasta:
                    t0 = time.monotonic()
                    cliente.baixar(arquivo.pasta, nome, pasta / nome)
                    baixado = (pasta / nome).stat().st_size / 1e6
                    t_download = time.monotonic() - t0
                    t0 = time.monotonic()
                    import datasus_dbc

                    dbf = pasta / (Path(nome).stem + ".dbf")
                    datasus_dbc.decompress(str(pasta / nome), str(dbf))
                    t_descompactar = time.monotonic() - t0
                    t0 = time.monotonic()
                    linhas = sum(1 for _ in ds._linhas_dbf(dbf, fonte.codificacao))
                    t_leitura = time.monotonic() - t0
                    livre = shutil.disk_usage(pasta).free / 1e9
                    _registrar(f"| download {nome_fonte} | {nome} | {baixado:.1f} | | {t_download:.1f} | {livre:.1f} |")
                    _registrar(
                        f"| descompactar {nome_fonte} | {nome} | | {dbf.stat().st_size / 1e6:.1f} | {t_descompactar:.1f} | {livre:.1f} |"
                    )
                    _registrar(f"| ler {nome_fonte} | {nome} ({linhas} linhas) | | | {t_leitura:.1f} | {livre:.1f} |")
        # repetição: a mesma listagem e o menor arquivo de novo, sem cache, para ver a estabilidade
        menor = fonte.leitos
        for tentativa in range(1, repeticoes + 1):
            with ds.ClienteFtp(fonte.host) as novo:
                t0 = time.monotonic()
                nomes = ds.arquivos_da_competencia(novo.listar(menor.pasta), menor, fonte.uf, competencia)
                with ds.pasta_temporaria() as pasta:
                    for nome in nomes:
                        novo.baixar(menor.pasta, nome, pasta / nome)
                _registrar(
                    f"| repetição {tentativa} (conexão nova, listar e baixar leitos) | | | | {time.monotonic() - t0:.1f} | |"
                )
    _registrar(
        f"\nRepetições com espera no cliente: {len(esperas)}. Tempo total da UF: {time.monotonic() - inicio:.0f} s."
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--competencia", type=int, required=True)
    parser.add_argument("--repeticoes", type=int, default=3)
    args = parser.parse_args()
    for fonte in ds.carregar_fontes():
        medir_uf(fonte, args.competencia, args.repeticoes)
    resumo = os.environ.get("GITHUB_STEP_SUMMARY")
    if resumo:
        Path(resumo).write_text("\n".join(LINHAS) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
