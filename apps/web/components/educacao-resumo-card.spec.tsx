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
  rankingTexto: "3º de 92 municípios",
  rankingVariacaoTexto: "+2 posições",
  rankingVariacaoTom: "destaque",
  exercicioDespesa: 2026,
  despesaLiquidadaEducacaoTexto: "R$ 12,3 mi",
  despesaLiquidadaEducacaoCompleta: "R$ 12.300.000,00",
};

describe("EducacaoResumoCard", () => {
  it("exibe a despesa liquidada com o exercício, sem jargão de função", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(
      screen.getByText("Despesa liquidada em Educação"),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 12,3 mi")).toBeInTheDocument();
    expect(screen.getByText("Exercício 2026")).toBeInTheDocument();
    expect(screen.queryByText(/Função 12/)).not.toBeInTheDocument();
  });

  it("renderiza destaque positivo e meta atingida com dados completos", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(
      screen.getByText("Educação Básica e Desempenho Escolar"),
    ).toBeTruthy();
    const fonte = screen.getByRole("link", { name: /INEP \/ IDEB/ });
    expect(fonte.getAttribute("href")).toContain("gov.br/inep");
    expect(fonte.getAttribute("target")).toBe("_blank");
    expect(fonte.getAttribute("rel")).toBe("noopener noreferrer");
    expect(screen.getByText("Nota do IDEB (1º ao 5º ano)")).toBeTruthy();
    expect(
      screen.getByText("Indicadores oficiais do IDEB apurados pelo INEP/MEC."),
    ).toBeTruthy();
    expect(screen.getByText("5,9").className).toContain("font-serif");
    expect(
      screen.getByText("Destaque: evolução de +1,4 ponto no IDEB").className,
    ).toContain("emerald");
    expect(screen.getByText("+1,4 ponto")).toBeTruthy();
    expect(screen.getByText("Ciclo anterior: 4,5")).toBeTruthy();
    expect(screen.getByText("Meta do IDEB atingida").className).toContain(
      "emerald",
    );
    expect(screen.queryByText(/Anos iniciais|Anos finais/)).toBeNull();
    expect(screen.getByText("Classificação estadual")).toBeTruthy();
    expect(screen.queryByText(/Função 12/)).toBeNull();
    expect(screen.getByText(/3º de 92 municípios/)).toBeTruthy();
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

  it("omite faixa, meta, ranking quando ausentes", () => {
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
          rankingTexto: null,
        }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/Destaque|Atenção:/)).toBeNull();
    expect(screen.queryByText(/ponto$/)).toBeNull();
    expect(screen.queryByText(/municípios/)).toBeNull();
    expect(screen.getByText(/Classificação indisponível/)).toBeTruthy();
    expect(screen.getAllByText("—").length).toBe(2);
  });

  it("omite apenas o ranking quando não há classificação estadual", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, rankingTexto: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/municípios/)).toBeNull();
    expect(screen.queryByText(/posições/)).toBeNull();
    expect(screen.getByText("Meta do IDEB atingida")).toBeTruthy();
  });

  it.each([
    { texto: "+2 posições", tom: "destaque", icone: "▲ ", classe: "emerald" },
    { texto: "-3 posições", tom: "atencao", icone: "▼ ", classe: "amber" },
    { texto: "Estável", tom: "neutro", icone: "", classe: "subtleText" },
  ] as const)("exibe variação de posições $texto", (caso) => {
    render(
      <EducacaoResumoCard
        resumo={{
          ...base,
          rankingVariacaoTexto: caso.texto,
          rankingVariacaoTom: caso.tom,
        }}
        detailUrl="/p/educacao"
      />,
    );
    const el = screen.getByText(`${caso.icone}${caso.texto}`);
    expect(el.getAttribute("data-tom")).toBe(caso.tom);
    expect(el.className).toContain(caso.classe);
  });

  it("omite a variação quando nula", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, rankingVariacaoTexto: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.queryByText(/posições|Estável/)).toBeNull();
  });

  it("degrada com resumo nulo", () => {
    render(<EducacaoResumoCard resumo={null} detailUrl="/p/educacao" />);
    expect(screen.getByText(/ainda não disponíveis/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver indicadores/ })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /INEP \/ IDEB/ }).getAttribute("href"),
    ).toContain("gov.br/inep");
  });
});
