import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CollapsibleSection } from "../collapsible-section";

const renderSection = (defaultOpen?: boolean) =>
  render(
    <CollapsibleSection
      id="contratos"
      title="Contratos"
      summary="12 contratos"
      defaultOpen={defaultOpen}
    >
      <p>Conteúdo</p>
    </CollapsibleSection>,
  );

describe("CollapsibleSection", () => {
  afterEach(() => {
    window.location.hash = "";
  });

  it("nasce recolhida e mostra título e resumo", () => {
    const { container } = renderSection();
    expect(container.querySelector("details")).not.toHaveAttribute("open");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "Contratos",
    );
    expect(screen.getByText("12 contratos")).toBeInTheDocument();
  });

  it("abre com defaultOpen", () => {
    const { container } = renderSection(true);
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("abre quando a âncora aponta para ela", () => {
    window.location.hash = "#contratos";
    const { container } = renderSection();
    expect(container.querySelector("details")).toHaveAttribute("open");
  });

  it("abre tudo na impressão", () => {
    const { container } = renderSection();
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(container.querySelector("details")).toHaveAttribute("open");
  });
});
