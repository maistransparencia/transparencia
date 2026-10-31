import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ObraItemViewModel } from "@/app/[portalSlug]/obras/view-model";
import { ObrasParalisadasSection } from "./obras-paralisadas-section";

const obra = {
  idProjeto: "p1",
  nomeObra: "Reforma da praça",
  motivoParalisacao: null,
  mesesParalisada: 1,
  hasCoordinates: true,
  percentualExecucaoFormatado: "30%",
  dataUltimaMedicaoFormatada: "",
  valorInvestimentoPrevisto: 100000,
} as unknown as ObraItemViewModel;

describe("ObrasParalisadasSection", () => {
  it("não renderiza nada sem obras paralisadas", () => {
    const { container } = render(<ObrasParalisadasSection obras={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra tempo parado, motivo ausente e links externos seguros", () => {
    render(<ObrasParalisadasSection obras={[obra]} />);
    expect(
      screen.getByRole("region", { name: /Obras paralisadas/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Paralisada há 1 mês")).toBeInTheDocument();
    expect(
      screen.getByText(/Não informado pelo órgão responsável/),
    ).toBeInTheDocument();
    expect(screen.getByText("N/D")).toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(screen.getByTestId("obra-paralisada-card").className).not.toMatch(
      /rounded|shadow/,
    );
  });

  it("dispara a abertura de detalhes pela obra escolhida", () => {
    const aoSelecionar = vi.fn();
    render(
      <ObrasParalisadasSection obras={[obra]} onSelectObra={aoSelecionar} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ver detalhes/ }));
    expect(aoSelecionar).toHaveBeenCalledWith("p1");
  });
});
