export interface FormatQuoteOptions {
  text: string;
  metrics?: Array<{ title: string; value: string }>;
  portalUrl?: string;
  portalDisplayName?: string;
}

export interface SocialShareLinks {
  formattedQuote: string;
  shareUrl: string;
  portalDisplayName: string;
}

export function formatQuoteForSharing({
  text,
  metrics,
  portalUrl,
  portalDisplayName,
}: FormatQuoteOptions): {
  formattedQuote: string;
  shareUrl: string;
  portalDisplayName: string;
} {
  const cleanedText = text.trim();
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://maistransparencia.com.br";
  const shareUrl = portalUrl || baseUrl;
  const name = portalDisplayName?.trim() || "Portal da Transparência";

  let quoteBody = cleanedText;

  // Se a resposta contiver cards de métricas, inclui os destaques para não omitir informações contábeis
  if (Array.isArray(metrics) && metrics.length > 0) {
    const metricsSummary = metrics
      .filter((m) => m?.title && m.value)
      .map((m) => `• ${m.title}: ${m.value}`)
      .join("\n");

    if (metricsSummary) {
      quoteBody += `\n\n*Destaques:*\n${metricsSummary}`;
    }
  }

  const formattedQuote = `Olha o que eu descobri na ${name} via MaisTransparência:\n\n> "${quoteBody}"\n\nFonte: MaisTransparência\n${shareUrl}`;
  return { formattedQuote, shareUrl, portalDisplayName: name };
}

export function getSocialShareLinks(
  options: FormatQuoteOptions,
): SocialShareLinks {
  const {
    formattedQuote,
    shareUrl,
    portalDisplayName: name,
  } = formatQuoteForSharing(options);

  return {
    formattedQuote,
    shareUrl,
    portalDisplayName: name,
  };
}
