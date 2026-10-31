import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaudeEvolucaoAnual } from "./saude-evolucao-anual";

const data = [
  { ano: 2024, empenhado: 40_000_000, pago: 30_000_000 },
  { ano: 2025, empenhado: 50_000_000, pago: 45_000_000 },
];

describe("SaudeEvolucaoAnual", () => {
  it("mostra reservado e pago de cada ano", () => {
    render(<SaudeEvolucaoAnual data={data} selectedYear={2025} />);
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.getAllByText("Reservado")).toHaveLength(2);
    expect(screen.getAllByText("Pago")).toHaveLength(2);
  });

  it("avisa que o ano em andamento não deve ser comparado com anos completos", () => {
    render(
      <SaudeEvolucaoAnual
        data={data}
        partialYear={2025}
        partialPeriod="jan–out"
      />,
    );
    expect(screen.getByText("em andamento")).toBeTruthy();
    expect(
      screen.getByText(/não deve ser comparado com anos completos/),
    ).toBeTruthy();
  });

  it("mantém as barras entre 0% e 100% mesmo com pago acima do reservado", () => {
    const { container } = render(
      <SaudeEvolucaoAnual data={[{ ano: 2025, empenhado: 10, pago: 30 }]} />,
    );
    const larguras = Array.from(
      container.querySelectorAll<HTMLElement>("div.h-full"),
    ).map((el) => Number.parseFloat(el.style.width));
    expect(larguras.every((largura) => largura >= 0 && largura <= 100)).toBe(
      true,
    );
  });

  it("mostra estado vazio neutro sem dados", () => {
    render(<SaudeEvolucaoAnual data={[]} />);
    expect(
      screen.getByText(
        "Sem execução da saúde registrada para comparar os anos.",
      ),
    ).toBeTruthy();
  });
});
