import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/Ficaram .* sem pagar/)).toBeTruthy();
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
    expect(screen.queryByText(/Ficaram .* sem pagar/)).toBeNull();
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

  it("diz que o percentual do mínimo usa o cálculo do SIOPE, não a soma da função Educação", () => {
    render(
      <EducacaoMemoriaCalculo
        ano={2024}
        isCurrentYear={false}
        partialPeriod=""
        execucao={execucao}
      />,
    );
    expect(screen.getByText(/vem do SIOPE e usa outro cálculo/)).toBeTruthy();
  });
});
