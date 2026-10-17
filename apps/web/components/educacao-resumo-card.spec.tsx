import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

import { EducacaoResumoCard } from "./educacao-resumo-card";

const base = {
  ano: 2023,
  notaIdeb: 5.9,
  crescimentoPontosIdeb: 1.4,
  mdePercentual: 27.5,
  custoAnualPorAluno: 12345.6,
};

describe("EducacaoResumoCard", () => {
  it("renderiza dados completos", () => {
    render(<EducacaoResumoCard resumo={base} detailUrl="/p/educacao" />);
    expect(
      screen.getByText("Educação Básica e Desempenho Escolar"),
    ).toBeTruthy();
    expect(screen.getByText("INEP / Censo Escolar")).toBeTruthy();
    expect(screen.getByText("5,9").className).toContain("font-serif");
    expect(screen.getByText("+1,4 ponto")).toBeTruthy();
    expect(screen.getByText(/Mínimo cumprido/)).toBeTruthy();
    const cta = screen.getByRole("link", {
      name: /Ver indicadores pedagógicos e despesas detalhadas/,
    });
    expect(cta.getAttribute("href")).toBe("/p/educacao");
    const lei = screen.getByRole("link", { name: /Art. 212/ });
    expect(lei.getAttribute("target")).toBe("_blank");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("mostra Não apurado sem MDE e omite badge sem crescimento", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, mdePercentual: null, crescimentoPontosIdeb: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.getAllByText(/Não apurado/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/ponto$/)).toBeNull();
  });

  it("mostra queda em tom negativo", () => {
    render(
      <EducacaoResumoCard
        resumo={{ ...base, crescimentoPontosIdeb: -0.3 }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.getByText("-0,3 ponto").className).toContain("rose");
  });

  it("degrada com resumo nulo e nota/custo nulos", () => {
    const { rerender } = render(
      <EducacaoResumoCard resumo={null} detailUrl="/p/educacao" />,
    );
    expect(screen.getByRole("link", { name: /Ver indicadores/ })).toBeTruthy();
    rerender(
      <EducacaoResumoCard
        resumo={{ ...base, notaIdeb: null, custoAnualPorAluno: null }}
        detailUrl="/p/educacao"
      />,
    );
    expect(screen.getAllByText("—").length).toBe(2);
  });
});
