import { getAllPortais } from "@transparencia/db";
import { ImageResponse } from "next/og";
import {
  type MonitoredCity,
  OGHomeCardTemplate,
} from "@/components/og/og-home-card-template";
import { env } from "@/env";
import { createCachedDataLoader } from "@/lib/cache";
import { getPostHogServer } from "@/posthog-server";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${env.NEXT_PUBLIC_SITE_NAME} - Monitoramento Cívico dos Municípios`;

async function fetchOgLandingData() {
  const portais = await getAllPortais();
  return { portais };
}

const loadOgLandingData = createCachedDataLoader(
  fetchOgLandingData,
  "og-landing",
);

export default async function Image() {
  try {
    const { portais } = await loadOgLandingData();

    const cities: MonitoredCity[] = portais.map((portal) => {
      const cleanName =
        portal.displayName
          .replace(/^Prefeitura (Municipal )?de\s+/i, "")
          .trim() ||
        portal.displayName ||
        portal.portalSlug;
      return {
        slug: portal.portalSlug,
        name: cleanName,
        uf: portal.uf,
        brasaoAsset: portal.brasaoAsset,
      };
    });

    return new ImageResponse(<OGHomeCardTemplate cities={cities} />, {
      ...size,
    });
  } catch (error) {
    const posthog = getPostHogServer();
    if (posthog) {
      posthog.captureException(error as Error, undefined, {
        route: "og:landing",
      });
    }

    return new ImageResponse(<OGHomeCardTemplate />, { ...size });
  }
}
