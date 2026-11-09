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
        historico={
          {
            anosIniciais: { pontos: [{ ano: 2019 }, { ano: 2023 }] },
            anosFinais: { pontos: [{ ano: 2021 }] },
          } as EducacaoViewModel["historico"]
        }
        initialEtapa="anosIniciais"
      />,
    );
    expect(
      screen.getByRole("region", { name: "Aprendizado dos alunos" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Aprendizado dos alunos (2019–2023)",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/Nota do IDEB, de 0 a 10, medida a cada dois anos/),
    ).toBeTruthy();
    expect(screen.getByTestId("historico")).toBeTruthy();
    expect(container.querySelector("dt")).toBeNull();
  });
});
