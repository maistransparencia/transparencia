import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import {
  EducacaoResumoCard,
  type EducacaoResumoCardData,
} from "./educacao-resumo-card";

const base: EducacaoResumoCardData = {
  ano: 2023,
  notaIdebTexto: "5,9",
  enfaseTom: "destaque",
  enfaseTitulo: "Destaque: evolução de +1,4 ponto no IDEB",
  evolucaoTexto: "+1,4 ponto",
  evolucaoTom: "destaque",
  notaAnteriorTexto: "Ciclo anterior: 4,5",
  metaTexto: "Meta do IDEB atingida",
  metaTom: "destaque",
  etapas: [
    { rotulo: "Anos iniciais", notaTexto: "6,1" },
    { rotulo: "Anos finais", notaTexto: "5,2" },
  ],
  rankingTexto: "3º de 92 municípios",
  despesaLiquidadaEducacaoTexto: "R$ 12,3 mi",
  despesaLiquidadaEducacaoCompleta: "R$ 12.300.000,00",
};

describe("EducacaoResumoCard", () => {
  it("renderiza destaque positivo e meta atingida com dados completos", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(
      screen.getByText("Educação Básica e Desempenho Escolar"),
    ).toBeTruthy();
    expect(screen.getByText("INEP / Censo Escolar")).toBeTruthy();
    expect(screen.getByText("5,9").className).toContain("font-serif");
    expect(
      screen.getByText("Destaque: evolução de +1,4 ponto no IDEB").className,
    ).toContain("emerald");
    expect(screen.getByText("+1,4 ponto")).toBeTruthy();
    expect(screen.getByText("Ciclo anterior: 4,5")).toBeTruthy();
    expect(screen.getByText("Meta do IDEB atingida").className).toContain(
      "emerald",
    );
    expect(screen.getByText("Anos iniciais:")).toBeTruthy();
    expect(screen.getByText(/3º de 92 municípios/)).toBeTruthy();
    expect(screen.getByText("R$ 12,3 mi")).toBeTruthy();
    expect(screen.queryByText(/MDE/)).toBeNull();
    expect(screen.queryByText(/por aluno/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /Art. 212/ })).toBeNull();
    const cta = screen.getByRole("link", {
      name: /Ver indicadores pedagógicos e despesas detalhadas/,
    });
    expect(cta.getAttribute("href")).toBe("/p/educacao");
  });

  it("mostra meta não atingida e queda em tom de atenção", () => {
    render(
      <EducacaoResumoCard
        resumo={{
          ...base,
          enfaseTom: "atencao",
          enfaseTitulo: "Atenção: queda de 0,3 ponto no IDEB",
          evolucaoTexto: "-0,3 ponto",
          evolucaoTom: "atencao",
          metaTexto: "Meta do IDEB não atingida",
          metaTom: "atencao",
        }}
        detailUrl="/p/educacao"
      />,
    );
    expect(
      screen.getByText("Atenção: queda de 0,3 ponto no IDEB").className,
    ).toContain("amber");
    expect(screen.getByText("-0,3 ponto").className).toContain("amber");
    expect(screen.getByText("Meta do IDEB não atingida").className).toContain(
      "amber",
    );
  });

  it("omite faixa, meta, ranking, etapas e despesa quando ausentes", () => {
    render(
      <EducacaoResumoCard
        resumo={{
          ...base,
          notaIdebTexto: "—",
          enfaseTom: "neutro",
          enfaseTitulo: null,
          evolucaoTexto: null,
          notaAnteriorTexto: null,
          metaTexto: null,
          metaTom: "neutro",
          etapas: [],
          rankingTexto: null,
          despesaLiquidadaEducacaoTexto: null,
          despesaLiquidadaEducacaoCompleta: null,
        }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/Destaque|Atenção:/)).toBeNull();
    expect(screen.queryByText(/ponto$/)).toBeNull();
    expect(screen.queryByText(/municípios/)).toBeNull();
    expect(screen.getByText(/não disponíveis para este ciclo/)).toBeTruthy();
    expect(screen.getAllByText("—").length).toBe(2);
  });

  it("omite apenas o ranking quando não há classificação estadual", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, rankingTexto: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/classificação estadual/)).toBeNull();
    expect(screen.getByText("Meta do IDEB atingida")).toBeTruthy();
  });

  it("degrada com resumo nulo", () => {
    render(<EducacaoResumoCard resumo={null} detailUrl="/p/educacao" />);
    expect(screen.getByText(/ainda não disponíveis/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver indicadores/ })).toBeTruthy();
  });
});
