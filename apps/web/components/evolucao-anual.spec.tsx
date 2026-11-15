import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EvolucaoAnual } from "./evolucao-anual";

const data = [
  { ano: 2024, empenhado: 40_000_000, pago: 30_000_000 },
  { ano: 2025, empenhado: 50_000_000, pago: 45_000_000 },
];

describe("EvolucaoAnual", () => {
  it("mostra reservado e pago de cada ano", () => {
    render(<EvolucaoAnual data={data} selectedYear={2025} />);
    expect(screen.getByText("2024")).toBeTruthy();
    expect(screen.getByText("2025")).toBeTruthy();
    expect(screen.getByText("Reservado (empenhado)")).toBeTruthy();
    expect(screen.getByText("Pago")).toBeTruthy();
    expect(screen.getByText("R$ 50,0 mi")).toBeTruthy();
    expect(screen.getByText("R$ 45,0 mi")).toBeTruthy();
  });

  it("marca o ano em andamento", () => {
    render(<EvolucaoAnual data={data} partialYear={2025} />);
    expect(
      screen.getByText(/em andamento/, { selector: "span.caption" }),
    ).toBeTruthy();
  });

  it("mantém as barras entre 0% e 100% mesmo com pago acima do reservado", () => {
    const { container } = render(
      <EvolucaoAnual data={[{ ano: 2025, empenhado: 10, pago: 30 }]} />,
    );
    const larguras = Array.from(
      container.querySelectorAll<HTMLElement>("div.h-full"),
    ).map((el) => Number.parseFloat(el.style.width));
    expect(larguras.every((largura) => largura >= 0 && largura <= 100)).toBe(
      true,
    );
  });

  it("mostra estado vazio neutro sem dados", () => {
    render(<EvolucaoAnual data={[]} />);
    expect(
      screen.getByText("Sem execução registrada para comparar os anos."),
    ).toBeTruthy();
  });

  it("aceita uma mensagem vazia própria de cada área", () => {
    render(
      <EvolucaoAnual
        data={[]}
        mensagemVazia="Sem execução da educação registrada."
      />,
    );
    expect(
      screen.getByText("Sem execução da educação registrada."),
    ).toBeTruthy();
  });
});
