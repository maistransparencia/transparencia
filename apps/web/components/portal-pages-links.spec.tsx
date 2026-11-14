import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PortalPagesLinks } from "./portal-pages-links";

afterEach(() => {
  document.cookie = "preferred_portal=; max-age=0; path=/";
  window.localStorage.clear();
});

describe("PortalPagesLinks", () => {
  it("usa o município do último contexto", async () => {
    document.cookie = "preferred_portal=portal_x; path=/";
    render(<PortalPagesLinks />);
    expect(
      await screen.findByRole("link", { name: "Metodologia e fontes" }),
    ).toHaveAttribute("href", "/portal_x/metodologia");
    expect(screen.getByRole("link", { name: "Sobre" })).toHaveAttribute(
      "href",
      "/portal_x/sobre",
    );
  });

  it("sem contexto leva à lista de portais", () => {
    render(<PortalPagesLinks />);
    expect(
      screen.getByRole("link", { name: "escolha um município" }),
    ).toHaveAttribute("href", "/?mudar=true");
  });

  it("ignora slug inválido", () => {
    document.cookie = "preferred_portal=../x; path=/";
    render(<PortalPagesLinks />);
    expect(
      screen.getByRole("link", { name: "escolha um município" }),
    ).toBeInTheDocument();
  });
});
