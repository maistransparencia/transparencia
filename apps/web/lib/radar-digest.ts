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
  if (customBaseUrl) {
    return customBaseUrl.replace(/\/+$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
  }
  return "http://localhost:3001";
}

/**
 * Motor de compilação de dados, logs e despacho do Boletim Periódico ("Radar Municipal").
 * Compatível com execução pós-ELT, cron jobs e execução manual via CLI.
 */
export async function dispatchRadarDigest(
  options: DispatchRadarDigestOptions,
): Promise<DispatchRadarDigestResult> {
  const portalSlug = options.portalSlug.trim();
  const ano = options.ano ?? new Date().getFullYear();
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const isDryRun = Boolean(options.dryRun || !resend);

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

  const resendClient = resend;
  if (isDryRun || !resendClient) {
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
          logoUrl: config?.brasaoAsset,
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
