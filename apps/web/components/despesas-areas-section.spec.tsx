import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildAreasPorEtapa } from "@/app/[portalSlug]/despesas/view-model";
import { DespesasAreasSection } from "./despesas-areas-section";

const areasPorEtapa = buildAreasPorEtapa([
  {
    funcaoCodigo: "10",
    funcaoNome: "Saúde",
    totalEmpenhado: 100,
    totalLiquidado: 90,
    totalPago: 10,
    percentualPago: 25,
  },
  {
    funcaoCodigo: "12",
    funcaoNome: "Educação",
    totalEmpenhado: 300,
    totalLiquidado: 60,
    totalPago: 30,
    percentualPago: 75,
  },
]);

const nomesNaOrdem = () =>
  screen
    .getAllByText(/^(Saúde|Educação)$/)
    .map((el) => el.textContent)
    .filter(Boolean);

describe("DespesasAreasSection", () => {
  it("não renderiza com lista vazia", () => {
    const { container } = render(
      <DespesasAreasSection areasPorEtapa={buildAreasPorEtapa([])} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("abre em Dinheiro que saiu e reordena ao trocar de etapa", () => {
    const { container } = render(
      <DespesasAreasSection areasPorEtapa={areasPorEtapa} />,
    );
    expect(
      screen.getByRole("button", { name: "Dinheiro que saiu" }),
    ).toHaveAttribute("aria-pressed", "true");
    const resumos = () =>
      Array.from(container.querySelectorAll("summary")).map(
        (s) => s.textContent,
      );
    expect(resumos()[0]).toContain("Educação");
    expect(resumos()[0]).toContain("75,00%");

    fireEvent.click(screen.getByRole("button", { name: "Serviço entregue" }));
    expect(resumos()[0]).toContain("Saúde");
    expect(resumos()[0]).toContain("60,00%");
    expect(nomesNaOrdem().length).toBe(2);
  });

  it("cada linha mostra as três etapas sem somá-las", () => {
    const { container } = render(
      <DespesasAreasSection areasPorEtapa={areasPorEtapa} />,
    );
    const primeira = container.querySelector("details");
    expect(primeira?.textContent).toContain("Reservado");
    expect(primeira?.textContent).toContain("Serviço entregue");
    expect(primeira?.textContent).toContain("Dinheiro que saiu");
    expect(primeira?.textContent).not.toContain("R$ 390");
  });
});
