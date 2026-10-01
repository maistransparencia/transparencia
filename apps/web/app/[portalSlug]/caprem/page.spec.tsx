import { permanentRedirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import CapremRedirectPage from "./page";

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn(),
}));

const mockPermanentRedirect = vi.mocked(permanentRedirect);

describe("CapremRedirectPage (HTTP 308)", () => {
  it("redireciona para /[portalSlug]/previdencia sem searchParams", async () => {
    await CapremRedirectPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({}),
    });

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/previdencia",
    );
  });

  it("redireciona para /[portalSlug]/previdencia preservando parâmetros de busca (ex: ano)", async () => {
    await CapremRedirectPage({
      params: Promise.resolve({ portalSlug: "porciuncula_prefeitura" }),
      searchParams: Promise.resolve({ ano: "2024", empresa: "prefeitura" }),
    });

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      "/porciuncula_prefeitura/previdencia?ano=2024&empresa=prefeitura",
    );
  });

  it("preserva múltiplos valores em parâmetros de busca", async () => {
    await CapremRedirectPage({
      params: Promise.resolve({ portalSlug: "natividade" }),
      searchParams: Promise.resolve({ entidade: ["1", "2"] }),
    });

    expect(mockPermanentRedirect).toHaveBeenCalledWith(
      "/natividade/previdencia?entidade=1&entidade=2",
    );
  });
});
