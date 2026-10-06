import { unstable_cache } from "next/cache";
import { env } from "@/env";
import { version } from "../../../package.json";

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
    const key = `${keyPrefix}-v${version}-${JSON.stringify(args)}`;
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
