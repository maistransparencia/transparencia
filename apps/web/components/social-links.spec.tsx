import { fireEvent, render, screen } from "@testing-library/react";
import posthog from "posthog-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialLinks } from "./social-links";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

describe("SocialLinks component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve renderizar link do X.com com valores padrão", () => {
    render(<SocialLinks />);
    const link = screen.getByRole("link", { name: /@mtransparenciax/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://x.com/mtransparenciax");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("deve renderizar link do GitHub com valores padrão", () => {
    render(<SocialLinks />);
    const link = screen.getByRole("link", { name: /código aberto no github/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://github.com/maistransparencia/transparencia",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("deve renderizar link do Facebook com valores padrão", () => {
    render(<SocialLinks />);
    const link = screen.getByRole("link", {
      name: /página oficial no facebook/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://facebook.com/maistransparencia",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("deve disparar telemetria PostHog ao clicar no link do X", () => {
    render(<SocialLinks />);
    const link = screen.getByRole("link", { name: /@mtransparenciax/i });
    fireEvent.click(link);
    expect(posthog.capture).toHaveBeenCalledWith("social_link_clicked", {
      platform: "x",
      handle: "@mtransparenciax",
      url: "https://x.com/mtransparenciax",
    });
  });

  it("deve disparar telemetria PostHog ao clicar no link do Facebook", () => {
    render(<SocialLinks />);
    const link = screen.getByRole("link", {
      name: /página oficial no facebook/i,
    });
    fireEvent.click(link);
    expect(posthog.capture).toHaveBeenCalledWith("social_link_clicked", {
      platform: "facebook",
      url: "https://facebook.com/maistransparencia",
    });
  });

  it("deve permitir customização dos links via props", () => {
    render(
      <SocialLinks
        xUrl="https://x.com/custom_transparencia"
        xHandle="@custom_handle"
        githubUrl="https://github.com/custom/repo"
        facebookUrl="https://facebook.com/custom_transparencia"
      />,
    );

    const xLink = screen.getByRole("link", { name: /@custom_handle/i });
    expect(xLink).toHaveAttribute("href", "https://x.com/custom_transparencia");

    const ghLink = screen.getByRole("link", {
      name: /código aberto no github/i,
    });
    expect(ghLink).toHaveAttribute("href", "https://github.com/custom/repo");

    const fbLink = screen.getByRole("link", {
      name: /página oficial no facebook/i,
    });
    expect(fbLink).toHaveAttribute(
      "href",
      "https://facebook.com/custom_transparencia",
    );
  });
});
