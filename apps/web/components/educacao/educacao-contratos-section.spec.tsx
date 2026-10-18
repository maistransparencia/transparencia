import { fireEvent, render, screen, within } from "@testing-library/react";
import type { EducacaoContratoDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { EducacaoContratosSection } from "./educacao-contratos-section";

function makeContrato(
  overrides: Partial<EducacaoContratoDTO>,
): EducacaoContratoDTO {
  return {
    contratoId: "ctr",
    portalSlug: "portal_teste",
    ano: 2025,
    empresaId: "1",
    contratoNumero: "001/25",
    licitacaoNumero: null,
    modalidade: null,
    fornecedorNome: "FORNECEDOR A",
    fornecedorCpfCnpj: null,
    objeto: "Objeto",
    categoria: "merenda_pnae",
    valorContrato: 100,
    valorAditado: 0,
    totalEmpenhado: 100,
    totalLiquidado: 80,
    totalPago: 60,
    saldoAPagar: 40,
    fontePrincipal: null,
    fontesRecursos: null,
    orgaoNome: null,
    principalFuncao: null,
    principalPrograma: null,
    principalAcao: null,
    dataInicio: null,
    vencimentoAtual: null,
    ...overrides,
  };
}

const contratos = [
  makeContrato({ contratoId: "a", contratoNumero: "001/25" }),
  makeContrato({
    contratoId: "b",
    contratoNumero: "002/25",
    fornecedorNome: "TRANSPORTES B",
    categoria: "transporte_pnate",
    totalEmpenhado: 1000,
    totalLiquidado: 900,
    totalPago: 800,
    saldoAPagar: 200,
  }),
];

describe("EducacaoContratosSection - linha de totais", () => {
  it("soma os valores de todos os contratos, independentemente da paginação", () => {
    render(
      <EducacaoContratosSection
        contratos={contratos}
        portalSlug="portal_teste"
      />,
    );
    expect(screen.getByText(/\(Empenhado\)/).textContent).toContain("1.100");
    expect(screen.getByText(/\(Saldo Pendente\)/).textContent).toContain("240");
  });

  it("recalcula os totais ao buscar na tabela", () => {
    render(
      <EducacaoContratosSection
        contratos={contratos}
        portalSlug="portal_teste"
      />,
    );
    fireEvent.change(screen.getByPlaceholderText(/Buscar por fornecedor/), {
      target: { value: "TRANSPORTES" },
    });
    const rodape = within(screen.getAllByRole("row").at(-1) as HTMLElement);
    expect(rodape.getByText(/1\.000/)).toBeTruthy();
    expect(rodape.getByText(/800/)).toBeTruthy();
  });

  it("soma todos os contratos mesmo com mais de uma página", () => {
    const muitos = Array.from({ length: 12 }, (_, i) =>
      makeContrato({
        contratoId: `m${i}`,
        contratoNumero: `${i}/25`,
        totalEmpenhado: 10,
        totalLiquidado: 5,
        totalPago: 2,
        saldoAPagar: 1,
      }),
    );
    render(
      <EducacaoContratosSection contratos={muitos} portalSlug="portal_teste" />,
    );
    const rodape = within(screen.getAllByRole("row").at(-1) as HTMLElement);
    expect(rodape.getByText(/120/)).toBeTruthy();
  });

  it("recalcula os totais ao filtrar por categoria", () => {
    render(
      <EducacaoContratosSection
        contratos={contratos}
        portalSlug="portal_teste"
      />,
    );
    fireEvent.click(screen.getByText(/Transporte/));
    const rodape = within(screen.getAllByRole("row").at(-1) as HTMLElement);
    expect(rodape.getByText(/1\.000/)).toBeTruthy();
    expect(rodape.queryByText(/1\.100/)).toBeNull();
  });
});
