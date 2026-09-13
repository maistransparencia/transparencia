import { removePushSubscription } from "@transparencia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIpRateLimit } from "@/lib/rate-limit";

const unsubscribeSchema = z.object({
  endpoint: z.url(),
  portalSlug: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const rateLimit = checkIpRateLimit(req, 30);
    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error:
            "Muitas tentativas a partir deste IP. Por favor, aguarde alguns minutos.",
        },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Corpo da requisição inválido (JSON esperado)" },
        { status: 400 },
      );
    }

    const parsed = unsubscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    const { endpoint, portalSlug } = parsed.data;
    await removePushSubscription(endpoint, portalSlug);

    return NextResponse.json(
      { success: true, message: "Subscription removed" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Erro ao remover subscrição";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
