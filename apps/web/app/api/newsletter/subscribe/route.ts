import { getPortalConfig, subscribeNewsletter } from "@transparencia/db";
import { NextResponse } from "next/server";
import {
  checkEmailRateLimit,
  checkIpRateLimit,
} from "../../../../lib/rate-limit";
import { sendNewsletterConfirmationEmail } from "../../../../lib/resend";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const { email, portalSlug, b_empresa_url, clientRenderTime } = body;

    // 1. Honeypot check (descarte silencioso para bots)
    if (typeof b_empresa_url === "string" && b_empresa_url.trim().length > 0) {
      return NextResponse.json({
        success: true,
        message: "Inscrição recebida com sucesso.",
      });
    }

    // 2. Submission timer check (descarte de submissões instantâneas < 1s, com proteção contra clock skew)
    if (typeof clientRenderTime === "number") {
      const elapsed = Date.now() - clientRenderTime;
      if (elapsed >= 0 && elapsed < 1000) {
        return NextResponse.json({
          success: true,
          message: "Inscrição recebida com sucesso.",
        });
      }
    }

    // 3. Validação de e-mail e portal
    if (
      !email ||
      typeof email !== "string" ||
      !EMAIL_REGEX.test(email.trim())
    ) {
      return NextResponse.json(
        { error: "Por favor, insira um endereço de e-mail válido." },
        { status: 400 },
      );
    }

    if (!portalSlug || typeof portalSlug !== "string") {
      return NextResponse.json(
        { error: "Portal não especificado." },
        { status: 400 },
      );
    }

    // 4. Rate Limiter por IP
    const forwardedHeader = req.headers.get("x-forwarded-for");
    const ip = forwardedHeader
      ? forwardedHeader.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "unknown-ip";

    const ipLimit = checkIpRateLimit(ip);
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas a partir deste endereço IP. Por favor, aguarde alguns minutos.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.resetInSeconds),
          },
        },
      );
    }

    // 5. Rate Limiter por E-mail
    const emailLimit = checkEmailRateLimit(email);
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            "Limite diário de tentativas para este e-mail atingido. Tente novamente mais tarde.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailLimit.resetInSeconds),
          },
        },
      );
    }

    // 6. Obter nome amigável do município
    const portalConfig = await getPortalConfig(portalSlug).catch(() => null);
    const municipioNome = portalConfig?.displayName || portalSlug;

    // 7. Gravação transacional via dbWrite
    const subscriber = await subscribeNewsletter(portalSlug, email);

    // 8. Disparo do e-mail de confirmação (Double Opt-In)
    const requestOrigin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;

    const emailResult = await sendNewsletterConfirmationEmail({
      email: subscriber.email,
      portalSlug: subscriber.portalSlug,
      municipioNome,
      confirmationToken: subscriber.tokenConfirmacao,
      cancellationToken: subscriber.tokenCancelamento,
      baseUrl,
    });

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error:
            emailResult.error ||
            "Não foi possível enviar o e-mail de confirmação.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "E-mail de confirmação enviado! Por favor, verifique sua caixa de entrada para ativar o recebimento.",
    });
  } catch (err) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Erro interno ao processar inscrição.";
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/newsletter/subscribe] Erro:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
