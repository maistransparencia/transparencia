import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExternalLinkPill } from "../external-link-pill";

describe("ExternalLinkPill", () => {
  it("abre em nova aba com rel seguro e classes de pílula", () => {
    render(
      <ExternalLinkPill href="https://exemplo.gov.br">Lei</ExternalLinkPill>,
    );
    const link = screen.getByRole("link", { name: /Lei/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("rounded-full", "border-pill");
  });
});
