import type { FornecedorExecucaoItemDTO } from "./despesas-metrics";
import type { EducacaoContratoDTO } from "./educacao-metrics";
import type { EmendasEducacaoStatsDTO } from "./emendas-parlamentares";

export interface EducacaoFiscalizacaoResumoDTO {
  emendas: { quantidade: number; totalAutorizado: number };
  contratos: { quantidade: number; valorTotalContratos: number };
  fornecedores: { quantidade: number; totalPago: number };
}

export interface EducacaoFiscalizacaoResumoEntrada {
  emendas: Pick<EmendasEducacaoStatsDTO, "lista" | "totalAutorizado">;
  contratos: Pick<EducacaoContratoDTO, "valorContrato">[];
  topFornecedores: Pick<FornecedorExecucaoItemDTO, "totalPago">[];
}

/**
 * Números que a seção recolhida mostra no resumo. Só reagrupa o que a página
 * já exibe dentro da seção, para o resumo e o conteúdo nunca divergirem.
 */
export function resumirFiscalizacaoEducacao(
  entrada: EducacaoFiscalizacaoResumoEntrada,
): EducacaoFiscalizacaoResumoDTO {
  return {
    emendas: {
      quantidade: entrada.emendas.lista.length,
      totalAutorizado: entrada.emendas.totalAutorizado,
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
