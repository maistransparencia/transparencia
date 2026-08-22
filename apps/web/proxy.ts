import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { checkAnonymousRateLimit } from "@/lib/rate-limit";

const RESERVED_STATIC_PATHS = new Set([
  "/favicon.ico",
  "/favicon.svg",
  "/favicon-32.png",
  "/favicon-180.png",
  "/robots.txt",
  "/sitemap.xml",
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Interceptar e aplicar Rate Limiting anônimo centralizado nas APIs do assistente e MCP
  if (
    pathname.startsWith("/api/assistant/chat") ||
    pathname.startsWith("/api/mcp")
  ) {
    const rateLimit = checkAnonymousRateLimit(request);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          code: "ANONYMOUS_LIMIT_REACHED",
          message: `Você atingiu o limite de ${rateLimit.limit} perguntas gratuitas de hoje. Crie sua conta para continuar!`,
          limit: rateLimit.limit,
          remaining: 0,
          resetAt: rateLimit.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          },
        },
      );
    }
  }

  // Proxy / intercept static assets so they never reach dynamic routes like [portalSlug]
  if (RESERVED_STATIC_PATHS.has(pathname) || pathname.startsWith("/ingest/")) {
    return NextResponse.next();
  }

  // Atualizar sessão e cookies do Supabase Auth no middleware/proxy se as envs estiverem presentes
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      });

      await supabase.auth.getUser();
    } catch (_err) {
      // Ignorar erros de middleware de auth para não travar navegação estática
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclude static files, Next.js internal assets, and explicit favicons/robots/sitemap
     * from dynamic route resolution in [portalSlug].
     */
    "/((?!_next/static|_next/image|favicon\\.ico|favicon.*|robots\\.txt|sitemap\\.xml).*)",
  ],
};
