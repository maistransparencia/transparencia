"""CLI de análise. Uso: uv run python -m elt.analysis <comando> (apenas banco local por padrão).

Comandos:
  desempenho --saida arquivo.json [--repeticoes 3]   mede o tempo de leitura de cada modelo
  comparar antes.json depois.json                    lista variações de tempo e regressões
  fornecedores                                       cobertura, ligações e impacto do nome canônico
"""

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from elt.analysis import desempenho, fornecedores
from elt.analysis.conexao import conectar


def _imprimir_json(dados: object) -> None:
    print(json.dumps(dados, indent=2, ensure_ascii=False, default=str))


def _comando_desempenho(argumentos: argparse.Namespace) -> None:
    conexao = conectar(os.environ["DATABASE_URL"], argumentos.permitir_remoto)
    medicoes = desempenho.medir_todos(conexao, argumentos.repeticoes)
    desempenho.salvar(medicoes, argumentos.saida)
    print(f"{len(medicoes)} modelos medidos em {argumentos.saida}")


def _comando_comparar(argumentos: argparse.Namespace) -> None:
    linhas = desempenho.comparar(desempenho.carregar(argumentos.antes), desempenho.carregar(argumentos.depois))
    for linha in linhas:
        razao = "n/d" if linha["razao"] is None else f"{linha['razao']:.2f}x"
        marca = "REGRESSAO" if linha["regressao"] else ""
        print(
            f"{linha['modelo']:55} {linha['tipo_antes']:>6}->{linha['tipo_depois']:<6} "
            f"{linha['tempo_antes_ms']:>10.1f}ms -> {linha['tempo_depois_ms']:>10.1f}ms {razao:>8} {marca}"
        )
    if any(linha["regressao"] for linha in linhas):
        sys.exit(1)


def _comando_fornecedores(argumentos: argparse.Namespace) -> None:
    conexao = conectar(os.environ["DATABASE_URL"], argumentos.permitir_remoto)
    _imprimir_json(
        {
            "cobertura": fornecedores.cobertura(conexao),
            "ligacoes": fornecedores.ligacoes(conexao),
            "nomes_divergentes": fornecedores.nomes_divergentes(conexao),
            "impacto_classificadores": fornecedores.impacto_classificadores(conexao),
            "impacto_siglas_dos_portais": fornecedores.impacto_siglas_dos_portais(conexao),
        }
    )


def main() -> None:
    load_dotenv()
    analisador = argparse.ArgumentParser(
        prog="elt.analysis", description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    analisador.add_argument(
        "--permitir-remoto", action="store_true", help="permite banco não local (exige autorização explícita)"
    )
    subcomandos = analisador.add_subparsers(dest="comando", required=True)

    parser_desempenho = subcomandos.add_parser("desempenho")
    parser_desempenho.add_argument("--saida", type=Path, required=True)
    parser_desempenho.add_argument("--repeticoes", type=int, default=3)
    parser_desempenho.set_defaults(executar=_comando_desempenho)

    parser_comparar = subcomandos.add_parser("comparar")
    parser_comparar.add_argument("antes", type=Path)
    parser_comparar.add_argument("depois", type=Path)
    parser_comparar.set_defaults(executar=_comando_comparar)

    parser_fornecedores = subcomandos.add_parser("fornecedores")
    parser_fornecedores.set_defaults(executar=_comando_fornecedores)

    argumentos = analisador.parse_args()
    argumentos.executar(argumentos)


if __name__ == "__main__":
    main()
