import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MinimosLegaisView } from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoMinimosLegaisSection } from "./educacao-minimos-legais-section";

const semMinimo = {
  limite: null,
  percentualAplicado: null,
  resultado: "sem_dado" as const,
  baseLegal: null,
  urlBaseLegal: null,
};

const base: MinimosLegaisView = {
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

describe("EducacaoMinimosLegaisSection", () => {
  it("mostra a pergunta, o mínimo, o veredito em texto e a lei com link", () => {
    render(<EducacaoMinimosLegaisSection minimosLegais={base} />);
    expect(
      screen.getByText("A Prefeitura aplica o mínimo exigido em educação?"),
    ).toBeTruthy();
    expect(screen.getByText(/Cumpriu o mínimo/)).toBeTruthy();
    expect(screen.getByText(/mínimo exigido: 25,0%/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /CF\/88 Art. 212/ })
        .getAttribute("href"),
    ).toBe("https://www.planalto.gov.br/constituicao");
  });

  it("não exibe o Fundeb enquanto a base de cálculo não é conferida", () => {
    render(<EducacaoMinimosLegaisSection minimosLegais={base} />);
    expect(screen.queryByText(/Fundeb/)).toBeNull();
  });

  it("abaixo do mínimo fala em indício, nunca em irregularidade", () => {
    const { container } = render(
      <EducacaoMinimosLegaisSection
        minimosLegais={{ ...base, mde: { ...base.mde, resultado: "abaixo" } }}
      />,
    );
    expect(screen.getByText(/Ficou abaixo do mínimo: indício/)).toBeTruthy();
    expect(container.textContent?.toLowerCase()).not.toContain("irregular");
  });

  it("ano parcial não dá veredito e diz até qual bimestre", () => {
    const parcial: MinimosLegaisView = {
      ...base,
      parcial: true,
      periodo: 3,
      mde: { ...base.mde, resultado: "parcial" },
      fundebProfissionais: {
        ...base.fundebProfissionais,
        resultado: "parcial",
      },
    };
    render(<EducacaoMinimosLegaisSection minimosLegais={parcial} />);
    expect(
      screen.getAllByText(/Ano em andamento: ainda sem veredito/),
    ).toHaveLength(1);
    expect(screen.getAllByText(/acumulado até o 3º bimestre/)).toHaveLength(1);
    expect(screen.queryByText(/Cumpriu o mínimo/)).toBeNull();
  });

  it("sem dado mostra traço e a causa", () => {
    render(
      <EducacaoMinimosLegaisSection
        minimosLegais={{
          ...base,
          semDadoSiope: true,
          mde: semMinimo,
          fundebProfissionais: semMinimo,
        }}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(1);
    expect(screen.getAllByText(/sem dado do SIOPE para 2024/)).toHaveLength(1);
  });
});
