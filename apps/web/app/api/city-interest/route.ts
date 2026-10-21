import { registerCityInterest } from "@transparencia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { CODIGOS_UF } from "../../../lib/estados-brasileiros";
import {
  checkEmailRateLimit,
  checkIpRateLimit,
  getClientIp,
} from "../../../lib/rate-limit";

const SUCCESS_BODY = {
  success: true,
  message: "Pedido registrado com sucesso.",
};

const cityInterestSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "E-mail inválido."),
  cidade: z.string().trim().min(2, "Cidade inválida.").max(120),
  uf: z.enum(CODIGOS_UF as [string, ...string[]], {
    message: "Estado inválido.",
  }),
  consentimento: z.literal(true, { message: "Aceite obrigatório." }),
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
    const { b_empresa_url, clientRenderTime } = body as Record<string, unknown>;
    if (typeof b_empresa_url === "string" && b_empresa_url.trim().length > 0) {
      return NextResponse.json(SUCCESS_BODY);
    }

    // Submissões instantâneas (< 1s) são descartadas, com proteção contra clock skew
    if (typeof clientRenderTime === "number") {
      const elapsed = Date.now() - clientRenderTime;
      if (elapsed >= 0 && elapsed < 1000) {
        return NextResponse.json(SUCCESS_BODY);
      }
    }

    const parsed = cityInterestSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors = Object.fromEntries(
        [...parsed.error.issues]
          .reverse()
          .map((issue) => [String(issue.path[0] ?? "form"), issue.message]),
      );
      return NextResponse.json(
        { error: "Confira os dados informados.", fieldErrors },
        { status: 400 },
      );
    }

    const ipLimit = checkIpRateLimit(getClientIp(req));
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas a partir deste endereço IP. Por favor, aguarde alguns minutos.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipLimit.resetInSeconds) },
        },
      );
    }

    const emailLimit = checkEmailRateLimit(parsed.data.email);
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          error:
            "Limite diário de tentativas para este e-mail atingido. Tente novamente mais tarde.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(emailLimit.resetInSeconds) },
        },
      );
    }

    const request = await registerCityInterest(parsed.data);

    return NextResponse.json({
      ...SUCCESS_BODY,
      cidade: request.cidade,
      uf: request.uf,
    });
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/city-interest] Erro:", err);
    return NextResponse.json(
      { error: "Não foi possível registrar o pedido. Tente novamente." },
      { status: 500 },
    );
  }
}
