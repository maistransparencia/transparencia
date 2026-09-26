import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/porciuncula_prefeitura",
}));

describe("Sidebar Component", () => {
  it("exibe badge com contagem e pulso suave ao lado de Radar Cívico quando radarAlertCount > 0", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={3}
      />,
    );

    const badge = screen.getByLabelText("3 alertas críticos apurados");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("3");

    // Valida respeito à acessibilidade (motion-safe e motion-reduce)
    const dot = badge.querySelector('[aria-hidden="true"]');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass("motion-safe:animate-pulse");
    expect(dot).toHaveClass("motion-reduce:animate-none");
  });

  it("não exibe badge quando radarAlertCount for 0", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={0}
      />,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("não exibe badge quando radarAlertCount for indefinido", () => {
    render(
      <Sidebar portalName="Porciúncula" portalSlug="porciuncula_prefeitura" />,
    );

    expect(
      screen.queryByLabelText(/alertas críticos apurados/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renderiza o item de navegação Radar Cívico", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        radarAlertCount={5}
      />,
    );

    expect(screen.getByText("Radar Cívico")).toBeInTheDocument();
  });

  it("renderiza pwaInstallSlot quando fornecido", () => {
    render(
      <Sidebar
        portalName="Porciúncula"
        portalSlug="porciuncula_prefeitura"
        pwaInstallSlot={<button type="button">Instalar App Teste</button>}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Instalar App Teste" }),
    ).toBeInTheDocument();
  });
});
