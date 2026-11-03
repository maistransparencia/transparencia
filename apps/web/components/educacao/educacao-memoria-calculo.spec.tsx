import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EducacaoExecucaoAnoView } from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoMemoriaCalculo } from "./educacao-memoria-calculo";

const execucao: EducacaoExecucaoAnoView = {
  ano: 2024,
  empenhado: 10_000_000,
  liquidado: 9_000_000,
  pago: 8_000_000,
  pagoSemPessoal: 3_000_000,
  temDados: true,
};

describe("EducacaoMemoriaCalculo", () => {
  it("mostra reservado, liquidado, pago e o que ficou sem pagar", () => {
    render(
      <EducacaoMemoriaCalculo
        ano={2024}
        isCurrentYear={false}
        partialPeriod=""
        execucao={execucao}
      />,
    );
    expect(screen.getByText("Dinheiro que saiu (pago)")).toBeTruthy();
    expect(screen.getByText(/^80.*% do reservado$/)).toBeTruthy();
    expect(screen.getByText(/sem pagar dentro do ano/)).toBeTruthy();
  });

  it("no ano em andamento não diz quanto ficou sem pagar", () => {
    render(
      <EducacaoMemoriaCalculo
        ano={2025}
        isCurrentYear
        partialPeriod="até o 3º bimestre"
        execucao={{ ...execucao, ano: 2025 }}
      />,
    );
    expect(screen.queryByText(/sem pagar dentro do ano/)).toBeNull();
  });

  it("sem despesas mostra traço e a causa", () => {
    render(
      <EducacaoMemoriaCalculo
        ano={2024}
        isCurrentYear={false}
        partialPeriod=""
        execucao={{
          ...execucao,
          empenhado: 0,
          liquidado: 0,
          pago: 0,
          temDados: false,
        }}
      />,
    );
    expect(screen.getAllByText("—")).toHaveLength(3);
    expect(screen.getAllByText("sem despesas registradas em 2024").length).toBe(
      3,
    );
  });

  it("lei e fonte ficam abaixo, com a lei em nova aba", () => {
    render(
      <EducacaoMemoriaCalculo
        ano={2024}
        isCurrentYear={false}
        partialPeriod=""
        execucao={execucao}
      />,
    );
    const modal = screen.getByTestId("gasto-educacao");
    const lei = within(modal).getByRole("link", { name: /Lei 4.320\/1964/ });
    expect(lei.getAttribute("target")).toBe("_blank");
    expect(lei.getAttribute("rel")).toBe("noopener noreferrer");
    expect(
      within(modal).getByText(/execução orçamentária da Prefeitura/),
    ).toBeTruthy();
  });
});
