import { render, screen } from "@testing-library/react";
import type { FontesReceitaSaudeDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { SaudeOrigemRecursos } from "./saude-origem-recursos";

const fontes: FontesReceitaSaudeDTO = {
  percentualUniaoSus: 40,
  percentualEstado: 10,
  percentualPropria: 45,
  percentualOutrasReceitas: 5,
  receitaUniao: 16_000_000,
  receitaEstado: 4_000_000,
  repassesPrefeitura: 18_000_000,
  receitaOutras: 2_000_000,
  totalEntrada: 40_000_000,
  emendasParlamentares: 0,
};

describe("SaudeOrigemRecursos", () => {
  it("mostra as quatro origens com valor e percentual do que entrou", () => {
    render(<SaudeOrigemRecursos fontes={fontes} ano={2026} />);
    expect(screen.getByText("Transferências da União")).toBeTruthy();
    expect(screen.getByText("Repasses da Prefeitura")).toBeTruthy();
    expect(screen.getByText("45% do que entrou")).toBeTruthy();
    expect(screen.getByRole("img").getAttribute("aria-label")).toContain(
      "Repasses da Prefeitura 45%",
    );
  });

  it("limita a largura dos segmentos entre 0% e 100%", () => {
    const { container } = render(
      <SaudeOrigemRecursos
        fontes={{ ...fontes, percentualUniaoSus: 130, percentualEstado: -5 }}
        ano={2026}
      />,
    );
    const larguras = Array.from(
      container.querySelectorAll<HTMLElement>("span.block.h-full"),
    ).map((el) => Number.parseFloat(el.style.width));
    expect(larguras[0]).toBe(100);
    expect(larguras[1]).toBe(0);
  });

  it("mostra estado vazio neutro quando nada entrou", () => {
    render(
      <SaudeOrigemRecursos
        fontes={{ ...fontes, totalEntrada: 0 }}
        ano={2026}
      />,
    );
    expect(
      screen.getByText("Sem lançamentos de receita do Fundo em 2026."),
    ).toBeTruthy();
  });
});
