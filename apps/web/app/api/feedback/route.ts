import { getAllPortais, registerFeedbackReport } from "@transparencia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIpRateLimit, getClientIp } from "../../../lib/rate-limit";

const SUCCESS_BODY = { success: true, message: "Relato recebido." };

const feedbackSchema = z.object({
  tipoRelato: z.enum(["erro_tecnico", "inconsistencia_dados", "sugestao"], {
    message: "Tipo de relato inválido.",
  }),
  mensagem: z
    .string()
    .trim()
    .min(10, "Descreva o relato com pelo menos 10 caracteres.")
    .max(2000, "O relato pode ter no máximo 2000 caracteres."),
  emailRetorno: z
    .string()
    .trim()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido.")
    .optional()
    .or(z.literal("")),
  rotaPagina: z.string().trim().max(300).regex(/^\//, "Rota inválida."),
  portalSlug: z.string().trim().max(100).nullish(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    // Honeypot: descarte silencioso para bots
    const { site_url } = body as Record<string, unknown>;
    if (typeof site_url === "string" && site_url.trim().length > 0) {
      return NextResponse.json(SUCCESS_BODY);
    }

    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message ?? "Confira os dados informados.",
        },
        { status: 400 },
      );
    }

    const ipLimit = checkIpRateLimit(getClientIp(req));
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error:
            "Muitos envios a partir deste endereço. Por favor, aguarde alguns minutos.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.resetInSeconds) },
        },
      );
    }

    const { portalSlug, ...report } = parsed.data;
    if (portalSlug) {
      const portais = await getAllPortais();
      if (!portais.some((portal) => portal.portalSlug === portalSlug)) {
        return NextResponse.json(
          { error: "Município não encontrado." },
          { status: 400 },
        );
      }
    }

    await registerFeedbackReport({
      ...report,
      portalSlug: portalSlug || null,
    });

    return NextResponse.json(SUCCESS_BODY);
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/feedback] Erro:", err);
    return NextResponse.json(
      { error: "Não foi possível registrar o relato. Tente novamente." },
      { status: 500 },
    );
  }
}
