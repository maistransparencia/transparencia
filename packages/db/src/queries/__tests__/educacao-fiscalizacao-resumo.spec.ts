import { describe, expect, it } from "vitest";
import { resumirFiscalizacaoEducacao } from "../educacao-fiscalizacao-resumo";

describe("resumirFiscalizacaoEducacao", () => {
  it("conta e soma exatamente o que as seções exibem", () => {
    const resumo = resumirFiscalizacaoEducacao({
      emendas: {
        lista: [{}, {}, {}] as never,
        totalAutorizado: 2_000_000,
        totalEmpenhado: 500_000,
        totalRecebidoFundo: 1_000_000,
      },
      contratos: [
        { valorContrato: 100, categoria: "merenda" },
        { valorContrato: 250.5, categoria: "transporte" },
      ] as never,
      topFornecedores: [{ totalPago: 40 }, { totalPago: 60 }],
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
      contratos: {
        quantidade: 2,
        quantidadeCategorias: 2,
        valorTotalContratos: 350.5,
      },
      fornecedores: { quantidade: 2, totalPago: 100 },
    });
  });

  it("zera tudo sem dados", () => {
    const resumo = resumirFiscalizacaoEducacao({
      emendas: {
        lista: [],
        totalAutorizado: 0,
        totalEmpenhado: 0,
        totalRecebidoFundo: 0,
      },
      contratos: [],
      topFornecedores: [],
    });
    expect(resumo.emendas.percentualEmpenhado).toBe(0);
    expect(resumo.emendas.percentualConfirmadaNaReceita).toBe(0);
    expect(resumo.contratos).toEqual({
      quantidade: 0,
      quantidadeCategorias: 0,
      valorTotalContratos: 0,
    });
    expect(resumo.fornecedores).toEqual({ quantidade: 0, totalPago: 0 });
  });

  it("não trava o percentual em 100 quando a receita passa do autorizado", () => {
    const resumo = resumirFiscalizacaoEducacao({
      emendas: {
        lista: [],
        totalAutorizado: 1_000,
        totalEmpenhado: 0,
        totalRecebidoFundo: 1_500,
      },
      contratos: [],
      topFornecedores: [],
    });
    expect(resumo.emendas.percentualConfirmadaNaReceita).toBe(150);
  });
});
