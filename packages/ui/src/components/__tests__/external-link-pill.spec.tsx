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

  it("avisa leitores de tela que abre em nova aba", () => {
    render(<ExternalLinkPill href="https://x.gov.br">Lei</ExternalLinkPill>);
    expect(
      screen.getByRole("link", { name: /abre em nova aba/ }),
    ).toBeInTheDocument();
  });

  it("repassa className e props extras", () => {
    render(
      <ExternalLinkPill
        href="http://x.gov.br"
        className="extra"
        data-testid="pill"
        aria-label="Lei federal"
      >
        Lei
      </ExternalLinkPill>,
    );
    const link = screen.getByTestId("pill");
    expect(link).toHaveClass("extra", "rounded-full");
    expect(link).toHaveAttribute("aria-label", "Lei federal");
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "/relativo", ""])(
    "não renderiza link navegável para href inválido (%s)",
    (href) => {
      render(<ExternalLinkPill href={href}>Lei</ExternalLinkPill>);
      expect(screen.queryByRole("link")).toBeNull();
      expect(screen.getByText("Lei")).toBeInTheDocument();
    },
  );
});
