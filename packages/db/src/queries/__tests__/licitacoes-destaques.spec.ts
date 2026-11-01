import { describe, expect, it } from "vitest";
import { somarEmpenhadoContratosVigentes } from "../contratos-servicos-vigentes";
import { contarLicitacoesAtivas } from "../licitacoes-metrics";

describe("contarLicitacoesAtivas", () => {
  it("conta em andamento e abertas, ignorando as demais", () => {
    expect(
      contarLicitacoesAtivas([
        { situacao: "Em andamento", situacaoCodigo: "em_andamento" },
        { situacao: "Aberta", situacaoCodigo: "nao_informada" },
        { situacao: "Em aberto", situacaoCodigo: "classificada" },
        { situacao: "Homologada", situacaoCodigo: "homologada" },
      ]),
    ).toBe(3);
  });

  it("devolve zero para lista vazia", () => {
    expect(contarLicitacoesAtivas([])).toBe(0);
  });
});

describe("somarEmpenhadoContratosVigentes", () => {
  it("soma o empenhado dos contratos", () => {
    expect(
      somarEmpenhadoContratosVigentes([
        { totalEmpenhado: 100.5 },
        { totalEmpenhado: 50 },
      ]),
    ).toBe(150.5);
  });

  it("devolve zero sem contratos", () => {
    expect(somarEmpenhadoContratosVigentes([])).toBe(0);
  });
});
