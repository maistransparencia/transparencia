import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type AnnualActuarialTrend,
  type CadprevParcelamentoItem,
  CapremActuarialRiskSection,
} from "./caprem-actuarial-risk-section";

const mockCadprev: CadprevParcelamentoItem[] = [
  {
    numeroCadprev: "00123/2023",
    descricao: "Termo de Confissão e Parcelamento Previdenciário Ordinário",
    elemento: "71",
    empenhado: 150000,
    pago: 120000,
    dataEmpenho: "2024-02-15",
  },
  {
    numeroCadprev: "00456/2022",
    descricao: "Acordo de Parcelamento Especial de Débitos RPPS",
    elemento: "71",
    empenhado: 80000,
    pago: 80000,
    dataEmpenho: "2024-03-10",
  },
];

const mockTrend: AnnualActuarialTrend[] = [
  {
    ano: 2021,
    aporteExigido: 400000,
    aporteQuitado: 400000,
    taxaAdimplencia: 100,
    amortizacaoDivida: 100000,
  },
  {
    ano: 2022,
    aporteExigido: 450000,
    aporteQuitado: 380000,
    taxaAdimplencia: 84.4,
    amortizacaoDivida: 110000,
  },
  {
    ano: 2023,
    aporteExigido: 480000,
    aporteQuitado: 420000,
    taxaAdimplencia: 87.5,
    amortizacaoDivida: 115000,
  },
  {
    ano: 2024,
    aporteExigido: 500000,
    aporteQuitado: 400000,
    taxaAdimplencia: 80,
    amortizacaoDivida: 120000,
  },
];

describe("CapremActuarialRiskSection", () => {
  it("renderiza o cabeçalho reestruturado com a âncora id='cadprev' e descrição adequada", () => {
    const { container } = render(
      <CapremActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const section = container.querySelector("#cadprev");
    expect(section).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Acordos de Parcelamento e Dívidas Previdenciárias (CADPREV / Ministério da Previdência)",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Monitoramento dos acordos formais de confissão e parcelamento de dívidas previdenciárias firmados junto ao Ministério da Previdência \(CADPREV\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("não renderiza mais os cards de KPI antigos que eram redundantes", () => {
    render(
      <CapremActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    expect(
      screen.queryByText(/Aporte Déficit Atuarial/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Déficit de Repasse Mensal/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Amortização de Dívidas/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Base de Contribuintes/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Servidores Efetivos \(RPPS\)/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Repasses Patronais em Dia/i),
    ).not.toBeInTheDocument();
  });

  it("renderiza a tabela oficial CADPREV em destaque no topo quando houver dados", () => {
    render(
      <CapremActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)",
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");

    expect(
      screen.getByText("Registro CADPREV / Ministério da Previdência"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Objeto do Termo de Parcelamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("00123/2023")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Termo de Confissão e Parcelamento Previdenciário Ordinário",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("00456/2022")).toBeInTheDocument();

    expect(
      screen.getByText(
        /Não inclui multas ou penalidades tributárias pagas a outros credores/i,
      ),
    ).toBeInTheDocument();
  });

  it("renderiza aviso discreto quando não houver acordos CADPREV registrados no exercício, mantendo a nota explicativa", () => {
    render(
      <CapremActuarialRiskSection ano={2024} trend={mockTrend} cadprev={[]} />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Nenhum termo de parcelamento ou confissão de dívida registrado no CADPREV para o exercício de 2024.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("Registro CADPREV / Ministério da Previdência"),
    ).not.toBeInTheDocument();

    // A nota explicativa continua presente mesmo no estado vazio
    expect(
      screen.getByText(
        /Não inclui multas ou penalidades tributárias pagas a outros credores/i,
      ),
    ).toBeInTheDocument();
  });

  it("renderiza a tabela de evolução histórica quando trend possuir dados", () => {
    render(
      <CapremActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2026)",
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");

    expect(screen.getByText("Exercício / Ano")).toBeInTheDocument();
    expect(screen.getByText("Aporte Atuarial Exigido")).toBeInTheDocument();
    expect(screen.getByText("Aporte Efetuado / Quitado")).toBeInTheDocument();
    expect(screen.getByText("Índice de Adimplência")).toBeInTheDocument();
    expect(
      screen.getByText("Amortização de Dívida / Parcelamento"),
    ).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("omite a tabela de evolução histórica sem quebrar layout quando trend estiver vazia ou omitida", () => {
    render(<CapremActuarialRiskSection ano={2024} cadprev={mockCadprev} />);

    expect(
      screen.queryByRole("heading", {
        name: "Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2026)",
      }),
    ).not.toBeInTheDocument();

    // A tabela CADPREV ainda deve estar visível
    expect(
      screen.getByRole("heading", {
        name: "Acordos Oficiais de Confissão e Parcelamento de Dívidas (CADPREV / Ministério da Previdência)",
      }),
    ).toBeInTheDocument();
  });
});
