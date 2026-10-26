import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PipelineExecucao } from "./pipeline-execucao";

describe("PipelineExecucao", () => {
  const etapas = [
    {
      name: "Dotação",
      formattedValue: "R$ 10 mi",
      percentage: 100,
      label: "100% autorizado",
      corToken: "ok" as const,
    },
    {
      name: "Pago",
      formattedValue: "R$ 5 mi",
      percentage: 50,
      label: "50% da dotação",
    },
  ];

  it("renderiza nome, valor e rótulo de cada etapa", () => {
    render(<PipelineExecucao stages={etapas} detailUrl="/x" />);
    etapas.forEach((etapa) => {
      expect(screen.getByText(etapa.name)).toBeInTheDocument();
      expect(screen.getByText(etapa.formattedValue)).toBeInTheDocument();
      expect(screen.getByText(etapa.label)).toBeInTheDocument();
    });
  });

  it("aplica a cor por token e usa brand quando falta", () => {
    const { container } = render(<PipelineExecucao stages={etapas} />);
    const cores = Array.from(
      container.querySelectorAll<HTMLElement>("[style*='width']"),
    ).map((barra) => barra.style.backgroundColor);
    expect(cores).toEqual(["var(--ok)", "var(--brand)"]);
  });

  it("nao renderiza o filete final quando nao ha etapas", () => {
    const { container } = render(<PipelineExecucao stages={[]} />);
    expect(container.querySelector("[aria-hidden='true'].border-t")).toBeNull();
  });

  it("renderiza a barra acima do valor em cada etapa", () => {
    render(<PipelineExecucao stages={etapas} />);
    const valor = screen.getByText("R$ 5 mi");
    const barra = valor.parentElement?.querySelector("[style*='width']");
    expect(barra).not.toBeNull();
    expect(
      (barra?.compareDocumentPosition(valor) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
