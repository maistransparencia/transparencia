import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrevidenciaHeroSection } from "./previdencia-hero-section";

const base = {
  ano: 2031,
  isCurrentYear: false,
  totalEmpenhado: 1_000_000,
  totalLiquidado: 900_000,
  totalPago: 800_000,
  taxaExecucao: 0.8,
  totalAporteAtuarial: 0,
  totalDividaResgatada: 0,
  previdenciaSigla: "FUNPREV",
};

describe("PrevidenciaHeroSection", () => {
  it("faz a pergunta do cidadão e mostra empenhado e pago", () => {
    render(<PrevidenciaHeroSection {...base} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /guardado e repassado em dia/,
    );
    expect(screen.getByText(/FUNPREV\) · EXERCÍCIO 2031/)).toBeInTheDocument();
    expect(
      screen.getByText(/Valor reservado \(empenhado\) para o FUNPREV/),
    ).toBeInTheDocument();
  });

  it("sem repasses não mostra o painel nem valores em R$", () => {
    render(
      <PrevidenciaHeroSection
        {...base}
        totalEmpenhado={0}
        totalLiquidado={0}
        totalPago={0}
        taxaExecucao={0}
      />,
    );
    expect(screen.queryByText(/Valor reservado/)).not.toBeInTheDocument();
    expect(
      screen.getByText(/não tem repasses para o FUNPREV registrados em 2031/),
    ).toBeInTheDocument();
  });

  it("avisa o repasse extra de equilíbrio sem tom de acusação", () => {
    render(<PrevidenciaHeroSection {...base} totalAporteAtuarial={250_000} />);
    expect(
      screen.getByText("Repasse extra para equilibrar o fundo"),
    ).toBeInTheDocument();
  });

  it("limita a barra de pago a 100% quando pago supera o reservado", () => {
    const { container } = render(
      <PrevidenciaHeroSection {...base} totalPago={2_000_000} />,
    );
    const larguras = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='width']"),
    ).map((el) => el.style.width);
    expect(larguras).toContain("100%");
    expect(larguras.every((l) => Number.parseFloat(l) <= 100)).toBe(true);
  });
});
