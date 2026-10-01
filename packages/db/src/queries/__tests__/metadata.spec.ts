import { describe, expect, it } from "vitest";
import { PORTAL_SLUG } from "../../test-helpers";
import { getEntidades, getPortalConfig, getPortalSlugs } from "../metadata";

describe("metadata", () => {
  it("deve buscar portal config com metadados de previdencia e highlights", async () => {
    const config = await getPortalConfig(PORTAL_SLUG);
    expect(config).not.toBeNull();
    if (config) {
      expect(typeof config.portalSlug).toBe("string");
      expect(typeof config.displayName).toBe("string");
      expect(typeof config.uf).toBe("string");
      expect(typeof config.anoInicial).toBe("number");
      expect(typeof config.empresaPadrao).toBe("string");
      expect(typeof config.dataExtracao).toBe("string");
      expect(
        config.dataExtracaoDate === null ||
          config.dataExtracaoDate instanceof Date,
      ).toBe(true);

      // Previdência
      expect(config.previdencia).toBeDefined();
      expect(typeof config.previdencia.habilitado).toBe("boolean");
      expect(config.previdencia.habilitado).toBe(true);
      expect(config.previdencia.sigla).toBe("CAPREM");
      expect(config.previdencia.nome).toContain("Porciúncula");

      // Highlights
      expect(Array.isArray(config.highlights)).toBe(true);
      expect(config.highlights.length).toBeGreaterThan(0);
      const saudeHighlight = config.highlights.find((h) => h.slug === "saude");
      expect(saudeHighlight).toBeDefined();
      expect(saudeHighlight?.titulo).toBe("Saúde");
      expect(saudeHighlight?.icone).toBe("HeartPulse");

      const previdenciaHighlight = config.highlights.find(
        (h) => h.slug === "previdencia",
      );
      expect(previdenciaHighlight).toBeDefined();
      expect(previdenciaHighlight?.titulo).toBe("CAPREM");
      expect(previdenciaHighlight?.icone).toBe("Landmark");
    }
  });

  it("deve retornar null para portal inexistente", async () => {
    const config = await getPortalConfig("portal_inexistente_xyz_123");
    expect(config).toBeNull();
  });

  it("deve buscar lista de entidades", async () => {
    const entidades = await getEntidades(PORTAL_SLUG);
    expect(Array.isArray(entidades)).toBe(true);
  });

  it("deve retornar lista de slugs de portais", async () => {
    const slugs = await getPortalSlugs();
    expect(Array.isArray(slugs)).toBe(true);
    expect(slugs).toContain(PORTAL_SLUG);
  });
});
