import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../badge";

describe("Badge", () => {
  it("usa rounded-sm e tokens", () => {
    render(<Badge variant="success">Ok</Badge>);
    expect(screen.getByText("Ok")).toHaveClass("rounded-sm", "text-ok");
  });

  it("variante padrão usa line e mute", () => {
    render(<Badge>Neutro</Badge>);
    expect(screen.getByText("Neutro")).toHaveClass("border-line");
  });
});
