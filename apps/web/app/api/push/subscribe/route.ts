import { getPortalConfig, savePushSubscription } from "@transparencia/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkIpRateLimit } from "@/lib/rate-limit";

const subscribeSchema = z.object({
  portalSlug: z.string().min(1),
  subscription: z.object({
    endpoint: z.url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  userAgent: z.string().optional(),
  topics: z.array(z.string()).optional(),
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

    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload inválido",
          details: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    const { portalSlug, subscription, userAgent, topics } = parsed.data;

    const portalConfig = await Promise.resolve(
      getPortalConfig(portalSlug),
    ).catch(() => null);
    if (!portalConfig) {
      return NextResponse.json(
        { error: `Portal '${portalSlug}' não encontrado.` },
        { status: 404 },
      );
    }

    const resolvedUserAgent =
      userAgent || req.headers.get("user-agent") || null;

    await savePushSubscription({
      portalSlug,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: resolvedUserAgent,
      topics,
    });

    return NextResponse.json(
      { success: true, message: "Subscription saved" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const errorMsg =
      error instanceof Error ? error.message : "Erro ao salvar subscrição";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
