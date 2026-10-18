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

import { createCachedDataLoader, deterministicStringify } from "./cache";

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

  it("deve gerar a mesma chave para objetos com ordens de chaves diferentes ou com propriedades undefined", async () => {
    mockNodeEnv = "production";
    const innerCachedFn = vi.fn().mockResolvedValue("dados-estaveis");
    mockUnstableCache.mockReturnValue(innerCachedFn);

    const rawFn = vi.fn().mockResolvedValue("dados");
    const cachedLoader = createCachedDataLoader(rawFn, "teste-ordem");

    await cachedLoader("porciuncula", { ano: "2024", entidades: "1" });
    const firstCallKey = mockUnstableCache.mock.calls[0][1][0];

    mockUnstableCache.mockClear();

    await cachedLoader("porciuncula", {
      entidades: "1",
      ano: "2024",
      extra: undefined,
    });
    const secondCallKey = mockUnstableCache.mock.calls[0][1][0];

    expect(firstCallKey).toBe(secondCallKey);
  });
});

describe("deterministicStringify", () => {
  it("deve retornar 'null' para undefined isolado e evitar retorno do tipo undefined", () => {
    expect(deterministicStringify(undefined)).toBe("null");
  });

  it("deve diferenciar array com undefined de array vazio sem colisão de cache", () => {
    expect(deterministicStringify([undefined])).toBe("[null]");
    expect(deterministicStringify([])).toBe("[]");
    expect(deterministicStringify([undefined])).not.toBe(
      deterministicStringify([]),
    );
  });

  it("deve serializar instâncias de Date usando toJSON em vez de objeto vazio", () => {
    const d1 = new Date("2024-01-01T00:00:00.000Z");
    const d2 = new Date("2024-02-01T00:00:00.000Z");
    expect(deterministicStringify(d1)).toBe(`"${d1.toISOString()}"`);
    expect(deterministicStringify(d1)).not.toBe(deterministicStringify(d2));
    expect(deterministicStringify(d1)).not.toBe("{}");
  });

  it("deve respeitar métodos customizados .toJSON()", () => {
    const custom = {
      val: 42,
      toJSON() {
        return { serialized: true };
      },
    };
    expect(deterministicStringify(custom)).toBe('{"serialized":true}');
  });
});
