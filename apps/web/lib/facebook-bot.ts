import type { RadarDigestMetricsDTO } from "@transparencia/db";
import { resolveBaseUrl } from "./x-bot";

export interface FacebookCredentials {
  pageId?: string;
  pageAccessToken?: string;
}

export interface PostFacebookOptions {
  dryRun?: boolean;
  credentials?: FacebookCredentials;
}

export interface PostFacebookResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface FacebookPostPayload {
  message: string;
  link?: string;
}

export interface FiscalDigestFacebookPostParams {
  portalSlug: string;
  municipioNome: string;
  ano: number;
  metrics: RadarDigestMetricsDTO;
  baseUrl?: string;
}

export interface ExtractionFacebookPostParams {
  portalSlug: string;
  municipioNome: string;
  ano?: number;
  baseUrl?: string;
  summary?: string;
}

export interface ReleaseFacebookPostParams {
  version: string;
  summary?: string;
  baseUrl?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function sanitizeHashtag(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "");
}

/**
 * Constrói publicação completa, estruturada e didática do Boletim Fiscal Municipal
 * para o Facebook Pages, aproveitando a capacidade de texto longo e link com preview OpenGraph.
 */
export function buildFiscalDigestFacebookPost(
  params: FiscalDigestFacebookPostParams,
): { message: string; link: string } {
  const { portalSlug, municipioNome, ano, metrics } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const link = `${baseUrl}/${portalSlug}`;
  const hashtagMunicipio = sanitizeHashtag(municipioNome);

  const totalArrecadado = metrics.posicaoFiscal?.totalArrecadado ?? 0;
  const despesasPagas =
    metrics.posicaoFiscal?.despesasPagas ?? metrics.opacidade?.totalPago ?? 0;
  const restosPagos = metrics.posicaoFiscal?.restosPagosNoAno ?? 0;
  const saldoEstimado = metrics.posicaoFiscal?.saldoEstimado ?? 0;

  // Bloco de Execução Orçamentária
  const linhasExecucao = [
    `💰 Total Arrecadado: ${formatCurrency(totalArrecadado)}`,
    `💸 Total Pago: ${formatCurrency(despesasPagas)}`,
  ];
  if (restosPagos > 0) {
    linhasExecucao.push(
      `⏳ Restos a Pagar de Anos Anteriores Pagos: ${formatCurrency(restosPagos)}`,
    );
  }
  linhasExecucao.push(
    `⚖️ Saldo em Caixa Estimado: ${formatCurrency(saldoEstimado)}`,
  );

  // Bloco de Opacidade Fiscal (.99)
  let blocoOpacidade = "";
  if (metrics.opacidade) {
    const taxa = metrics.opacidade.taxaValorOpacidadePct;
    const classificacao = (() => {
      if (metrics.opacidade.classificacaoRisco === "critico")
        return "🚨 Crítico";
      if (metrics.opacidade.classificacaoRisco === "atencao")
        return "⚠️ Atenção";
      return "✅ Normal";
    })();

    blocoOpacidade = `\n\n🔍 Termômetro de Opacidade Contábil (.99):
• Índice de Opacidade: ${taxa.toFixed(1)}% das despesas
• Classificação de Risco: ${classificacao}
• Gastos em subitens residuais sem detalhamento (.99): ${formatCurrency(
      metrics.opacidade.pagoResidual99,
    )}`;
  }

  // Bloco de Contratos de Destaque
  let blocoContratos = "";
  if (metrics.destaquesContratos && metrics.destaquesContratos.length > 0) {
    const topContratos = metrics.destaquesContratos.slice(0, 3).map((c) => {
      return `• ${c.fornecedorNome}: ${formatCurrency(c.totalPago)} (${c.objetoDescricao})`;
    });

    blocoContratos = `\n\n📑 Destaques de Contratos e Fornecedores:\n${topContratos.join("\n")}`;
  }

  const message = `🏛️ BOLETIM FISCAL MUNICIPAL: ${municipioNome.toUpperCase()} (${ano})

Confira o balanço consolidado da transparência fiscal do município com as informações atualizadas de receitas, despesas e contratos:

📊 Execução Orçamentária:
${linhasExecucao.join("\n")}${blocoOpacidade}${blocoContratos}

🔗 Acesse os dados completos no portal:
${link}

#MaisTransparencia #TransparenciaFiscal #${hashtagMunicipio} #ControleSocial #DadosAbertos`;

  return {
    message,
    link,
  };
}

/**
 * Constrói publicação de notificação de carga/atualização de dados para o Facebook Pages.
 */
export function buildExtractionFacebookPost(
  params: ExtractionFacebookPostParams,
): { message: string; link: string } {
  const { portalSlug, municipioNome, ano } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const link = `${baseUrl}/${portalSlug}`;
  const hashtagMunicipio = sanitizeHashtag(municipioNome);
  const anoStr = ano ? ` (${ano})` : "";
  const summaryBlock = params.summary
    ? `\n\n📝 Resumo da Carga: ${params.summary}`
    : "";

  const message = `⚡ BASE DE DADOS ATUALIZADA: ${municipioNome.toUpperCase()}${anoStr}

A base de dados do portal Mais Transparência foi atualizada com novos registros de empenhos, liquidações, pagamentos e processos licitatórios.${summaryBlock}

Audite as contas públicas do município e exerça o controle social de forma simples, transparente e aberta:

🔗 Acesse o portal:
${link}

#MaisTransparencia #TransparenciaFiscal #${hashtagMunicipio} #DadosAbertos #ControleSocial`;

  return {
    message,
    link,
  };
}

/**
 * Constrói publicação de anúncio de novas releases de software do portal.
 */
export function buildReleaseFacebookPost(params: ReleaseFacebookPostParams): {
  message: string;
  link: string;
} {
  const { version, summary } = params;
  const baseUrl = resolveBaseUrl(params.baseUrl);
  const summaryBlock = summary
    ? `\n\n✨ Principais novidades:\n${summary}`
    : "";

  const message = `🚀 NOVIDADES NO MAIS TRANSPARÊNCIA: VERSÃO ${version}

Uma nova versão da plataforma Mais Transparência foi implantada trazendo melhorias para o acompanhamento dos gastos públicos municipais.${summaryBlock}

A plataforma é 100% código aberto e gratuita para toda a sociedade civil.

🔗 Conheça a plataforma:
${baseUrl}

#MaisTransparencia #OpenSource #SoftwarePublico #ControleSocial`;

  return {
    message,
    link: baseUrl,
  };
}

/**
 * Valida e formata mensagem personalizada para o Facebook Pages.
 */
export function buildCustomFacebookPost(
  params: { text: string; link?: string } | string,
): FacebookPostPayload {
  const text = typeof params === "string" ? params : params.text;
  const clean = text?.trim();
  if (!clean) {
    throw new Error("Mensagem não pode ser vazia");
  }

  const link =
    typeof params === "string" ? undefined : params.link?.trim() || undefined;

  return {
    message: clean,
    link,
  };
}

export function getFacebookCredentials(
  customCredentials?: FacebookCredentials,
): FacebookCredentials {
  return {
    pageId: customCredentials?.pageId || process.env.FACEBOOK_PAGE_ID || "",
    pageAccessToken:
      customCredentials?.pageAccessToken ||
      process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
      "",
  };
}

export function hasFacebookCredentials(
  credentials: FacebookCredentials,
): boolean {
  return Boolean(credentials.pageId && credentials.pageAccessToken);
}

/**
 * Publica um post no feed da Página do Facebook através da Meta Graph API v21.0
 * (`POST https://graph.facebook.com/v21.0/{page-id}/feed`).
 * Em modo dryRun ou se as credenciais estiverem ausentes, simula com log informativo.
 */
export async function postFacebookPost(
  content: FacebookPostPayload | string,
  options?: PostFacebookOptions,
): Promise<PostFacebookResult> {
  const payload = typeof content === "string" ? { message: content } : content;
  const credentials = getFacebookCredentials(options?.credentials);
  const isDryRun = Boolean(
    options?.dryRun || !hasFacebookCredentials(credentials),
  );

  if (isDryRun) {
    // biome-ignore lint/suspicious/noConsole: Log informativo de simulação em dry-run
    console.info(
      `[FACEBOOK DRY-RUN] Post que seria publicado na página:\n${payload.message}${
        payload.link ? `\nLink anexado: ${payload.link}` : ""
      }`,
    );
    return {
      success: true,
      postId: "dry-run-facebook-post-id",
    };
  }

  const endpoint = `https://graph.facebook.com/v21.0/${credentials.pageId}/feed`;

  const bodyData: Record<string, string> = {
    message: payload.message,
    ...(payload.link ? { link: payload.link } : {}),
    access_token: credentials.pageAccessToken as string,
  };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    });

    const data = (await res.json().catch(() => null)) as {
      id?: string;
      error?: { message?: string; type?: string; code?: number };
    } | null;

    if (!res.ok) {
      const errorMsg =
        data?.error?.message || `Erro HTTP ${res.status}: ${res.statusText}`;
      return {
        success: false,
        error: errorMsg,
      };
    }

    const postId = data?.id || "facebook-post-published";
    return {
      success: true,
      postId,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Erro inesperado na chamada ao Facebook";
    return {
      success: false,
      error: errorMsg,
    };
  }
}
