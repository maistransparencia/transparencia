import fs from "node:fs";
import path from "node:path";
import { env } from "@/env";

const brasaoCache = new Map<string, string | null>();

/**
 * Resolve o domínio canônico de exibição para cards e rodapés institucionais.
 */
export function resolveBrandDomain(customDomain?: string): string {
  const cleanDomain = (domain?: string): string | null => {
    if (!domain?.trim()) return null;
    return domain
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
  };

  const fromCustom = cleanDomain(customDomain);
  if (fromCustom) return fromCustom;

  const envDomain = cleanDomain(env.NEXT_PUBLIC_SITE_DOMAIN);
  if (envDomain) return envDomain;

  const envAppUrl = cleanDomain(env.NEXT_PUBLIC_APP_URL);
  if (envAppUrl) return envAppUrl;

  return "maistransparencia.com";
}

/**
 * Converte um arquivo de brasão local (PNG, etc.) em uma Data URL Base64
 * para ser consumida de forma determinística e síncrona pelo Satori / Next.js ImageResponse.
 */
export function getBrasaoDataUrl(
  assetName?: string | null,
): string | undefined {
  if (!assetName) return undefined;
  const trimmed = assetName.trim();
  if (!trimmed) return undefined;

  // Se já for uma URL externa ou data URL, retorna diretamente
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  // Previne path traversal
  const sanitized = path.basename(trimmed.replace(/^\//, ""));
  if (!sanitized) return undefined;

  if (brasaoCache.has(sanitized)) {
    const cached = brasaoCache.get(sanitized);
    return cached ?? undefined;
  }

  const candidateDirs = [
    path.resolve(process.cwd(), "public"),
    path.resolve(process.cwd(), "apps/web/public"),
  ];

  for (const dir of candidateDirs) {
    const filePath = path.join(dir, sanitized);
    // Validação estrita de confinamento dentro do diretório público
    if (!filePath.startsWith(dir)) continue;

    if (fs.existsSync(filePath)) {
      try {
        const ext = path.extname(sanitized).toLowerCase();
        const mimeType = (() => {
          if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
          if (ext === ".webp") return "image/webp";
          return "image/png";
        })();

        const fileBuffer = fs.readFileSync(filePath);
        const dataUrl = `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
        brasaoCache.set(sanitized, dataUrl);
        return dataUrl;
      } catch {
        // Fallback gracioso se leitura falhar
      }
    }
  }

  // Cache negativo para evitar chamadas de disco repetidas
  brasaoCache.set(sanitized, null);
  return undefined;
}
