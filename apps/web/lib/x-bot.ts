import crypto from "node:crypto";
import type { RadarDigestMetricsDTO } from "@transparencia/db";
import { fmtCompact } from "@transparencia/ui";
import { env } from "@/env";
import { sanitizeHashtag } from "./facebook-bot";

export interface XCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  accessTokenSecret?: string;
  bearerToken?: string;
}

export interface PostTweetOptions {
  dryRun?: boolean;
  credentials?: XCredentials;
}

export interface PostTweetResult {
  success: boolean;
  tweetId?: string;
  error?: string;
}

export interface OAuth1Credentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface GenerateOAuth1Params extends OAuth1Credentials {
  method: string;
  url: string;
  nonce?: string;
  timestamp?: number;
}

export interface FiscalDigestTweetParams {
  portalSlug: string;
  municipioNome: string;
  ano: number;
  metrics: RadarDigestMetricsDTO;
  baseUrl?: string;
}

export interface ExtractionTweetParams {
  portalSlug: string;
  municipioNome: string;
  ano?: number;
  baseUrl?: string;
  summary?: string;
}

export interface ReleaseTweetParams {
  version: string;
  summary?: string;
  baseUrl?: string;
}

/**
 * Codificação RFC 3986 para parâmetros de requisições OAuth 1.0a.
 */
export function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Calcula a contagem de caracteres segundo as regras oficiais da API do X:
 * Qualquer URL (http/https) é ponderada com peso fixo de 23 caracteres (t.co).
 */
export function calculateTweetLength(text: string): number {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex) || [];
  const textWithoutUrls = text.replace(urlRegex, "");
  return textWithoutUrls.length + urls.length * 23;
}

/**
 * Trunca o texto do tweet para caber no limite máximo de 280 caracteres,
 * preservando integralmente links e hashtags na terminação do tweet.
 */
export function truncateTweet(text: string, maxLength = 280): string {
  if (calculateTweetLength(text) <= maxLength) {
    return text;
  }

  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = text.match(urlRegex) || [];
  const hashtagRegex = /#[\p{L}\p{N}_]+/gu;
  const hashtags = text.match(hashtagRegex) || [];

  const preservedSuffixParts: string[] = [];
  for (const url of urls) {
    if (!preservedSuffixParts.includes(url)) {
      preservedSuffixParts.push(url);
    }
  }
  for (const tag of hashtags) {
    if (!preservedSuffixParts.includes(tag)) {
      preservedSuffixParts.push(tag);
    }
  }

  const suffix =
    preservedSuffixParts.length > 0 ? ` ${preservedSuffixParts.join(" ")}` : "";
  const suffixLength = calculateTweetLength(suffix);

  const availableLength = maxLength - suffixLength - 3;
  if (availableLength <= 0) {
    const chars = Array.from(text);
    return chars.slice(0, maxLength).join("");
  }

  let body = text;
  for (const item of preservedSuffixParts) {
    body = body.replaceAll(item, "");
  }
  body = body.trim().replace(/[^\S\r\n]+/g, " ");

  const bodyChars = Array.from(body);
  const truncatedBody = bodyChars.slice(0, availableLength).join("").trimEnd();
  return `${truncatedBody}...${suffix}`;
}

/**
 * Resolve URL base do portal para links sociais.
 */
export function resolveBaseUrl(customBaseUrl?: string): string {
  let url = `https://${env.NEXT_PUBLIC_SITE_DOMAIN}`;
  if (customBaseUrl?.trim()) {
    url = customBaseUrl.trim();
  } else if (env.NEXT_PUBLIC_APP_URL?.trim()) {
    url = env.NEXT_PUBLIC_APP_URL.trim();
  } else if (env.VERCEL_URL?.trim()) {
    const vUrl = env.VERCEL_URL.trim();
    url =
      vUrl.startsWith("http://") || vUrl.startsWith("https://")
        ? vUrl
        : `https://${vUrl}`;
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata um tweet cívico contendo os destaques fiscais do Radar Municipal.
 */
export function buildFiscalDigestTweet(
  params: FiscalDigestTweetParams,
): string {
  const { portalSlug, municipioNome, ano, metrics } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const portalUrl = `${baseUrl}/${portalSlug}`;
  const tagMunicipio = sanitizeHashtag(municipioNome) || "Porciuncula";

  let totalLine = "";
  if (metrics.posicaoFiscal?.despesasPagas) {
    totalLine = `💰 Total Pago: ${formatCurrency(metrics.posicaoFiscal.despesasPagas)}`;
  } else if (metrics.opacidade?.totalPago) {
    totalLine = `💰 Total Pago: ${formatCurrency(metrics.opacidade.totalPago)}`;
  } else {
    totalLine = "ℹ️ Dados fiscais em apuração contábil";
  }

  let restosLine = "";
  if (
    metrics.posicaoFiscal?.restosPendentesTotal &&
    metrics.posicaoFiscal.restosPendentesTotal > 0
  ) {
    const totalPendente = fmtCompact(
      metrics.posicaoFiscal.restosPendentesTotal,
    );
    const liquidado =
      (metrics.posicaoFiscal.restosLiquidadosPendentes ?? 0) > 0
        ? ` / ${fmtCompact(metrics.posicaoFiscal.restosLiquidadosPendentes)} liquidados`
        : "";
    restosLine = `\n⏳ Restos a Pagar: ${totalPendente}${liquidado}`;
  }

  const raw = `🏛️ Balanço Fiscal de ${municipioNome} (${ano})
${totalLine}${restosLine}
🔗 ${portalUrl}
#${tagMunicipio} #TransparenciaFiscal`;

  return truncateTweet(raw);
}

/**
 * Formata um tweet informando a conclusão de uma carga de extração de dados no portal.
 */
export function buildExtractionTweet(params: ExtractionTweetParams): string {
  const { portalSlug, municipioNome, ano } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const portalUrl = `${baseUrl}/${portalSlug}`;
  const anoStr = ano ? ` (${ano})` : "";
  const summaryStr = params.summary ? ` ${params.summary}` : "";
  const tagMunicipio = sanitizeHashtag(municipioNome) || "Porciuncula";

  const raw = `⚡ Dados Atualizados! A base de dados fiscais de ${municipioNome}${anoStr} foi sincronizada com novas informações de empenhos, pagamentos e contratos.${summaryStr}
🔗 ${portalUrl}
#${tagMunicipio} #TransparenciaFiscal`;

  return truncateTweet(raw);
}

/**
 * Formata um tweet de divulgação de nova release ou atualização de software do portal.
 */
export function buildReleaseTweet(params: ReleaseTweetParams): string {
  const { version, summary } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const summaryStr = summary ? ` ${summary}` : "";

  const raw = `🚀 Nova versão do portal Mais Transparência (${version}) no ar!${summaryStr}
🔗 ${baseUrl}
#TransparenciaFiscal #OpenSource`;

  return truncateTweet(raw);
}

/**
 * Valida e formata uma mensagem arbitrária para postagem no X, respeitando 280 caracteres.
 */
export function buildCustomTweet(text: string): string {
  const clean = text?.trim();
  if (!clean) {
    throw new Error("Mensagem não pode ser vazia");
  }
  return truncateTweet(clean);
}

/**
 * Constrói o cabeçalho Authorization no formato OAuth 1.0a User Context
 * utilizando exclusivamente os módulos nativos do Node.js (`crypto`).
 */
export function generateOAuth1Header(params: GenerateOAuth1Params): string {
  const nonce = params.nonce ?? crypto.randomBytes(16).toString("hex");
  const timestamp = (
    params.timestamp ?? Math.floor(Date.now() / 1000)
  ).toString();

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_token: params.accessToken,
    oauth_version: "1.0",
  };

  const sortedParamPairs = Object.keys(oauthParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(oauthParams[k])}`);

  const normalizedParams = sortedParamPairs.join("&");

  const signatureBaseString = [
    params.method.toUpperCase(),
    percentEncode(params.url),
    percentEncode(normalizedParams),
  ].join("&");

  const signingKey = `${percentEncode(params.apiSecret)}&${percentEncode(params.accessTokenSecret)}`;

  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBaseString)
    .digest("base64");

  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((k) => `${k}="${percentEncode(oauthParams[k])}"`);

  return `OAuth ${headerParts.join(", ")}`;
}

export function getXCredentials(
  customCredentials?: XCredentials,
): XCredentials {
  return {
    apiKey: customCredentials?.apiKey || env.X_API_KEY || "",
    apiSecret: customCredentials?.apiSecret || env.X_API_SECRET || "",
    accessToken: customCredentials?.accessToken || env.X_ACCESS_TOKEN || "",
    accessTokenSecret:
      customCredentials?.accessTokenSecret || env.X_ACCESS_TOKEN_SECRET || "",
    bearerToken: customCredentials?.bearerToken || env.X_BEARER_TOKEN || "",
  };
}

export function hasXCredentials(credentials: XCredentials): boolean {
  const hasOAuth1 = Boolean(
    credentials.apiKey &&
      credentials.apiSecret &&
      credentials.accessToken &&
      credentials.accessTokenSecret,
  );
  const hasOAuth2 = Boolean(credentials.bearerToken);
  return hasOAuth1 || hasOAuth2;
}

/**
 * Publica um tweet no X (Twitter) utilizando a API v2 (`POST https://api.twitter.com/2/tweets`).
 * Caso esteja em modo dryRun ou sem credenciais configuradas, registra log informativo e simula sucesso.
 */
export async function postTweet(
  text: string,
  options?: PostTweetOptions,
): Promise<PostTweetResult> {
  const credentials = getXCredentials(options?.credentials);
  const isDryRun = Boolean(options?.dryRun || !hasXCredentials(credentials));

  if (isDryRun) {
    // biome-ignore lint/suspicious/noConsole: Log informativo de simulação em dry-run
    console.info(
      `[X DRY-RUN] Tweet que seria publicado (${calculateTweetLength(text)} chars):\n${text}`,
    );
    return {
      success: true,
      tweetId: "dry-run-tweet-id",
    };
  }

  const endpoint = "https://api.twitter.com/2/tweets";

  let authHeader = "";
  if (
    credentials.apiKey &&
    credentials.apiSecret &&
    credentials.accessToken &&
    credentials.accessTokenSecret
  ) {
    authHeader = generateOAuth1Header({
      method: "POST",
      url: endpoint,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      accessTokenSecret: credentials.accessTokenSecret,
    });
  } else if (credentials.bearerToken) {
    authHeader = `Bearer ${credentials.bearerToken}`;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({ text }),
    });

    const data = (await res.json().catch(() => null)) as {
      data?: { id?: string };
      detail?: string;
      title?: string;
    } | null;

    if (!res.ok) {
      const errorMsg =
        data?.detail ||
        data?.title ||
        `Erro HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    const tweetId = data?.data?.id || "tweet-published";
    return {
      success: true,
      tweetId,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro inesperado na chamada ao X";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
