import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatRow } from "../stat-row";

describe("StatRow", () => {
  it("renderiza rótulo e valor com filete de 1px", () => {
    const { container } = render(<StatRow label="Total" value="R$ 5" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("R$ 5")).toHaveClass("text-right");
    expect(container.firstElementChild).toHaveClass("border-b", "border-line");
  });
});
