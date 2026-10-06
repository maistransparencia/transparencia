import { beforeEach, describe, expect, it, vi } from "vitest";
import { version } from "../../../package.json";

const mockUnstableCache = vi.fn();

vi.mock("next/cache", () => ({
  unstable_cache: (...args: unknown[]) => mockUnstableCache(...args),
}));

let mockNodeEnv = "test";

vi.mock("@/env", () => ({
  get env() {
    return {
      NODE_ENV: mockNodeEnv,
    };
  },
}));

import { createCachedDataLoader } from "./cache";

describe("createCachedDataLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodeEnv = "test";
  });

  it("deve executar diretamente a função original sem unstable_cache em ambiente de teste ou desenvolvimento", async () => {
    mockNodeEnv = "test";
    const rawFn = vi.fn().mockResolvedValue("resultado-teste");
    const cachedLoader = createCachedDataLoader(rawFn, "teste-prefix");

    const result = await cachedLoader("arg1", 123);

    expect(result).toBe("resultado-teste");
    expect(rawFn).toHaveBeenCalledWith("arg1", 123);
    expect(mockUnstableCache).not.toHaveBeenCalled();

    mockNodeEnv = "development";
    const devResult = await cachedLoader("arg2");
    expect(devResult).toBe("resultado-teste");
    expect(mockUnstableCache).not.toHaveBeenCalled();
  });

  it("deve delegar para unstable_cache com a chave versionada e TTL correto em producao", async () => {
    mockNodeEnv = "production";
    const innerCachedFn = vi.fn().mockResolvedValue("dados-producao");
    mockUnstableCache.mockReturnValue(innerCachedFn);

    const rawFn = vi.fn().mockResolvedValue("dados-brutos");
    const cachedLoader = createCachedDataLoader(rawFn, "visao-geral", 3600);

    const result = await cachedLoader("porciuncula_prefeitura", 2024);

    expect(result).toBe("dados-producao");
    expect(mockUnstableCache).toHaveBeenCalledTimes(1);

    const expectedKey = `visao-geral-v${version}-${JSON.stringify(["porciuncula_prefeitura", 2024])}`;
    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      [expectedKey],
      {
        revalidate: 3600,
        tags: [
          "visao-geral",
          "portal-data",
          "portal:porciuncula_prefeitura",
          "visao-geral:porciuncula_prefeitura",
        ],
      },
    );
    expect(innerCachedFn).toHaveBeenCalledTimes(1);

    // Executa a callback interna passada para unstable_cache para assegurar que chama rawFn
    const passedCallback = mockUnstableCache.mock.calls[0][0];
    const callbackResult = await passedCallback();
    expect(callbackResult).toBe("dados-brutos");
    expect(rawFn).toHaveBeenCalledWith("porciuncula_prefeitura", 2024);
  });

  it("deve usar o TTL padrao de 86400 segundos (24h) quando nao especificado", async () => {
    mockNodeEnv = "production";
    const innerCachedFn = vi.fn().mockResolvedValue("dados-padrao");
    mockUnstableCache.mockReturnValue(innerCachedFn);

    const rawFn = vi.fn().mockResolvedValue("dados");
    const cachedLoader = createCachedDataLoader(rawFn, "default-ttl");

    await cachedLoader();

    expect(mockUnstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      [`default-ttl-v${version}-[]`],
      {
        revalidate: 86400,
        tags: ["default-ttl", "portal-data"],
      },
    );
  });
});
