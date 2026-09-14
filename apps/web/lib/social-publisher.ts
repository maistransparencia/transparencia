import {
  type GetRadarCivicoAlertasOptions,
  getPortalConfig,
  getRadarCivicoAlertas,
  getRadarDigestMetrics,
  type RadarCivicoAlertaDTO,
} from "@transparencia/db";
import { fmtCurrency } from "@transparencia/ui";
import {
  buildCustomFacebookPost,
  buildExtractionFacebookPost,
  buildFiscalDigestFacebookPost,
  buildReleaseFacebookPost,
  postFacebookPost,
  sanitizeHashtag,
} from "./facebook-bot";
import {
  formatFactualNarrative,
  formatPercentNumber,
} from "./radar-civico-narrative";
import {
  buildCustomTweet,
  buildExtractionTweet,
  buildFiscalDigestTweet,
  buildReleaseTweet,
  postTweet,
  resolveBaseUrl,
  truncateTweet,
} from "./x-bot";

export type SocialChannel = "x" | "facebook";

export interface CivicAnomalySocialParams {
  portalSlug: string;
  municipioNome: string;
  alerta: RadarCivicoAlertaDTO;
  ano?: number;
  baseUrl?: string;
  summary?: string;
}

export interface SocialPublishOptions {
  portalSlug: string;
  type: "fiscal_digest" | "extraction" | "release" | "custom" | "civic_anomaly";
  channels?: SocialChannel[] | "all";
  ano?: number;
  anomaliaId?: string;
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
  if (!Array.isArray(channels)) {
    return ["x", "facebook"];
  }
  const valid = channels.filter(
    (c): c is SocialChannel => c === "x" || c === "facebook",
  );
  return valid.length > 0 ? valid : ["x", "facebook"];
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

  if (!portalSlug && type !== "release" && type !== "custom") {
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
  } else if (type === "civic_anomaly") {
    const config = await getPortalConfig(portalSlug);
    const municipioNome =
      config?.displayName || config?.cidadeClean || portalSlug;

    const alertOptions: GetRadarCivicoAlertasOptions = {
      severidadeMinima: "critico",
      ...(options.ano !== undefined ? { ano: options.ano } : {}),
    };
    const alertas = await getRadarCivicoAlertas(portalSlug, alertOptions);
    const criticos = alertas.filter((a) => a.grauSeveridade === "critico");

    const alertaSelecionado = options.anomaliaId
      ? (alertas.find((a) => a.anomaliaId === options.anomaliaId) ?? null)
      : (criticos[0] ?? null);

    if (!alertaSelecionado) {
      const error = options.anomaliaId
        ? `Anomalia com id '${options.anomaliaId}' não encontrada para '${portalSlug}'.`
        : `Nenhuma anomalia crítica encontrada para '${portalSlug}'${options.ano ? ` no ano ${options.ano}` : ""}.`;
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
      tweetText = buildCivicAnomalyTweet({
        portalSlug,
        municipioNome,
        ano: alertaSelecionado.ano,
        alerta: alertaSelecionado,
        baseUrl,
        summary,
      });
    }
    if (targetChannels.includes("facebook")) {
      fbPost = buildCivicAnomalyFacebookPost({
        portalSlug,
        municipioNome,
        ano: alertaSelecionado.ano,
        alerta: alertaSelecionado,
        baseUrl,
        summary,
      });
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

/**
 * Resolve rota ou URL canônica para o alerta cívico (sem ternários aninhados).
 */
export function resolveAnomalyLink(
  alerta: Pick<RadarCivicoAlertaDTO, "deepLinkRota">,
  baseUrl: string,
  portalSlug: string,
): string {
  if (!alerta.deepLinkRota) {
    return `${baseUrl}/${portalSlug}/radar`;
  }
  if (alerta.deepLinkRota.startsWith("http")) {
    return alerta.deepLinkRota;
  }
  const path = alerta.deepLinkRota.startsWith("/")
    ? alerta.deepLinkRota
    : `/${alerta.deepLinkRota}`;
  return `${baseUrl}${path}`;
}

/**
 * Constrói tweet conciso (teto <= 280 chars com URLs calculadas a 23 chars)
 * para anomalia crítica apurada pelo Radar Cívico.
 */
export function buildCivicAnomalyTweet(
  params: CivicAnomalySocialParams,
): string {
  const { portalSlug, municipioNome, alerta } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const link = resolveAnomalyLink(alerta, baseUrl, portalSlug);
  const ano = alerta.ano || params.ano || new Date().getFullYear();
  const textoFactual = params.summary || formatFactualNarrative(alerta, ano);

  const raw = `🚨 Radar Cívico (${municipioNome}): Alerta de severidade crítica apurado nas contas municipais. ${textoFactual} Confira os dados oficiais: ${link} #ControleSocial #TransparenciaFiscal`;
  return truncateTweet(raw, 280);
}

/**
 * Constrói publicação detalhada e estruturada para o Facebook Pages
 * para anomalia crítica apurada pelo Radar Cívico.
 */
export function buildCivicAnomalyFacebookPost(
  params: CivicAnomalySocialParams,
): { message: string; link: string } {
  const { portalSlug, municipioNome, alerta } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const link = resolveAnomalyLink(alerta, baseUrl, portalSlug);
  const ano = alerta.ano || params.ano || new Date().getFullYear();
  const textoFactual = params.summary || formatFactualNarrative(alerta, ano);

  const hashtagMunicipio = sanitizeHashtag(municipioNome);
  const tagMunicipio = hashtagMunicipio ? ` #${hashtagMunicipio}` : "";

  const valorObsFormatted = (() => {
    if (alerta.tipoAnomalia === "explosao_comissionados") {
      return `${Math.round(alerta.valorObservado ?? 0)} cargos`;
    }
    if (
      alerta.tipoAnomalia === "concentracao_dispensa" ||
      alerta.tipoAnomalia === "opacidade_gastos_genericos"
    ) {
      return `${formatPercentNumber(alerta.valorObservado ?? 0)}%`;
    }
    return fmtCurrency(alerta.valorObservado ?? 0);
  })();

  const valorEspFormatted = (() => {
    if (alerta.tipoAnomalia === "explosao_comissionados") {
      return `${Math.round(alerta.valorEsperado ?? 0)} cargos`;
    }
    if (
      alerta.tipoAnomalia === "concentracao_dispensa" ||
      alerta.tipoAnomalia === "opacidade_gastos_genericos"
    ) {
      return `${formatPercentNumber(alerta.valorEsperado ?? 0)}%`;
    }
    return fmtCurrency(alerta.valorEsperado ?? 0);
  })();

  const desvioVal = alerta.desvioPercentual ?? 0;
  const sinalDesvio = (() => {
    if (desvioVal > 0) return "+";
    if (desvioVal < 0) return "-";
    return "";
  })();
  const desvioFormatted = `${sinalDesvio}${formatPercentNumber(Math.abs(desvioVal))}%`;

  const message = `🏛️ RADAR CÍVICO MUNICIPAL: ALERTA CRÍTICO (${municipioNome.toUpperCase()})

🚨 O motor de detecção estatística identificou um alerta de severidade crítica nas contas públicas do exercício ${ano}:

${textoFactual}

📊 Métricas Apuradas:
• Valor Observado: ${valorObsFormatted}
• Valor Esperado (Referência): ${valorEspFormatted}
• Variação: ${desvioFormatted}

🔍 Confira os dados oficiais e audite as contas no portal da transparência:
${link}

#MaisTransparência #RadarCívico #ControleSocial #TransparênciaFiscal${tagMunicipio}`;

  return { message, link };
}
