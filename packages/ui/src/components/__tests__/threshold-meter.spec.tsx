import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThresholdMeter } from "../threshold-meter";

const propsBase = {
  label: "Aplicado em ensino",
  valueText: "27,4% aplicado; mínimo de 25%",
  threshold: 25,
  thresholdLabel: "mínimo 25%",
};

describe("ThresholdMeter", () => {
  it("expõe o valor por texto acessível e mostra o rótulo do marcador", () => {
    render(<ThresholdMeter value={27.4} {...propsBase} />);
    const medidor = screen.getByRole("meter", { name: "Aplicado em ensino" });
    expect(medidor.getAttribute("aria-valuenow")).toBe("27.4");
    expect(medidor.getAttribute("aria-valuetext")).toBe(
      "27,4% aplicado; mínimo de 25%",
    );
    expect(screen.getByText("mínimo 25%")).toBeTruthy();
  });

  it("é quadrada: trilho bg-track h-3, sem rounded, e posiciona fill e marcador", () => {
    const { container } = render(<ThresholdMeter value={40} {...propsBase} />);
    const trilho = container.querySelector(".bg-track");
    expect(trilho?.className).toContain("h-3");
    expect(container.innerHTML).not.toMatch(/rounded/);
    const preenchimento = container.querySelector<HTMLElement>(
      "[data-testid='threshold-meter-fill']",
    );
    expect(preenchimento?.style.width).toBe("40%");
    const marcador = container.querySelector<HTMLElement>(
      "[data-testid='threshold-meter-marker']",
    );
    expect(marcador?.style.left).toBe("25%");
  });

  it("limita o preenchimento ao máximo da escala", () => {
    const { container } = render(
      <ThresholdMeter value={140} max={100} {...propsBase} />,
    );
    expect(
      container.querySelector<HTMLElement>(
        "[data-testid='threshold-meter-fill']",
      )?.style.width,
    ).toBe("100%");
  });

  it("usa a escala informada (nota de 0 a 10 com meta)", () => {
    const { container } = render(
      <ThresholdMeter
        value={6.1}
        max={10}
        label="Nota do IDEB"
        valueText="6,1 de 10; meta 6,0"
        threshold={6}
        thresholdLabel="meta 6,0"
      />,
    );
    expect(
      container.querySelector<HTMLElement>(
        "[data-testid='threshold-meter-fill']",
      )?.style.width,
    ).toBe("61%");
    expect(
      container.querySelector<HTMLElement>(
        "[data-testid='threshold-meter-marker']",
      )?.style.left,
    ).toBe("60%");
  });

  it("sem valor não desenha a barra", () => {
    const { container } = render(
      <ThresholdMeter value={null} {...propsBase} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("pinta só por tokens -fill e nunca por paleta fixa", () => {
    const { container } = render(
      <ThresholdMeter value={10} tone="danger" {...propsBase} />,
    );
    expect(container.innerHTML).toContain("bg-danger-fill");
    expect(container.innerHTML).not.toMatch(
      /(^|[\s"])(slate-|gray-|bg-white|dark:)/,
    );
  });
});
