from typing import Any

from elt.extract.base import EndpointConfig
from elt.extract.fiorilli.extractor import (
    DespesasExtractor,
    EmendasExtractor,
    LicitacoesExtractor,
    PessoalExtractor,
    ReceitasExtractor,
    TransferenciasExtractor,
)


def post_process_contratos(row: dict) -> dict:
    row.setdefault("numero", row.get("codigo", ""))
    proclic = row.get("proclic", "")
    row["licitacao_numero"] = str(proclic).split("/")[0] if proclic else ""
    row.setdefault("valor", row.get("valcon", ""))
    row.setdefault("data_inicio", row.get("vigeni", ""))
    row.setdefault("data_fim", row.get("vigenf", ""))
    return row


def post_process_pessoal(row: dict) -> dict:
    if "matricula" not in row or row["matricula"] is None:
        row["matricula"] = row.get("registro")
    return row


def post_process_despesas_extra_orcamentaria(row: dict) -> dict:
    if "numero" not in row or row["numero"] is None:
        row["numero"] = row.get("numeroguia") or row.get("codigo")
    return row


def post_process_despesas_gerais(row: dict) -> dict:
    if "numero" not in row or row["numero"] is None:
        row["numero"] = row.get("pkemp") or row.get("codigo")
    return row


def post_process_despesas_restos_pagar(row: dict) -> dict:
    if "numero" not in row or row["numero"] is None:
        row["numero"] = row.get("codigo")
    return row


def post_process_diarias(row: dict) -> dict:
    if "numero" not in row or row["numero"] is None:
        row["numero"] = row.get("ordempagamento") or row.get("nempg")
    return row


def post_process_emendas_cad(row: dict) -> dict:
    if "numero" not in row or row["numero"] is None:
        row["numero"] = row.get("numero_emenda") or row.get("pk_ep_emenda")
    return row


def post_process_receita_detalhes(row: dict) -> dict:
    if "codigo" not in row or row["codigo"] is None:
        row["codigo"] = row.get("nlanc") or row.get("codre")
    return row


def post_process_receita_orcamentaria(row: dict) -> dict:
    # Normaliza fontestn a partir de qualquer coluna de origem:
    # - API JSON exporta o campo como "fontestn"
    # - CSVs do portal exportam "Fonte STN" → sanitizado para "fonte_stn"
    # Linhas sem fonte (nós pai/subtotal) recebem string vazia como discriminador.
    if not row.get("fontestn"):
        row["fontestn"] = row.get("fonte_stn") or ""
    return row


def post_process_transferencias(row: dict) -> dict:
    if "codigo" not in row or row["codigo"] is None:
        row["codigo"] = row.get("dtlan") or f"{row.get('mes', '')}-{row.get('cnpjrecebedora', '')}"
    return row


def post_process_despesas_por_exigibilidade(row: dict) -> dict:
    if "tipo" not in row or row["tipo"] is None:
        row["tipo"] = row.get("tipolista")
    if "empenho" not in row or row["empenho"] is None:
        row["empenho"] = row.get("empenho") or row.get("numemp") or row.get("numero") or ""
    return row


# Aliases retrocompatíveis com prefixo _
_post_process_contratos = post_process_contratos
_post_process_pessoal = post_process_pessoal
_post_process_despesas_extra_orcamentaria = post_process_despesas_extra_orcamentaria
_post_process_despesas_gerais = post_process_despesas_gerais
_post_process_despesas_restos_pagar = post_process_despesas_restos_pagar
_post_process_diarias = post_process_diarias
_post_process_emendas_cad = post_process_emendas_cad
_post_process_receita_detalhes = post_process_receita_detalhes
_post_process_receita_orcamentaria = post_process_receita_orcamentaria
_post_process_transferencias = post_process_transferencias
_post_process_despesas_por_exigibilidade = post_process_despesas_por_exigibilidade


def get_endpoint_configs(
    base_url: str,
    portal_slug: str = "",
    cod_ibge: int | None = None,  # noqa: ARG001
    ano_inicial: int | None = None,  # noqa: ARG001
) -> list[EndpointConfig]:
    """Retorna a lista de EndpointConfig parametrizada com a URL e slug da prefeitura."""
    extra_common: dict[str, Any] = {}
    return [
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasPorOrgao",
            table="despesas_por_orgao",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False", **extra_common},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasPorUnidade",
            table="despesas_por_unidade",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasPorFornecedor",
            table="despesas_por_fornecedor",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostrarFornecedor": "True", "MostraDadosConsolidado": "False"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasGerais",
            table="despesas_gerais",
            key_cols=["ano", "empresa", "numero"],
            extra={
                "MostrarFornecedor": "True",
                "MostrarCNPJFornecedor": "True",
                "UFParaFiltroCOVID": "",
                "ApenasIDEmpenho": "False",
            },
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_despesas_gerais,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasRestosPagar",
            table="despesas_restos_pagar",
            key_cols=["ano", "empresa", "numero"],
            extra={"ApresentaNomeFavorecido": "True", "MostraDadosConsolidado": "False"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_despesas_restos_pagar,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasExtraOrcamentaria",
            table="despesas_extra_orcamentaria",
            key_cols=["ano", "empresa", "numero"],
            extra={"ApresentaNomeFavorecido": "True", "MostraDadosConsolidado": "False"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_despesas_extra_orcamentaria,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasporExigibilidade",
            table="despesas_por_exigibilidade_1",
            key_cols=["ano", "empresa", "tipo", "empenho"],
            extra={"MostraDadosConsolidado": "False", "strTipoLista": "1"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_despesas_por_exigibilidade,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="DespesasporExigibilidade",
            table="despesas_por_exigibilidade_2",
            key_cols=["ano", "empresa", "tipo", "empenho"],
            extra={"MostraDadosConsolidado": "False", "strTipoLista": "2"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_despesas_por_exigibilidade,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Despesas/",
            listagem="Diarias",
            table="diarias",
            key_cols=["ano", "empresa", "numero"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=DespesasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_diarias,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Receitas/",
            listagem="ReceitaOrcamentaria",
            table="receita_orcamentaria",
            key_cols=["ano", "empresa", "codigo", "fontestn"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=ReceitasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_receita_orcamentaria,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Receitas/",
            listagem="ReceitaUniao",
            table="receita_uniao",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=ReceitasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Receitas/",
            listagem="ReceitaEstado",
            table="receita_estado",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=ReceitasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Receitas/",
            listagem="ReceitaExtraOrcamentaria",
            table="receita_extra_orcamentaria",
            key_cols=["ano", "empresa", "codigo", "dtlan", "descricao", "valor"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=ReceitasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Receitas/",
            listagem="DetalhesReceitaOrcamentaria",
            table="receita_detalhes",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=ReceitasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_receita_detalhes,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/LicitacoesEContratos/",
            listagem="Licitacoes",
            table="licitacoes",
            key_cols=["ano", "empresa", "numero"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=LicitacoesExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/LicitacoesEContratos/",
            listagem="Contratos",
            table="contratos",
            key_cols=["ano", "empresa", "numero"],
            extra={"ContratosApenasPublicados": "False", "MostraDadosConsolidado": "False"},
            extractor_cls=LicitacoesExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_contratos,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Transferencias/",
            listagem="Transf",
            table="transferencias",
            key_cols=["ano", "empresa", "codigo"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=TransferenciasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_transferencias,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Transferencias/",
            listagem="EmendasImpositivasArt166A",
            table="emendas_impositivas",
            key_cols=["ano", "empresa", "numero"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=EmendasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Transferencias/",
            listagem="CadEmendasImpositivas",
            table="emendas_cad",
            key_cols=["ano", "empresa", "numero"],
            extra={"MostraDadosConsolidado": "False"},
            extractor_cls=EmendasExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_emendas_cad,
        ),
        EndpointConfig(
            base_path="/Transparencia/VersaoJson/Pessoal/",
            listagem="Servidores",
            table="pessoal",
            key_cols=["ano", "empresa", "mes", "matricula"],
            extra={},
            extractor_cls=PessoalExtractor,
            base_url=base_url,
            portal_slug=portal_slug,
            post_process=post_process_pessoal,
        ),
    ]


ENDPOINT_NAMES: list[str] = [
    "DespesasPorOrgao",
    "DespesasPorUnidade",
    "DespesasPorFornecedor",
    "DespesasGerais",
    "DespesasRestosPagar",
    "DespesasExtraOrcamentaria",
    "DespesasporExigibilidade",
    "Diarias",
    "ReceitaOrcamentaria",
    "ReceitaUniao",
    "ReceitaEstado",
    "ReceitaExtraOrcamentaria",
    "DetalhesReceitaOrcamentaria",
    "Licitacoes",
    "Contratos",
    "Transf",
    "EmendasImpositivasArt166A",
    "CadEmendasImpositivas",
    "Servidores",
]
