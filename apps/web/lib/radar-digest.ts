import {
  getConfirmedNewsletterSubscribers,
  getPortalConfig,
  getRadarDigestMetrics,
} from "@transparencia/db";
import { RadarDigestEmail } from "../components/emails/radar-digest";
import { resend } from "./resend";

export interface DispatchRadarDigestOptions {
  portalSlug: string;
  ano?: number;
  dryRun?: boolean;
  baseUrl?: string;
}

export interface DispatchRadarDigestResult {
  success: boolean;
  portalSlug: string;
  ano: number;
  totalSubscribers: number;
  sentCount: number;
  failedCount: number;
  errors: Array<{ email: string; error: string }>;
  dryRun: boolean;
}

const defaultFromEmail =
  process.env.RESEND_FROM_EMAIL ||
  "Mais Transparência <newsletter@transparencia.app>";

function resolveBaseUrl(customBaseUrl?: string): string {
  let url = "http://localhost:3001";
  if (customBaseUrl?.trim()) {
    url = customBaseUrl.trim();
  } else if (process.env.NEXT_PUBLIC_APP_URL?.trim()) {
    url = process.env.NEXT_PUBLIC_APP_URL.trim();
  } else if (process.env.VERCEL_URL?.trim()) {
    const vUrl = process.env.VERCEL_URL.trim();
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

function resolveLogoUrl(
  brasaoAsset?: string | null,
  baseUrl?: string,
): string | undefined {
  if (!brasaoAsset) return undefined;
  if (brasaoAsset.startsWith("http://") || brasaoAsset.startsWith("https://")) {
    return brasaoAsset;
  }
  const cleanBase = baseUrl ? baseUrl.replace(/\/+$/, "") : "";
  const cleanAsset = brasaoAsset.startsWith("/")
    ? brasaoAsset
    : `/${brasaoAsset}`;
  return `${cleanBase}${cleanAsset}`;
}

/**
 * Motor de compilação de dados, logs e despacho do Boletim Periódico ("Radar Municipal").
 * Compatível com execução pós-ELT, cron jobs e execução manual via CLI.
 */
export async function dispatchRadarDigest(
  options: DispatchRadarDigestOptions,
): Promise<DispatchRadarDigestResult> {
  const portalSlug = (options?.portalSlug || "").trim();
  const ano = options?.ano ?? new Date().getFullYear();
  const baseUrl = resolveBaseUrl(options?.baseUrl);
  const isDryRun = Boolean(options?.dryRun || !resend);

  if (!portalSlug) {
    return {
      success: false,
      portalSlug: "",
      ano,
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      errors: [{ email: "all", error: "Campo 'portalSlug' é obrigatório." }],
      dryRun: isDryRun,
    };
  }

  const subscribers = await getConfirmedNewsletterSubscribers(portalSlug);

  if (subscribers.length === 0) {
    return {
      success: true,
      portalSlug,
      ano,
      totalSubscribers: 0,
      sentCount: 0,
      failedCount: 0,
      errors: [],
      dryRun: isDryRun,
    };
  }

  const [config, metrics] = await Promise.all([
    getPortalConfig(portalSlug),
    getRadarDigestMetrics(portalSlug, ano),
  ]);

  if (!metrics) {
    return {
      success: false,
      portalSlug,
      ano,
      totalSubscribers: subscribers.length,
      sentCount: 0,
      failedCount: subscribers.length,
      errors: [
        {
          email: "all",
          error: `Métricas do radar não encontradas para o portal '${portalSlug}' e ano ${ano}.`,
        },
      ],
      dryRun: isDryRun,
    };
  }

  const municipioNome =
    config?.displayName || config?.cidadeClean || portalSlug;
  const subject = `🚨 Radar ${municipioNome}: Novos dados fiscais e termômetro de opacidade (${ano})`;

  const rawLogo = config?.brasaoAsset;
  const logoUrl = resolveLogoUrl(rawLogo, baseUrl);

  const resendClient = resend;
  if (isDryRun || !resendClient) {
    // Renderiza o template em dry-run para validar integridade do JSX e dados
    RadarDigestEmail({
      portalSlug,
      municipioNome,
      ano,
      portalBaseUrl: baseUrl,
      unsubscribeUrl: `${baseUrl}/api/newsletter/unsubscribe?token=dry-run-sample-token`,
      metrics,
      logoUrl,
    });

    return {
      success: true,
      portalSlug,
      ano,
      totalSubscribers: subscribers.length,
      sentCount: subscribers.length,
      failedCount: 0,
      errors: [],
      dryRun: true,
    };
  }

  const errors: Array<{ email: string; error: string }> = [];
  let sentCount = 0;
  let failedCount = 0;

  for (const subscriber of subscribers) {
    const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(
      subscriber.tokenCancelamento,
    )}`;

    try {
      const { data, error } = await resendClient.emails.send({
        from: defaultFromEmail,
        to: [subscriber.email],
        subject,
        react: RadarDigestEmail({
          portalSlug,
          municipioNome,
          ano,
          portalBaseUrl: baseUrl,
          unsubscribeUrl,
          metrics,
          logoUrl,
        }),
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (error) {
        failedCount += 1;
        errors.push({
          email: subscriber.email,
          error: error.message || "Erro desconhecido ao enviar e-mail",
        });
      } else if (data) {
        sentCount += 1;
      } else {
        failedCount += 1;
        errors.push({
          email: subscriber.email,
          error: "Resposta vazia do provedor de e-mail",
        });
      }
    } catch (err: unknown) {
      failedCount += 1;
      const errorMsg =
        err instanceof Error ? err.message : "Exceção inesperada no envio";
      errors.push({
        email: subscriber.email,
        error: errorMsg,
      });
    }
  }

  return {
    success: errors.length === 0,
    portalSlug,
    ano,
    totalSubscribers: subscribers.length,
    sentCount,
    failedCount,
    errors,
    dryRun: false,
  };
}
