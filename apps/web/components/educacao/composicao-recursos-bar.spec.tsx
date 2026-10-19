import { render, screen } from "@testing-library/react";
import type {
  EducacaoOrigemRecursoDTO,
  GrupoFonteRecursoEducacao,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { ComposicaoRecursosBar } from "./composicao-recursos-bar";

function fonte(
  grupoFonte: GrupoFonteRecursoEducacao,
  percentualTotal: number,
): EducacaoOrigemRecursoDTO {
  return {
    grupoFonte,
    totalArrecadado: percentualTotal,
    percentualTotal,
    historicoAnual: [],
    composicao: [],
  };
}

describe("ComposicaoRecursosBar", () => {
  it("agrupa fontes abaixo de 3% em Outras e exibe <1% quando aplicável", () => {
    render(
      <ComposicaoRecursosBar
        fontes={[fonte("fundeb", 96), fonte("pnae", 2.5), fonte("pnate", 0.5)]}
      />,
    );
    const label = screen
      .getByTestId("composicao-recursos-bar")
      .getAttribute("aria-label");
    expect(label).toContain("FUNDEB 96%");
    expect(label).toContain("Outras 3%");
    expect(label).not.toContain("Merenda");
    render(
      <ComposicaoRecursosBar
        fontes={[fonte("fundeb", 99.5), fonte("pnate", 0.5)]}
      />,
    );
    expect(
      screen.getAllByText(/Outras · 1%|Outras · <1%/).length,
    ).toBeGreaterThan(0);
  });

  it("soma os menores a Outras receitas quando ela já é segmento principal", () => {
    render(
      <ComposicaoRecursosBar
        fontes={[
          fonte("fundeb", 70),
          fonte("outras_receitas", 28),
          fonte("pnate", 2),
        ]}
      />,
    );
    const label = screen
      .getByTestId("composicao-recursos-bar")
      .getAttribute("aria-label");
    expect(label).toContain("Outras receitas 30%");
    expect(label?.match(/Outras/g)).toHaveLength(1);
  });

  it("Não detalhado vira segmento próprio se >= 3% e entra em Outras se menor", () => {
    render(
      <ComposicaoRecursosBar
        fontes={[
          fonte("fundeb", 90),
          fonte("nao_detalhado", 6),
          fonte("pnate", 4),
        ]}
      />,
    );
    expect(
      screen.getByTestId("composicao-recursos-bar").getAttribute("aria-label"),
    ).toContain("Não detalhado 6%");
  });
});
