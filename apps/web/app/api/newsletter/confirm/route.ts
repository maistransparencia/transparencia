import { confirmNewsletterSubscription } from "@transparencia/db";
import { NextResponse } from "next/server";
import { env } from "@/env";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    const requestOrigin = new URL(req.url).origin;
    const baseUrl = env.NEXT_PUBLIC_APP_URL || requestOrigin;

    if (!token) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=missing_token`);
    }

    const subscriber = await confirmNewsletterSubscription(token);

    if (!subscriber) {
      return NextResponse.redirect(`${baseUrl}/?newsletter=invalid_token`);
    }

    return NextResponse.redirect(
      `${baseUrl}/${subscriber.portalSlug}?newsletter=confirmed`,
    );
  } catch (err) {
    // biome-ignore lint/suspicious/noConsole: log de erro do handler
    console.error("[api/newsletter/confirm] Erro:", err);
    const requestOrigin = new URL(req.url).origin;
    const baseUrl = env.NEXT_PUBLIC_APP_URL || requestOrigin;
    return NextResponse.redirect(`${baseUrl}/?newsletter=error`);
  }
}
