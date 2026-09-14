import * as dbModule from "@transparencia/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadRadarData, requirePortalSlug } from "./loader";

vi.mock("@transparencia/db", () => ({
  getPortalConfig: vi.fn(),
  getEntidades: vi.fn(),
  getRadarCivicoAlertas: vi.fn(),
}));

describe("radar/loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requirePortalSlug lança erro se o slug for vazio", () => {
    expect(() => requirePortalSlug("")).toThrow("portalSlug vazio");
    expect(() => requirePortalSlug("   ")).toThrow("portalSlug vazio");
    expect(requirePortalSlug("porciuncula")).toBe("porciuncula");
  });

  it("loadRadarData consulta alertas sem restringir ano quando ano não é informado", async () => {
    vi.mocked(dbModule.getPortalConfig).mockResolvedValue({
      displayName: "Porciúncula",
    } as unknown as Awaited<ReturnType<typeof dbModule.getPortalConfig>>);
    vi.mocked(dbModule.getEntidades).mockResolvedValue(
      [] as unknown as Awaited<ReturnType<typeof dbModule.getEntidades>>,
    );
    vi.mocked(dbModule.getRadarCivicoAlertas).mockResolvedValue([
      { anomaliaId: "1", ano: 2026 },
    ] as unknown as Awaited<ReturnType<typeof dbModule.getRadarCivicoAlertas>>);

    const result = await loadRadarData("porciuncula", { entidades: "3" });

    expect(dbModule.getPortalConfig).toHaveBeenCalledWith("porciuncula");
    expect(dbModule.getEntidades).toHaveBeenCalledWith("porciuncula");
    expect(dbModule.getRadarCivicoAlertas).toHaveBeenCalledWith("porciuncula", {
      entidade: "3",
    });

    expect(result.portalSlug).toBe("porciuncula");
    expect(result.alertas).toHaveLength(1);
  });
});
