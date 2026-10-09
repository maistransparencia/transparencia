import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OGHomeCardTemplate } from "./og-home-card-template";

describe("OGHomeCardTemplate", () => {
  it("renderiza o cabeçalho institucional com marca, slogan cívico e domínio", () => {
    render(<OGHomeCardTemplate />);

    expect(screen.getByText("MaisTransparencia")).toBeInTheDocument();
    expect(
      screen.getByText("Monitoramento Cívico Independente"),
    ).toBeInTheDocument();
    expect(screen.getByText("maistransparencia.com")).toBeInTheDocument();
    expect(
      screen.getByText("Transparência Fiscal dos Municípios"),
    ).toBeInTheDocument();
  });

  it("renderiza os pilares de valor e fallback neutro quando nenhuma cidade é informada", () => {
    render(<OGHomeCardTemplate />);

    expect(screen.getByText("Cidades Monitoradas")).toBeInTheDocument();
    expect(screen.getByText("Municípios Integrados")).toBeInTheDocument();
    expect(screen.getByText("Radar Cívico")).toBeInTheDocument();
    expect(screen.getByText("Detecção de Anomalias")).toBeInTheDocument();
    expect(screen.getByText("100% Auditável")).toBeInTheDocument();

    const neutralIcon = screen.getByRole("img", {
      name: "Municípios Integrados",
    });
    expect(neutralIcon).toBeInTheDocument();
  });

  it("renderiza cidades personalizadas quando fornecidas via prop", () => {
    render(
      <OGHomeCardTemplate
        cities={[
          {
            slug: "cidade_teste",
            name: "Cidade Exemplo",
            uf: "RJ",
            brasaoAsset: "brasao-porciuncula.png",
          },
        ]}
      />,
    );

    expect(screen.getByText("Cidade Exemplo")).toBeInTheDocument();
    const imgCustom = screen.getByRole("img", {
      name: "Brasão de Cidade Exemplo",
    });
    expect(imgCustom).toBeInTheDocument();
  });
});
