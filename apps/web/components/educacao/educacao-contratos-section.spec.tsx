import { fireEvent, render, screen, within } from "@testing-library/react";
import type { EducacaoContratoDTO } from "@transparencia/db";
import { afterEach, describe, expect, it } from "vitest";
import type { EducacaoContratosCategoriaTotais } from "@/app/[portalSlug]/educacao/view-model";
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

const CATEGORIAS = [
  "merenda_pnae",
  "transporte_pnate",
  "manutencao_geral",
  "locacao_imoveis",
  "outros",
] as const;

function buildTotais(lista: EducacaoContratoDTO[]) {
  return Object.fromEntries(
    CATEGORIAS.map((categoria) => {
      const doGrupo = lista.filter((c) => c.categoria === categoria);
      const totais: EducacaoContratosCategoriaTotais = {
        quantidade: doGrupo.length,
        valorContrato: doGrupo.reduce((a, c) => a + c.valorContrato, 0),
        totalEmpenhado: doGrupo.reduce((a, c) => a + c.totalEmpenhado, 0),
        totalPago: doGrupo.reduce((a, c) => a + c.totalPago, 0),
      };
      return [categoria, totais];
    }),
  ) as Record<(typeof CATEGORIAS)[number], EducacaoContratosCategoriaTotais>;
}

function renderSecao(
  lista: EducacaoContratoDTO[],
  extra: { initialContratoNumero?: string } = {},
) {
  return render(
    <EducacaoContratosSection
      contratos={lista}
      totaisPorCategoria={buildTotais(lista)}
      portalSlug="portal_teste"
      {...extra}
    />,
  );
}

const contratos = [
  makeContrato({
    contratoId: "a",
    contratoNumero: "001/25",
    valorContrato: 100,
  }),
  makeContrato({
    contratoId: "a2",
    contratoNumero: "003/25",
    valorContrato: 5000,
    fornecedorNome: "MAIOR FORNECEDOR",
  }),
  makeContrato({
    contratoId: "b",
    contratoNumero: "002/25",
    fornecedorNome: "TRANSPORTES B",
    categoria: "transporte_pnate",
    valorContrato: 2000000,
    totalEmpenhado: 0,
    totalPago: 0,
  }),
];

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("EducacaoContratosSection - cards por categoria", () => {
  it("exibe 5 cards com valor compacto e contagem", () => {
    renderSecao(contratos);
    expect(
      CATEGORIAS.every((c) => screen.getByTestId(`categoria-card-${c}`)),
    ).toBe(true);
    const merenda = screen.getByTestId("categoria-card-merenda_pnae");
    expect(merenda.textContent).toContain("R$ 5,1 mil");
    expect(merenda.textContent).toContain("2 contratos ›");
    expect(
      screen.getByTestId("categoria-card-transporte_pnate").textContent,
    ).toContain("1 contrato ›");
  });

  it("omite a barra quando nao ha empenhado e mostra quando ha", () => {
    renderSecao(contratos);
    expect(
      within(screen.getByTestId("categoria-card-transporte_pnate")).queryByRole(
        "progressbar",
      ),
    ).toBeNull();
    expect(
      within(screen.getByTestId("categoria-card-merenda_pnae"))
        .getByRole("progressbar")
        .getAttribute("aria-valuenow"),
    ).toBe("60");
  });

  it("categoria vazia fica esmaecida, desabilitada e nao abre", () => {
    renderSecao(contratos);
    const vazio = screen.getByTestId("categoria-card-locacao_imoveis");
    expect(vazio.getAttribute("aria-disabled")).toBe("true");
    expect(vazio.textContent).toContain("0 contratos");
    expect(vazio.textContent).toContain("—");
    fireEvent.click(vazio);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("sem contratos mostra frase neutra", () => {
    renderSecao([]);
    expect(
      screen.getByText("Nenhum contrato registrado no exercício."),
    ).toBeTruthy();
  });

  it("abre a lista ordenada por valor decrescente e depois o detalhe com a URL", () => {
    renderSecao(contratos);
    fireEvent.click(screen.getByTestId("categoria-card-merenda_pnae"));
    const dialog = screen.getByRole("dialog");
    const linhas = within(dialog).getAllByTestId(/contrato-lista-/);
    expect(linhas[0].getAttribute("data-testid")).toBe("contrato-lista-003/25");
    expect(
      within(dialog).queryByPlaceholderText(/Buscar por fornecedor, objeto/),
    ).toBeNull();
    fireEvent.click(linhas[0]);
    expect(window.location.search).toContain("contratoNumero=003");
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
  });

  it("deep link valido abre o detalhe e invalido e ignorado", () => {
    window.history.replaceState({}, "", "/?contratoNumero=002/25");
    renderSecao(contratos);
    expect(screen.getByRole("dialog")).toBeTruthy();
    window.history.replaceState({}, "", "/?contratoNumero=999");
    renderSecao(contratos);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("busca aparece so com mais de 8 contratos e trata sem resultado", () => {
    const muitos = Array.from({ length: 9 }, (_, i) =>
      makeContrato({
        contratoId: `m${i}`,
        contratoNumero: `${i}/25`,
        valorContrato: i + 1,
      }),
    );
    renderSecao(muitos);
    fireEvent.click(screen.getByTestId("categoria-card-merenda_pnae"));
    fireEvent.change(screen.getByLabelText("Buscar contratos da categoria"), {
      target: { value: "zzz" },
    });
    expect(
      screen.getByText(/Nenhum contrato encontrado para “zzz”\./),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Limpar busca"));
    expect(screen.getAllByTestId(/contrato-lista-/)).toHaveLength(9);
  });
});

describe("EducacaoContratosSection - tabela completa e camadas", () => {
  it("rodape soma todos os contratos mesmo com mais de uma pagina", () => {
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
    renderSecao(muitos);
    const rodape = within(screen.getAllByRole("row").at(-1) as HTMLElement);
    expect(rodape.getByText(/120/)).toBeTruthy();
  });

  it("rodape recalcula ao buscar na tabela", () => {
    renderSecao(contratos);
    fireEvent.change(screen.getByPlaceholderText(/Buscar por fornecedor/), {
      target: { value: "TRANSPORTES" },
    });
    const rodape = within(screen.getAllByRole("row").at(-1) as HTMLElement);
    expect(rodape.queryByText(/100/)).toBeNull();
  });

  it("voltar do detalhe mantem a lista aberta e remove o parametro da URL", () => {
    renderSecao(contratos);
    fireEvent.click(screen.getByTestId("categoria-card-merenda_pnae"));
    fireEvent.click(screen.getAllByTestId(/contrato-lista-/)[0]);
    fireEvent.click(screen.getByText(/Voltar à lista/));
    expect(window.location.search).not.toContain("contratoNumero");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("setas e enter da lista nao agem com o detalhe aberto", () => {
    renderSecao(contratos);
    fireEvent.click(screen.getByTestId("categoria-card-merenda_pnae"));
    fireEvent.click(screen.getAllByTestId(/contrato-lista-/)[0]);
    const urlAntes = window.location.search;
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(window.location.search).toBe(urlAntes);
  });
});
