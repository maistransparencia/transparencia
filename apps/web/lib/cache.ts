import { unstable_cache } from "next/cache";
import { env } from "@/env";
import { version } from "../../../package.json";

/**
 * Serializa argumentos de forma determinística, ordenando chaves de objetos
 * e descartando propriedades com valor undefined.
 */
export function deterministicStringify(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (typeof (value as { toJSON?: () => unknown }).toJSON === "function") {
    return deterministicStringify(
      (value as { toJSON: () => unknown }).toJSON(),
    );
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : deterministicStringify(item))).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${deterministicStringify(obj[k])}`);
  return `{${entries.join(",")}}`;
}

/**
 * Helper para criar funções com cache de 24h versionado pelo package.json.
 *
 * - Em cada novo deploy (versao muda), a cache key expira automaticamente.
 * - Em re-extração sem novo deploy, o TTL de 24h garante atualização.
 */
export function createCachedDataLoader<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  keyPrefix: string,
  revalidateSeconds: number = 86400,
) {
  return (...args: Args): Promise<T> => {
    if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
      return fn(...args);
    }
    const key = `${keyPrefix}-v${version}-${deterministicStringify(args)}`;
    const tags = [keyPrefix, "portal-data"];
    if (typeof args[0] === "string" && args[0].trim().length > 0) {
      const portalSlug = args[0].trim();
      tags.push(`portal:${portalSlug}`, `${keyPrefix}:${portalSlug}`);
    }

    const cachedFn = unstable_cache(() => fn(...args), [key], {
      revalidate: revalidateSeconds,
      tags,
    });
    return cachedFn();
  };
}
