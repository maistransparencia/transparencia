import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertBox } from "../alert-box";

describe("AlertBox", () => {
  it("renderiza título e conteúdo com tokens", () => {
    const { container } = render(
      <AlertBox type="danger" title="Atenção">
        Texto
      </AlertBox>,
    );
    expect(screen.getByText("Atenção")).toBeInTheDocument();
    expect(screen.getByText("Texto")).toBeInTheDocument();
    expect(screen.getByText("Atenção").tagName).toBe("P");
    expect(container.firstElementChild).toHaveClass(
      "border-l-[3px]",
      "border-danger-fill",
    );
    expect(container.firstElementChild?.className).not.toMatch(
      /rose|amber|slate|rounded|shadow/,
    );
  });
});
