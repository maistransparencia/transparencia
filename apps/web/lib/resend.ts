import { Resend } from "resend";
import { env } from "@/env";
import { NewsletterConfirmationEmail } from "../components/emails/newsletter-confirmation";

const resendApiKey = env.RESEND_API_KEY;
const defaultFromEmail = env.RESEND_FROM_EMAIL;

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export interface SendConfirmationEmailParams {
  email: string;
  portalSlug: string;
  municipioNome?: string;
  projectName?: string;
  portalSubtitle?: string;
  logoUrl?: string;
  confirmationToken: string;
  cancellationToken: string;
  baseUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function resolveBaseUrl(customBaseUrl?: string): string {
  if (customBaseUrl) {
    return customBaseUrl;
  }
  if (env.NEXT_PUBLIC_APP_URL) {
    return env.NEXT_PUBLIC_APP_URL;
  }
  if (env.VERCEL_URL) {
    return `https://${env.VERCEL_URL}`;
  }
  return "http://localhost:3001";
}

/**
 * Dispara o e-mail transacional de confirmação de inscrição (double opt-in)
 * com conformidade aos padrões RFC 8058 (1-Click List-Unsubscribe) e LGPD.
 */
export async function sendNewsletterConfirmationEmail(
  params: SendConfirmationEmailParams,
): Promise<SendEmailResult> {
  const baseUrl = resolveBaseUrl(params.baseUrl);

  const confirmationUrl = `${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(
    params.confirmationToken,
  )}`;
  const unsubscribeUrl = `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(
    params.cancellationToken,
  )}`;

  const municipioNome = params.municipioNome || "Porciúncula";
  const projectName = params.projectName || env.NEXT_PUBLIC_PROJECT_NAME;
  const portalSubtitle =
    params.portalSubtitle ||
    `Portal de Transparência Cívica e Controle Social — ${municipioNome}`;
  const logoUrl = params.logoUrl || `${baseUrl}/favicon-192.png`;

  // Em ambiente local/testes sem chave de API, simula o disparo com log estruturado
  if (!resend) {
    // biome-ignore lint/suspicious/noConsole: Log estruturado intencional para ambiente de dev/teste sem Resend API Key configurada
    console.info(
      `[Resend:dev] Simulação de envio para ${params.email} | Confirmação: ${confirmationUrl} | Cancelamento: ${unsubscribeUrl}`,
    );
    return {
      success: true,
      id: `dev-mock-${Date.now()}`,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: defaultFromEmail,
      to: [params.email],
      subject: `Confirme sua inscrição no Boletim Cívico — ${municipioNome}`,
      react: NewsletterConfirmationEmail({
        municipioNome,
        projectName,
        portalSubtitle,
        logoUrl,
        confirmationUrl,
        unsubscribeUrl,
      }),
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      // biome-ignore lint/suspicious/noConsole: log de erro do provedor de e-mail
      console.error("[Resend:error] Falha ao enviar e-mail via Resend:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Erro desconhecido ao enviar e-mail";
    // biome-ignore lint/suspicious/noConsole: log de erro inesperado
    console.error(
      "[Resend:exception] Exceção no envio via Resend:",
      errorMessage,
    );
    return {
      success: false,
      error: errorMessage,
    };
  }
}
