import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const rawNext = requestUrl.searchParams.get("next") || "/";

  // Sanitizar o parâmetro next para aceitar apenas caminhos relativos internos da aplicação
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Redirecionar para rota de origem com indicação caso o link mágico tenha expirado
  return NextResponse.redirect(
    new URL(`${next}?auth_error=magic_link_expired`, request.url),
  );
}
