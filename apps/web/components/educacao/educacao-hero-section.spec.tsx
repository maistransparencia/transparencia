import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  EducacaoExecucaoAnoView,
  MinimosLegaisView,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoHeroSection } from "./educacao-hero-section";

const semMinimo = {
  limite: null,
  percentualAplicado: null,
  resultado: "sem_dado" as const,
  baseLegal: null,
  urlBaseLegal: null,
};

const minimosBase: MinimosLegaisView = {
  ano: 2024,
  parcial: false,
  periodo: 6,
  semDadoSiope: false,
  mde: {
    limite: 25,
    percentualAplicado: 27.5,
    resultado: "cumpriu",
    baseLegal: "CF/88 Art. 212 e Art. 212-A",
    urlBaseLegal: "https://www.planalto.gov.br/constituicao",
  },
  fundebProfissionais: {
    limite: 70,
    percentualAplicado: 65,
    resultado: "abaixo",
    baseLegal: "Lei 14.113/2020 Art. 26",
    urlBaseLegal: "https://www.planalto.gov.br/l14113",
  },
};

const execucao: EducacaoExecucaoAnoView = {
  ano: 2024,
  empenhado: 1_000_000,
  liquidado: 900_000,
  pago: 800_000,
  pagoSemPessoal: 500_000,
  temDados: true,
};

const renderizar = (minimosLegais: MinimosLegaisView = minimosBase) =>
  render(
    <EducacaoHeroSection
      ano={2024}
      isCurrentYear={false}
      partialPeriod=""
      minimosLegais={minimosLegais}
      execucao={execucao}
    />,
  );

describe("EducacaoHeroSection", () => {
  it("abre com a pergunta, um único número grande e o veredito em texto", () => {
    const { container } = renderizar();
    expect(
      screen.getByText("A Prefeitura aplica o mínimo exigido em educação?"),
    ).toBeTruthy();
    expect(container.querySelectorAll(".stat-value-lg")).toHaveLength(1);
    expect(container.querySelector(".stat-value-lg")?.textContent).toBe(
      "27,50%",
    );
    const destaque = screen.getByTestId("educacao-resumo-destaque");
    expect(within(destaque).getByText(/Cumpriu o mínimo/)).toBeTruthy();
    expect(
      within(destaque).getByText(/não para o que ela recebe/),
    ).toBeTruthy();
  });

  it("não usa panel nem faixa cinza em volta do destaque", () => {
    const { container } = renderizar();
    expect(container.querySelector(".panel")).toBeNull();
    expect(container.innerHTML).not.toMatch(/bg-line|bg-page|rounded/);
  });

  it("mostra a barra do mínimo com marcador vindo do limite, nunca literal", () => {
    renderizar({
      ...minimosBase,
      mde: { ...minimosBase.mde, limite: 30 },
    });
    const barra = screen.getByRole("meter", {
      name: /Aplicado em ensino/,
    });
    expect(barra.getAttribute("aria-valuenow")).toBe("27.5");
    expect(barra.getAttribute("aria-valuetext")).toMatch(/mínimo de 30,00%/);
    expect(screen.getByText("mínimo 30%")).toBeTruthy();
  });

  it("lista o mínimo do ensino e o Fundeb em duas linhas, o Fundeb com barra e marcador", () => {
    renderizar();
    expect(screen.getByText("Mínimo exigido em ensino (MDE)")).toBeTruthy();
    expect(
      screen.getByText("Fundeb pago aos profissionais da educação"),
    ).toBeTruthy();
    expect(screen.getByText(/65,00%/)).toBeTruthy();
    const barraFundeb = screen.getByRole("meter", {
      name: /Fundeb pago aos profissionais/,
    });
    expect(barraFundeb.getAttribute("aria-valuetext")).toMatch(
      /mínimo de 70,00%/,
    );
    expect(screen.getByText("mínimo 70%")).toBeTruthy();
  });

  it("abaixo do mínimo fala em indício a ser esclarecido, nunca em irregularidade", () => {
    const { container } = renderizar();
    expect(
      screen.getByText(/indício a ser esclarecido pela Prefeitura/),
    ).toBeTruthy();
    expect(container.textContent).not.toMatch(/irregular|fraude|descumpr/i);
  });

  it("põe Lei e Fonte numa linha de legenda, com as leis em nova aba (Regra 20)", () => {
    renderizar();
    const lei = screen.getByRole("link", { name: /CF\/88 Art. 212/ });
    expect(lei.getAttribute("href")).toBe(
      "https://www.planalto.gov.br/constituicao",
    );
    expect(lei.getAttribute("target")).toBe("_blank");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      screen
        .getByRole("link", { name: /Lei 14.113\/2020 Art. 26/ })
        .getAttribute("href"),
    ).toBe("https://www.planalto.gov.br/l14113");
    expect(screen.getByText(/SIOPE \(FNDE\)/)).toBeTruthy();
  });

  it("ano em andamento fica marcado como parcial e sem veredito", () => {
    renderizar({
      ...minimosBase,
      parcial: true,
      periodo: 3,
      mde: { ...minimosBase.mde, resultado: "parcial" },
      fundebProfissionais: {
        ...minimosBase.fundebProfissionais,
        resultado: "parcial",
      },
    });
    const destaque = screen.getByTestId("educacao-resumo-destaque");
    expect(
      within(destaque).getAllByText(/Ano em andamento/).length,
    ).toBeGreaterThan(0);
    expect(
      within(destaque).getByText(/até o 3º bimestre de 2024/),
    ).toBeTruthy();
    expect(within(destaque).queryByText(/Cumpriu o mínimo/)).toBeNull();
    expect(within(destaque).queryByText(/Ficou abaixo/)).toBeNull();
  });

  it("sem dado do SIOPE mostra traço, a causa e nenhuma barra", () => {
    const { container } = renderizar({
      ...minimosBase,
      semDadoSiope: true,
      mde: semMinimo,
      fundebProfissionais: semMinimo,
    });
    expect(container.querySelector(".stat-value-lg")?.textContent).toBe("—");
    expect(screen.getByText(/sem dado publicado para 2024/)).toBeTruthy();
    expect(screen.queryByRole("meter")).toBeNull();
  });

  it("percentual em branco no SIOPE diz que a Prefeitura não informou", () => {
    renderizar({
      ...minimosBase,
      mde: semMinimo,
      fundebProfissionais: semMinimo,
    });
    expect(
      screen.getByText(/a Prefeitura não informou o percentual de 2024/),
    ).toBeTruthy();
  });

  it("Ver detalhes do gasto, na linha de legenda, abre reservado, liquidado e pago", () => {
    renderizar();
    fireEvent.click(
      screen.getByRole("button", { name: "Ver detalhes: gasto em educação" }),
    );
    const modal = screen.getByRole("dialog");
    expect(
      within(modal).getByText("Quanto a Prefeitura gastou em educação"),
    ).toBeTruthy();
    expect(within(modal).getByText(/Reservado \(empenhado\)/)).toBeTruthy();
  });
});
