import { describe, expect, it } from "vitest";
import { resumirFiscalizacaoEducacao } from "../educacao-fiscalizacao-resumo";

describe("resumirFiscalizacaoEducacao", () => {
  it("conta e soma exatamente o que as seções exibem", () => {
    const resumo = resumirFiscalizacaoEducacao({
      emendas: {
        lista: [{}, {}, {}] as never,
        totalAutorizado: 2_100_000,
      },
      contratos: [{ valorContrato: 100 }, { valorContrato: 250.5 }],
      topFornecedores: [{ totalPago: 40 }, { totalPago: 60 }],
    });
    expect(resumo).toEqual({
      emendas: { quantidade: 3, totalAutorizado: 2_100_000 },
      contratos: { quantidade: 2, valorTotalContratos: 350.5 },
      fornecedores: { quantidade: 2, totalPago: 100 },
    });
  });

  it("zera tudo sem dados", () => {
    const resumo = resumirFiscalizacaoEducacao({
      emendas: { lista: [], totalAutorizado: 0 },
      contratos: [],
      topFornecedores: [],
    });
    expect(resumo.contratos).toEqual({ quantidade: 0, valorTotalContratos: 0 });
    expect(resumo.fornecedores).toEqual({ quantidade: 0, totalPago: 0 });
  });
});
