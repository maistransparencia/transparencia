import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  type AnnualActuarialTrend,
  type CadprevParcelamentoItem,
  PrevidenciaActuarialRiskSection,
} from "./previdencia-actuarial-risk-section";

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

describe("PrevidenciaActuarialRiskSection", () => {
  it("renderiza o cabeçalho reestruturado com a âncora id='cadprev' e descrição adequada", () => {
    const { container } = render(
      <PrevidenciaActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const section = container.querySelector("#cadprev");
    expect(section).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /^Quanto a Prefeitura pagou em \d{4} de dívidas parceladas com o fundo de aposentadoria\?$/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /Acordos em que a Prefeitura parcelou dívidas previdenciárias com o fundo de aposentadoria, registrados no CADPREV \(Ministério da Previdência\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("não renderiza mais os cards de KPI antigos que eram redundantes", () => {
    render(
      <PrevidenciaActuarialRiskSection
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
      <PrevidenciaActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: /^Quanto a Prefeitura pagou em \d{4} de dívidas parceladas com o fundo de aposentadoria\?$/,
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H2");
    expect(
      screen.getAllByRole("heading", { name: /dívidas parceladas/ }),
    ).toHaveLength(1);

    expect(screen.getByText("Registro CADPREV")).toBeInTheDocument();
    expect(screen.getByText("Objeto do parcelamento")).toBeInTheDocument();
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
      <PrevidenciaActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={[]}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /^Quanto a Prefeitura pagou em \d{4} de dívidas parceladas com o fundo de aposentadoria\?$/,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Nenhum termo de parcelamento ou confissão de dívida registrado no CADPREV em 2024.",
      ),
    ).toBeInTheDocument();

    expect(screen.queryByText("Registro CADPREV")).not.toBeInTheDocument();

    expect(
      screen.getByText(
        /Não inclui multas ou penalidades tributárias pagas a outros credores/i,
      ),
    ).toBeInTheDocument();
  });

  it("renderiza a tabela de evolução histórica quando trend possuir dados", () => {
    render(
      <PrevidenciaActuarialRiskSection
        ano={2024}
        trend={mockTrend}
        cadprev={mockCadprev}
      />,
    );

    const heading = screen.getByRole("heading", {
      name: "Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2024)",
    });
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H3");

    expect(screen.getByText("Exercício")).toBeInTheDocument();
    expect(screen.getByText("Aporte exigido")).toBeInTheDocument();
    expect(screen.getByText("Aporte pago")).toBeInTheDocument();
    expect(screen.getByText("Adimplência")).toBeInTheDocument();
    expect(screen.getByText("Dívida amortizada")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it("omite a tabela de evolução histórica sem quebrar layout quando trend estiver vazia ou omitida", () => {
    render(
      <PrevidenciaActuarialRiskSection ano={2024} cadprev={mockCadprev} />,
    );

    expect(
      screen.queryByRole("heading", {
        name: "Evolução Histórica da Cobertura Atuarial e Resgate de Dívidas (2021–2024)",
      }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: /^Quanto a Prefeitura pagou em \d{4} de dívidas parceladas com o fundo de aposentadoria\?$/,
      }),
    ).toBeInTheDocument();
  });
});
