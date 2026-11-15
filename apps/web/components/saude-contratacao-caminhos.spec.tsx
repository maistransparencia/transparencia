import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaudeContratacaoSection } from "./saude-contratacao-section";

const orcamento = {
  empenhado: 100_000_000,
  contratosVinculadosCount: 10,
  fornecedoresAtivosCount: 5,
};

const base = {};

describe("SaudeContratacaoSection: caminhos de contratação", () => {
  it("mostra o valor empenhado e a participação de cada caminho", () => {
    const { container } = render(
      <SaudeContratacaoSection
        portalSlug="x"
        orcamento={orcamento}
        licitacoesSaude={{
          ...base,
          caminhos: [
            {
              tipoContratacao: "adesao_ata_externa",
              quantidade: 133,
              valorEmpenhado: 13_000_000,
            },
          ],
        }}
      />,
    );
    expect(
      screen.getByText("Empenhos que citam ata de registro de preços"),
    ).toBeTruthy();
    expect(screen.getByText("133 empenhos")).toBeTruthy();
    expect(container.textContent).toMatch(/13,00%/);
  });

  it("explica a ausência de empenho ligado em vez de mostrar R$ 0", () => {
    render(
      <SaudeContratacaoSection
        portalSlug="x"
        orcamento={orcamento}
        licitacoesSaude={{
          ...base,
          caminhos: [
            {
              tipoContratacao: "licitacao_propria",
              quantidade: 17,
              valorEmpenhado: 0,
            },
          ],
        }}
      />,
    );
    expect(screen.getByText("17 licitações")).toBeTruthy();
    expect(
      screen.getByText(/não liga essas licitações às notas de empenho/),
    ).toBeTruthy();
  });

  it("mantém a barra entre 0% e 100% com empenho acima do total do Fundo", () => {
    const { container } = render(
      <SaudeContratacaoSection
        portalSlug="x"
        orcamento={orcamento}
        licitacoesSaude={{
          ...base,
          caminhos: [
            {
              tipoContratacao: "gap_licitacao",
              quantidade: 1,
              valorEmpenhado: 500_000_000,
            },
          ],
        }}
      />,
    );
    const barra = container.querySelector<HTMLElement>("div.h-full");
    expect(Number.parseFloat(barra?.style.width ?? "0")).toBe(100);
  });
});
