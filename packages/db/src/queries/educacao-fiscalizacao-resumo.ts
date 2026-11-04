import type { FornecedorExecucaoItemDTO } from "./despesas-metrics";
import type { EducacaoContratoDTO } from "./educacao-metrics";
import type { EmendasEducacaoStatsDTO } from "./emendas-parlamentares";

export interface EducacaoFiscalizacaoResumoDTO {
  emendas: {
    quantidade: number;
    totalAutorizado: number;
    totalConfirmadaNaReceita: number;
    totalEmpenhado: number;
    /** Sobre o autorizado, igual ao da seção completa de emendas. */
    percentualConfirmadaNaReceita: number;
    /** Sobre o autorizado. */
    percentualEmpenhado: number;
  };
  contratos: { quantidade: number; valorTotalContratos: number };
  fornecedores: { quantidade: number; totalPago: number };
}

export interface EducacaoFiscalizacaoResumoEntrada {
  emendas: Pick<
    EmendasEducacaoStatsDTO,
    "lista" | "totalAutorizado" | "totalEmpenhado" | "totalRecebidoFundo"
  >;
  contratos: Pick<EducacaoContratoDTO, "valorContrato">[];
  topFornecedores: Pick<FornecedorExecucaoItemDTO, "totalPago">[];
}

/**
 * Números que a seção recolhida mostra no resumo. Só reagrupa o que a página
 * já exibe dentro da seção, para o resumo e o conteúdo nunca divergirem.
 */
const percentualDoAutorizado = (valor: number, autorizado: number) =>
  autorizado > 0 ? Math.max(0, (valor / autorizado) * 100) : 0;

export function resumirFiscalizacaoEducacao(
  entrada: EducacaoFiscalizacaoResumoEntrada,
): EducacaoFiscalizacaoResumoDTO {
  return {
    emendas: {
      quantidade: entrada.emendas.lista.length,
      totalAutorizado: entrada.emendas.totalAutorizado,
      totalConfirmadaNaReceita: entrada.emendas.totalRecebidoFundo ?? 0,
      totalEmpenhado: entrada.emendas.totalEmpenhado,
      percentualConfirmadaNaReceita: percentualDoAutorizado(
        entrada.emendas.totalRecebidoFundo ?? 0,
        entrada.emendas.totalAutorizado,
      ),
      percentualEmpenhado: percentualDoAutorizado(
        entrada.emendas.totalEmpenhado,
        entrada.emendas.totalAutorizado,
      ),
    },
    contratos: {
      quantidade: entrada.contratos.length,
      valorTotalContratos: entrada.contratos.reduce(
        (total, contrato) => total + (contrato.valorContrato || 0),
        0,
      ),
    },
    fornecedores: {
      quantidade: entrada.topFornecedores.length,
      totalPago: entrada.topFornecedores.reduce(
        (total, fornecedor) => total + (fornecedor.totalPago || 0),
        0,
      ),
    },
  };
}
