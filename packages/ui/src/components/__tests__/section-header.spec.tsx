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

  it("usa h2 por padrão e aceita h1/h3", () => {
    const { rerender } = render(<SectionHeader title="A" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    rerender(<SectionHeader title="A" as="h1" />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    rerender(<SectionHeader title="A" as="h3" />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
  });

  it.each([undefined, "", 0])(
    "omite descrição e ação quando vazias (%s)",
    (vazio) => {
      const { container } = render(
        <SectionHeader title="A" description={vazio} action={vazio} />,
      );
      expect(container.querySelector("p")).toBeNull();
      expect(container.querySelectorAll("header > div > div")).toHaveLength(0);
    },
  );
});
