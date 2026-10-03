import { describe, expect, it } from "vitest";
import { PORTAL_SLUG } from "../../test-helpers";
import {
  getAllPortais,
  getEntidades,
  getPortalConfig,
  getPortalSlugs,
  resolvePortalSlug,
} from "../metadata";

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
      expect(config.previdencia.cnpj).toBe("01180031000134");

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

  it("deve buscar lista de portais via getAllPortais ordenados por nome", async () => {
    const portais = await getAllPortais();
    expect(Array.isArray(portais)).toBe(true);
    expect(portais.length).toBe(2);

    const slugs = portais.map((p) => p.portalSlug);
    expect(slugs).toContain("porciuncula_prefeitura");
    expect(slugs).toContain("natividade_prefeitura");

    // Verificar ordenação estritamente alfabética por display_name
    for (let i = 0; i < portais.length - 1; i++) {
      expect(
        portais[i].displayName.localeCompare(portais[i + 1].displayName),
      ).toBeLessThanOrEqual(0);
    }
  });

  it("deve buscar lista de entidades de Natividade e suportar aliases", async () => {
    const entidades = await getEntidades("natividade_prefeitura");
    expect(Array.isArray(entidades)).toBe(true);
    expect(
      entidades.some((e) => e.nome.toUpperCase().includes("NATIVIDADE")),
    ).toBe(true);

    const entidadesAlias = await getEntidades("natividade");
    expect(entidadesAlias.length).toBe(entidades.length);
  });

  it("deve resolver aliases amigaveis em getPortalConfig e lidar com entradas nulas/indefinidas", async () => {
    const config = await getPortalConfig("porciuncula");
    expect(config).not.toBeNull();
    expect(config?.portalSlug).toBe("porciuncula_prefeitura");

    const configNat = await getPortalConfig("natividade");
    expect(configNat?.portalSlug).toBe("natividade_prefeitura");
    expect(configNat?.previdencia.sigla).toBe("NATPREVI");

    expect(resolvePortalSlug(null)).toBe("porciuncula_prefeitura");
    expect(resolvePortalSlug(undefined)).toBe("porciuncula_prefeitura");
    expect(resolvePortalSlug("natividade-prefeitura")).toBe(
      "natividade_prefeitura",
    );
  });

  it("deve retornar lista de slugs de portais", async () => {
    const slugs = await getPortalSlugs();
    expect(Array.isArray(slugs)).toBe(true);
    expect(slugs).toContain(PORTAL_SLUG);
    expect(slugs).toContain("natividade_prefeitura");
  });
});
