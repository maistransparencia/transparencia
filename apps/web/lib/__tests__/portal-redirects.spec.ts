import { describe, expect, it } from "vitest";

describe("next.config.js municipal alias redirects", () => {
  it("deve conter regras de redirecionamento HTTP 308 para todos os aliases municipais", async () => {
    const nextConfig = await import("../../next.config.js");
    const config = nextConfig.default || nextConfig;
    if (typeof config.redirects !== "function") {
      throw new Error("config.redirects is not a function");
    }
    const redirects = await config.redirects();
    expect(Array.isArray(redirects)).toBe(true);

    const checkRedirect = (source: string, destination: string) => {
      const match = redirects.find(
        (r: { source: string; destination: string; permanent?: boolean }) =>
          r.source === source &&
          r.destination === destination &&
          r.permanent === true,
      );
      expect(
        match,
        `Redirecionamento não encontrado: ${source} -> ${destination}`,
      ).toBeDefined();
    };

    // Natividade
    checkRedirect("/natividade", "/natividade_prefeitura");
    checkRedirect("/natividade/:path*", "/natividade_prefeitura/:path*");

    // Porciúncula
    checkRedirect("/porciuncula", "/porciuncula_prefeitura");
    checkRedirect("/porciuncula/:path*", "/porciuncula_prefeitura/:path*");

    // Previdência canônica
    checkRedirect("/:portalSlug/caprem", "/:portalSlug/previdencia");
    checkRedirect(
      "/:portalSlug/caprem/:path*",
      "/:portalSlug/previdencia/:path*",
    );
  });
});
