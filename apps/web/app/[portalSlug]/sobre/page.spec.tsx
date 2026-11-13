import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/metadata", () => ({ createPortalMetadata: vi.fn() }));

const { default: SobrePage } = await import("./page");

describe("SobrePage", () => {
  it("linka para metodologia e como atualizamos do mesmo município", async () => {
    render(
      await SobrePage({ params: Promise.resolve({ portalSlug: "portal_x" }) }),
    );
    expect(
      screen.getByRole("link", { name: "Metodologia e fontes" }),
    ).toHaveAttribute("href", "/portal_x/metodologia");
    expect(
      screen.getByRole("link", { name: "Como atualizamos" }),
    ).toHaveAttribute("href", "/portal_x/como-atualizamos");
  });
});
