// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { LicitacoesSearchBar } from "./licitacoes-search-bar";

vi.mock("posthog-js", () => ({
  default: {
    capture: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("LicitacoesSearchBar no servidor", () => {
  it("renderiza com termoInicial (link compartilhado com ?q=) sem acessar document", () => {
    expect(typeof document).toBe("undefined");

    const html = renderToString(
      <LicitacoesSearchBar
        portalSlug="portal_teste"
        ano={2024}
        termoInicial="locação"
      />,
    );

    expect(html).toContain("Abrir busca global de licitações e contratos");
  });
});
