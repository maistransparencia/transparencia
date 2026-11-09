import type { FornecedorExecucaoItemDTO } from "./despesas-metrics";
import type { EmendasEducacaoStatsDTO } from "./emendas-parlamentares";
import type { CaminhoContratacaoSaudeDTO } from "./historia-saude-metrics";

export interface SaudeFiscalizacaoResumoDTO {
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
  contratacao: {
    quantidadeLicitacoesProprias: number;
    /** Empenhado nas licitações próprias; os caminhos se sobrepõem e não se somam. */
    totalEmpenhadoLicitacoesProprias: number;
    quantidadeLicitacoesEmAndamento: number;
  };
  fornecedores: {
    quantidade: number;
    totalPago: number;
    /** Parte do total pago pelo Fundo que foi para esses fornecedores. */
    percentualTotalPago: number;
  };
}

export interface SaudeFiscalizacaoResumoEntrada {
  emendas: Pick<
    EmendasEducacaoStatsDTO,
    "lista" | "totalAutorizado" | "totalEmpenhado" | "totalRecebidoFundo"
  >;
  caminhosContratacao: Pick<
    CaminhoContratacaoSaudeDTO,
    "tipoContratacao" | "quantidade" | "valorEmpenhado"
  >[];
  quantidadeLicitacoesEmAndamento: number;
  topFornecedores: Pick<FornecedorExecucaoItemDTO, "totalPago">[];
  /** Total pago pelo Fundo, base do percentual dos maiores fornecedores. */
  totalPagoFundo: number;
}

const percentualDe = (valor: number, base: number) =>
  base > 0 ? Math.max(0, (valor / base) * 100) : 0;

/**
 * Números que a seção recolhida mostra no resumo. Só reagrupa o que a página
 * já exibe dentro da seção, para o resumo e o conteúdo nunca divergirem.
 */
export function resumirFiscalizacaoSaude(
  entrada: SaudeFiscalizacaoResumoEntrada,
): SaudeFiscalizacaoResumoDTO {
  const totalRecebido = entrada.emendas.totalRecebidoFundo ?? 0;
  const licitacaoPropria = entrada.caminhosContratacao.find(
    (caminho) => caminho.tipoContratacao === "licitacao_propria",
  );
  const totalPagoFornecedores = entrada.topFornecedores.reduce(
    (total, fornecedor) => total + (fornecedor.totalPago || 0),
    0,
  );

  return {
    emendas: {
      quantidade: entrada.emendas.lista.length,
      totalAutorizado: entrada.emendas.totalAutorizado,
      totalConfirmadaNaReceita: totalRecebido,
      totalEmpenhado: entrada.emendas.totalEmpenhado,
      percentualConfirmadaNaReceita: percentualDe(
        totalRecebido,
        entrada.emendas.totalAutorizado,
      ),
      percentualEmpenhado: percentualDe(
        entrada.emendas.totalEmpenhado,
        entrada.emendas.totalAutorizado,
      ),
    },
    contratacao: {
      quantidadeLicitacoesProprias: licitacaoPropria?.quantidade ?? 0,
      totalEmpenhadoLicitacoesProprias: licitacaoPropria?.valorEmpenhado ?? 0,
      quantidadeLicitacoesEmAndamento: entrada.quantidadeLicitacoesEmAndamento,
    },
    fornecedores: {
      quantidade: entrada.topFornecedores.length,
      totalPago: totalPagoFornecedores,
      percentualTotalPago: Math.min(
        100,
        percentualDe(totalPagoFornecedores, entrada.totalPagoFundo),
      ),
    },
  };
}
