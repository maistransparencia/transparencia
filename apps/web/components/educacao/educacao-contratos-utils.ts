import type {
  ContratoServicoVigente,
  EducacaoCategoriaContrato,
  EducacaoContratoDTO,
} from "@transparencia/db";

export function formatCategoriaLabel(cat: EducacaoCategoriaContrato): string {
  if (cat === "merenda_pnae") return "Merenda Escolar (PNAE)";
  if (cat === "transporte_pnate") return "Transporte Escolar (PNATE)";
  if (cat === "manutencao_geral") return "Manutenção & Infraestrutura";
  if (cat === "locacao_imoveis") return "Locação de Imóveis";
  return "Outros Suprimentos & Serviços";
}

export function educacaoDtoToContratoServicoVigente(
  c: EducacaoContratoDTO,
): ContratoServicoVigente {
  const percentualPago =
    c.totalEmpenhado > 0 ? (c.totalPago / c.totalEmpenhado) * 100 : 0;
  const statusExecucao = (() => {
    if (c.totalPago >= c.totalEmpenhado && c.totalEmpenhado > 0) {
      return "concluido";
    }
    if (c.totalEmpenhado > 0 && c.totalPago === 0) {
      return "inexecutado";
    }
    return "em_execucao";
  })();

  return {
    contratoServicoId: c.contratoId,
    portalSlug: c.portalSlug,
    empresaId: c.empresaId,
    orgaoNome: c.orgaoNome,
    ano: c.ano,
    contratoNumero: c.contratoNumero,
    licitacaoNumero: c.licitacaoNumero,
    licitacaoAno: c.ano,
    fontePrincipal: c.fontePrincipal,
    fontesRecursos: c.fontesRecursos,
    programaNome: c.principalPrograma,
    projetoAtividadeNome: c.principalAcao,
    funcaoNome: c.principalFuncao,
    fornecedorNome: c.fornecedorNome,
    fornecedorCnpj: c.fornecedorCpfCnpj ?? "",
    objetoDescricao: c.objeto,
    dataInicio: c.dataInicio,
    vencimentoAtual: c.vencimentoAtual,
    valorContrato: c.valorContrato,
    valorAditado: c.valorAditado,
    totalEmpenhado: c.totalEmpenhado,
    totalLiquidado: c.totalLiquidado,
    totalPago: c.totalPago,
    saldoPendente: c.saldoAPagar,
    percentualPago,
    statusExecucao,
  };
}

export function formatStatusExecucaoLabel(
  statusExecucao: ContratoServicoVigente["statusExecucao"],
): string {
  if (statusExecucao === "inexecutado") return "Não Executado";
  if (statusExecucao === "concluido") return "Concluído";
  return "Em Execução";
}
