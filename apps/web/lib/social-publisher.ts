import { getPortalConfig, getRadarDigestMetrics } from "@transparencia/db";
import {
  buildCustomFacebookPost,
  buildExtractionFacebookPost,
  buildFiscalDigestFacebookPost,
  buildReleaseFacebookPost,
  postFacebookPost,
} from "./facebook-bot";
import {
  buildCustomTweet,
  buildExtractionTweet,
  buildFiscalDigestTweet,
  buildReleaseTweet,
  postTweet,
  resolveBaseUrl,
} from "./x-bot";

export type SocialChannel = "x" | "facebook";

export interface SocialPublishOptions {
  portalSlug: string;
  type: "fiscal_digest" | "extraction" | "release" | "custom";
  channels?: SocialChannel[] | "all";
  ano?: number;
  text?: string;
  version?: string;
  summary?: string;
  dryRun?: boolean;
  baseUrl?: string;
}

export interface SocialChannelResult {
  success: boolean;
  tweetId?: string;
  postId?: string;
  error?: string;
}

export interface SocialPublishResult {
  success: boolean;
  portalSlug: string;
  type: string;
  dryRun: boolean;
  results: {
    x?: SocialChannelResult;
    facebook?: SocialChannelResult;
  };
}

function resolveChannels(channels?: SocialChannel[] | "all"): SocialChannel[] {
  if (!channels || channels === "all") {
    return ["x", "facebook"];
  }
  return channels;
}

/**
 * Orquestrador multi-canal responsável por formatar e publicar mensagens cívicas
 * no X.com e no Facebook Pages com total isolamento de falhas e resiliência independente.
 */
export async function publishSocial(
  options: SocialPublishOptions,
): Promise<SocialPublishResult> {
  const { portalSlug, type, text, version, summary, dryRun = false } = options;

  const ano = options.ano ?? new Date().getFullYear();
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const targetChannels = resolveChannels(options.channels);

  const results: SocialPublishResult["results"] = {};

  if (!portalSlug && type !== "release") {
    return {
      success: false,
      portalSlug: portalSlug || "",
      type,
      dryRun,
      results: {
        x: targetChannels.includes("x")
          ? { success: false, error: "Campo 'portalSlug' é obrigatório." }
          : undefined,
        facebook: targetChannels.includes("facebook")
          ? { success: false, error: "Campo 'portalSlug' é obrigatório." }
          : undefined,
      },
    };
  }

  let tweetText: string | null = null;
  let fbPost: { message: string; link?: string } | null = null;

  if (type === "fiscal_digest") {
    const [config, metrics] = await Promise.all([
      getPortalConfig(portalSlug),
      getRadarDigestMetrics(portalSlug, ano),
    ]);

    if (!metrics) {
      const error = `Métricas fiscais não encontradas para '${portalSlug}' e ano ${ano}.`;
      if (targetChannels.includes("x")) results.x = { success: false, error };
      if (targetChannels.includes("facebook"))
        results.facebook = { success: false, error };
      return {
        success: false,
        portalSlug,
        type,
        dryRun,
        results,
      };
    }

    const municipioNome =
      config?.displayName || config?.cidadeClean || portalSlug;

    if (targetChannels.includes("x")) {
      tweetText = buildFiscalDigestTweet({
        portalSlug,
        municipioNome,
        ano,
        metrics,
        baseUrl,
      });
    }
    if (targetChannels.includes("facebook")) {
      fbPost = buildFiscalDigestFacebookPost({
        portalSlug,
        municipioNome,
        ano,
        metrics,
        baseUrl,
      });
    }
  } else if (type === "extraction") {
    const config = await getPortalConfig(portalSlug);
    const municipioNome =
      config?.displayName || config?.cidadeClean || portalSlug;

    if (targetChannels.includes("x")) {
      tweetText = buildExtractionTweet({
        portalSlug,
        municipioNome,
        ano,
        baseUrl,
        summary,
      });
    }
    if (targetChannels.includes("facebook")) {
      fbPost = buildExtractionFacebookPost({
        portalSlug,
        municipioNome,
        ano,
        baseUrl,
        summary,
      });
    }
  } else if (type === "release") {
    const releaseVersion = version || "v1.0.0";
    if (targetChannels.includes("x")) {
      tweetText = buildReleaseTweet({
        version: releaseVersion,
        summary,
        baseUrl,
      });
    }
    if (targetChannels.includes("facebook")) {
      fbPost = buildReleaseFacebookPost({
        version: releaseVersion,
        summary,
        baseUrl,
      });
    }
  } else if (type === "custom") {
    if (!text?.trim()) {
      const error = "Campo 'text' é obrigatório para mensagens customizadas.";
      if (targetChannels.includes("x")) results.x = { success: false, error };
      if (targetChannels.includes("facebook"))
        results.facebook = { success: false, error };
      return {
        success: false,
        portalSlug,
        type,
        dryRun,
        results,
      };
    }

    if (targetChannels.includes("x")) {
      tweetText = buildCustomTweet(text);
    }
    if (targetChannels.includes("facebook")) {
      const link = portalSlug ? `${baseUrl}/${portalSlug}` : baseUrl;
      fbPost = buildCustomFacebookPost({ text, link });
    }
  }

  // Despacho paralelo e independente entre os canais
  const dispatchPromises: Promise<void>[] = [];

  if (targetChannels.includes("x") && tweetText) {
    dispatchPromises.push(
      postTweet(tweetText, { dryRun })
        .then((res) => {
          results.x = res;
        })
        .catch((err) => {
          results.x = {
            success: false,
            error: err instanceof Error ? err.message : "Erro no envio ao X",
          };
        }),
    );
  }

  if (targetChannels.includes("facebook") && fbPost) {
    dispatchPromises.push(
      postFacebookPost(fbPost, { dryRun })
        .then((res) => {
          results.facebook = res;
        })
        .catch((err) => {
          results.facebook = {
            success: false,
            error:
              err instanceof Error ? err.message : "Erro no envio ao Facebook",
          };
        }),
    );
  }

  await Promise.all(dispatchPromises);

  const channelsDispatched = Object.values(results);
  const overallSuccess =
    channelsDispatched.length > 0 &&
    channelsDispatched.every((r) => r?.success === true);

  return {
    success: overallSuccess,
    portalSlug,
    type,
    dryRun,
    results,
  };
}
