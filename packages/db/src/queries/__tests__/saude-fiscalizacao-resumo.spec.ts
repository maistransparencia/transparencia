import { describe, expect, it } from "vitest";
import { resumirFiscalizacaoSaude } from "../saude-fiscalizacao-resumo";

describe("resumirFiscalizacaoSaude", () => {
  it("conta e soma exatamente o que as seções exibem", () => {
    const resumo = resumirFiscalizacaoSaude({
      emendas: {
        lista: [{}, {}, {}] as never,
        totalAutorizado: 2_000_000,
        totalEmpenhado: 500_000,
        totalRecebidoFundo: 1_000_000,
      },
      caminhosContratacao: [
        {
          tipoContratacao: "licitacao_propria",
          quantidade: 7,
          valorEmpenhado: 900,
        },
        {
          tipoContratacao: "gap_licitacao",
          quantidade: 2,
          valorEmpenhado: 100,
        },
      ],
      quantidadeLicitacoesEmAndamento: 4,
      topFornecedores: [{ totalPago: 40 }, { totalPago: 60 }],
      totalPagoFundo: 400,
    });
    expect(resumo).toEqual({
      emendas: {
        quantidade: 3,
        totalAutorizado: 2_000_000,
        totalConfirmadaNaReceita: 1_000_000,
        totalEmpenhado: 500_000,
        percentualConfirmadaNaReceita: 50,
        percentualEmpenhado: 25,
      },
      contratacao: {
        quantidadeLicitacoesProprias: 7,
        totalEmpenhadoLicitacoesProprias: 900,
        quantidadeLicitacoesEmAndamento: 4,
      },
      fornecedores: { quantidade: 2, totalPago: 100, percentualTotalPago: 25 },
    });
  });

  it("zera tudo sem dados", () => {
    const resumo = resumirFiscalizacaoSaude({
      emendas: {
        lista: [],
        totalAutorizado: 0,
        totalEmpenhado: 0,
        totalRecebidoFundo: 0,
      },
      caminhosContratacao: [],
      quantidadeLicitacoesEmAndamento: 0,
      topFornecedores: [],
      totalPagoFundo: 0,
    });
    expect(resumo.emendas.percentualEmpenhado).toBe(0);
    expect(resumo.contratacao).toEqual({
      quantidadeLicitacoesProprias: 0,
      totalEmpenhadoLicitacoesProprias: 0,
      quantidadeLicitacoesEmAndamento: 0,
    });
    expect(resumo.fornecedores).toEqual({
      quantidade: 0,
      totalPago: 0,
      percentualTotalPago: 0,
    });
  });
});
