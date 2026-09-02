import { getPortalConfig } from "@transparencia/db";
import type { Metadata } from "next";
import { cache } from "react";
import { env } from "@/env";

export const getCachedPortalConfig = cache(async (portalSlug: string) => {
  return getPortalConfig(portalSlug);
});

export function formatBaseUrl(rawUrl?: string): string {
  const defaultUrl = "https://maistransparencia.com";
  const target = rawUrl?.trim() || defaultUrl;
  const formatted =
    target.startsWith("http://") || target.startsWith("https://")
      ? target
      : `https://${target}`;
  return formatted.replace(/\/+$/, "");
}

interface CreateMetadataOptions {
  description?: string;
  path?: string;
  keywords?: string[];
}

export async function createPortalMetadata(
  pageTitle: string,
  portalSlug: string,
  options?: CreateMetadataOptions,
): Promise<Metadata> {
  const portalConfig = await getCachedPortalConfig(portalSlug);
  const portalDisplayName =
    portalConfig?.displayName?.trim() || "Prefeitura Municipal";
  const titleText = pageTitle?.trim() || "Visão Geral";
  const fullTitle = `${titleText} | ${portalDisplayName}`;
  const baseUrl = formatBaseUrl(env.NEXT_PUBLIC_APP_URL);
  const normPath = (() => {
    if (!options?.path) return "";
    return options.path.startsWith("/") ? options.path : `/${options.path}`;
  })();
  const pagePath = `/${portalSlug}${normPath}`;
  const canonicalUrl = `${baseUrl}${pagePath}`;
  const defaultDescription = `Dados de transparência pública municipal de ${portalDisplayName}. Consulta de ${titleText.toLowerCase()}, dados orçamentários e prestação de contas.`;
  const finalDescription = options?.description || defaultDescription;

  const defaultKeywords = [
    "transparência pública",
    portalDisplayName,
    titleText.toLowerCase(),
    "contas públicas",
    "prestação de contas",
  ];
  const finalKeywords =
    options?.keywords && options.keywords.length > 0
      ? options.keywords
      : defaultKeywords;

  const ogImageUrl = `${baseUrl}${pagePath}/opengraph-image`;

  return {
    title: `${titleText} | ${portalDisplayName}`,
    description: finalDescription,
    keywords: finalKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description: finalDescription,
      url: canonicalUrl,
      siteName: env.NEXT_PUBLIC_SITE_NAME,
      locale: "pt_BR",
      type: "website",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: fullTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: finalDescription,
      images: [ogImageUrl],
    },
  };
}
