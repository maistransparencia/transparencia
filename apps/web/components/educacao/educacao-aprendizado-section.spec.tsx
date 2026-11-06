import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  AprendizadoEtapa,
  EducacaoViewModel,
} from "@/app/[portalSlug]/educacao/view-model";
import { EducacaoAprendizadoSection } from "./educacao-aprendizado-section";

vi.mock("./educacao-historico-section", () => ({
  EducacaoHistoricoSection: () => <div data-testid="historico" />,
}));

const etapa = {} as AprendizadoEtapa;

describe("EducacaoAprendizadoSection", () => {
  it("abre com duas linhas e entrega o resto ao gráfico de histórico", () => {
    const { container } = render(
      <EducacaoAprendizadoSection
        aprendizado={{ anosIniciais: etapa, anosFinais: etapa }}
        historico={{} as EducacaoViewModel["historico"]}
        initialEtapa="anosIniciais"
      />,
    );
    expect(
      screen.getByRole("region", { name: "Aprendizado dos alunos" }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Nota do IDEB, de 0 a 10, medida a cada dois anos/),
    ).toBeTruthy();
    expect(screen.getByTestId("historico")).toBeTruthy();
    expect(container.querySelector("dt")).toBeNull();
  });
});
