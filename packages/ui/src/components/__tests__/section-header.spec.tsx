import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "../section-header";

describe("SectionHeader", () => {
  it("renderiza filete, título serif, descrição e ação", () => {
    const { container } = render(
      <SectionHeader
        title="Despesas"
        description="Resumo"
        action={<a href="/x">Ver tudo</a>}
      />,
    );
    expect(container.firstElementChild).toHaveClass("border-t-2", "border-ink");
    expect(screen.getByRole("heading", { name: "Despesas" })).toHaveClass(
      "font-serif",
    );
    expect(screen.getByText("Resumo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver tudo" })).toBeInTheDocument();
  });
});
