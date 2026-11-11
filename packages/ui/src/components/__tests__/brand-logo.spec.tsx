import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "../brand-logo";

describe("BrandLogo", () => {
  it("usa as variáveis do rodapé na variante footer", () => {
    const { container } = render(<BrandLogo />);

    expect(container.querySelector("rect")).toHaveAttribute(
      "fill",
      "var(--footer-logo-tile)",
    );
    expect(container.querySelector("g")).toHaveAttribute(
      "fill",
      "var(--footer-logo-glyph)",
    );
  });

  it("usa os tokens da página na variante header", () => {
    const { container } = render(<BrandLogo variant="header" />);

    expect(container.querySelector("rect")).toHaveClass("fill-brand-fill");
    expect(container.querySelector("rect")).not.toHaveAttribute("fill");
    expect(container.querySelector("g")).toHaveClass("fill-page");
  });

  it("fica oculta para leitores de tela", () => {
    const { container } = render(<BrandLogo variant="header" />);

    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
