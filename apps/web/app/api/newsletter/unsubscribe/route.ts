import { unsubscribeNewsletterByToken } from "@transparencia/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const requestOrigin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=missing_token`);
    }

    const subscriber = await unsubscribeNewsletterByToken(token);

    if (!subscriber) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=invalid_token`);
    }

    return NextResponse.redirect(
      `${baseUrl}/${subscriber.portalSlug}?newsletter=unsubscribed`,
    );
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/newsletter/unsubscribe:GET] Erro:", err);
    const requestOrigin = new URL(req.url).origin;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || requestOrigin;
    return NextResponse.redirect(`${baseUrl}/?newsletter=error`);
  }
}

/**
 * Endpoint para cancelamento com 1 clique (RFC 8058 - List-Unsubscribe=One-Click).
 * Provedores como Gmail e Yahoo disparam POST diretamente neste endpoint.
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    let token = searchParams.get("token");

    if (!token) {
      // Tenta ler do body caso venha em formato json ou urlencoded
      const contentType = req.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = await req.json().catch(() => null);
        token = body?.token ?? null;
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Token de cancelamento não fornecido." },
        { status: 400 },
      );
    }

    const subscriber = await unsubscribeNewsletterByToken(token);

    if (!subscriber) {
      return NextResponse.json(
        { error: "Inscrição não encontrada ou token inválido." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inscrição cancelada com sucesso.",
    });
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/newsletter/unsubscribe:POST] Erro:", err);
    return NextResponse.json(
      { error: "Erro ao processar cancelamento." },
      { status: 500 },
    );
  }
}
