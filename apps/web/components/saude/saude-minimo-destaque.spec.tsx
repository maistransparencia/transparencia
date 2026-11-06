import { fireEvent, render, screen } from "@testing-library/react";
import type {
  SaudeMinimoAnoDTO,
  SaudeMinimoConstitucionalDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaudeMinimoDestaque } from "./saude-minimo-destaque";

const anoBase: SaudeMinimoAnoDTO = {
  ano: 2024,
  periodo: 6,
  situacao: "encerrado",
  percentualAplicadoSaude: 21.4,
  despesaSaudePorHabitante: 1500,
  percentualTransferenciasSaude: 40,
  receitaImpostosTransferenciasConstitucionais: 50_000_000,
  despesaRecursosProprios: 10_700_000,
  despesaTotalSaude: 30_000_000,
  divergenciaEntreVias: false,
  indicadoresDivergentes: [],
  coletadoEm: "2026-11-01T10:00:00.000Z",
};

const base: SaudeMinimoConstitucionalDTO = {
  portalSlug: "qualquer_prefeitura",
  ano: 2024,
  atual: anoBase,
  minimo: {
    limite: 15,
    percentualAplicado: 21.4,
    resultado: "cumpriu",
    comparavel: true,
    mesesCobertos: null,
    baseLegal: "Lei Complementar 141/2012 art. 7º",
    urlBaseLegal: "https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp141.htm",
  },
  serie: [anoBase],
  anoInicial: 2017,
  anoFinal: 2024,
};

describe("SaudeMinimoDestaque", () => {
  it("mostra pergunta, valor, régua, rótulo do SIOPS, lei e fonte", () => {
    render(<SaudeMinimoDestaque minimoSaude={base} />);

    expect(
      screen.getByText("A Prefeitura aplica o mínimo exigido em saúde?"),
    ).toBeTruthy();
    expect(screen.getByText(/A lei exige pelo menos 15%/)).toBeTruthy();
    expect(
      screen.getByText(/Calculado pelo SIOPS \(Ministério da Saúde\)/),
    ).toBeTruthy();
    expect(screen.getByText(/Dados consultados no SIOPS em/)).toBeTruthy();
    expect(screen.getByRole("meter", { hidden: true })).toBeTruthy();
    const lei = screen.getByRole("link", { name: /Lei Complementar 141/ });
    expect(lei.getAttribute("target")).toBe("_blank");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("ano parcial não ganha barra nem veredito", () => {
    render(
      <SaudeMinimoDestaque
        minimoSaude={{
          ...base,
          ano: 2026,
          atual: { ...anoBase, ano: 2026, periodo: 3, situacao: "parcial" },
          minimo: {
            ...base.minimo,
            percentualAplicado: 121.91,
            resultado: "parcial",
            comparavel: false,
            mesesCobertos: 6,
          },
        }}
      />,
    );

    expect(screen.queryByRole("meter", { hidden: true })).toBeNull();
    expect(
      screen.getByText(
        /Valor parcial de 2026, até o 3º bimestre \(6 primeiros meses\)/,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/abaixo do mínimo/)).toBeNull();
  });

  it("abaixo do mínimo fala em indício, sem acusar", () => {
    render(
      <SaudeMinimoDestaque
        minimoSaude={{
          ...base,
          minimo: {
            ...base.minimo,
            percentualAplicado: 12,
            resultado: "abaixo",
          },
        }}
      />,
    );

    expect(screen.getByText("Abaixo dos 15% exigidos")).toBeTruthy();
    expect(screen.getByText(/indício a ser esclarecido/)).toBeTruthy();
  });

  it("valor em conferência cita o SIOPS, não afirma cumprimento e não desenha barra", () => {
    render(
      <SaudeMinimoDestaque
        minimoSaude={{
          ...base,
          atual: { ...anoBase, percentualAplicadoSaude: 20 },
          minimo: {
            ...base.minimo,
            percentualAplicado: 20,
            resultado: "indeterminado",
            comparavel: false,
          },
        }}
      />,
    );

    expect(screen.queryByRole("meter", { hidden: true })).toBeNull();
    expect(screen.getByText(/ainda não confirmou esse valor/)).toBeTruthy();
    expect(screen.queryByText(/abaixo do mínimo/)).toBeNull();
    expect(screen.queryByText(/cumpriu/)).toBeNull();
  });

  it("o medidor descreve valor e régua sem afirmar cumprimento", () => {
    render(<SaudeMinimoDestaque minimoSaude={base} />);

    const medidor = screen.getByRole("meter", { hidden: true });
    expect(medidor.getAttribute("aria-valuetext")).not.toMatch(/cumpriu/);
  });

  it("sem dado mostra traço e nunca zero", () => {
    render(
      <SaudeMinimoDestaque
        minimoSaude={{
          ...base,
          ano: 2026,
          atual: null,
          minimo: {
            ...base.minimo,
            percentualAplicado: null,
            resultado: "sem_dado",
            comparavel: false,
          },
          serie: [],
          anoInicial: null,
          anoFinal: null,
        }}
      />,
    );

    expect(screen.getByText("—")).toBeTruthy();
    expect(
      screen.getByText(/não tem dado de saúde publicado para 2026/),
    ).toBeTruthy();
    expect(screen.queryByTestId("saude-minimo-ver-detalhes")).toBeNull();
  });

  it("detalhes mostram a memória de cálculo e o intervalo dos anos fechados", () => {
    render(<SaudeMinimoDestaque minimoSaude={base} />);

    fireEvent.click(screen.getByTestId("saude-minimo-ver-detalhes"));

    expect(screen.getByText(/Despesa total com saúde/)).toBeTruthy();
    expect(
      screen.getByText(/restos a pagar sem dinheiro em caixa/),
    ).toBeTruthy();
    expect(screen.getByText(/Anos fechados, 2017–2024/)).toBeTruthy();
    expect(screen.getAllByText(/Dados consultados no SIOPS em/)).toHaveLength(
      2,
    );
    const art24 = screen.getByRole("link", {
      name: /art\. 24 da Lei Complementar 141/,
    });
    expect(art24.getAttribute("href")).toBe(
      `${base.minimo.urlBaseLegal}#art24`,
    );
  });
});
