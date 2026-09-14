import type { GrauSeveridade, RadarCivicoAlertaDTO } from "@transparencia/db";
import {
  buildNavUrl,
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  getPartialYearPeriod,
} from "@transparencia/ui";
import { env } from "@/env";
import type { loadVisaoGeralData } from "./loader";

type VisaoGeralRawData = Awaited<ReturnType<typeof loadVisaoGeralData>>;

export function buildVisaoGeralViewModel(raw: VisaoGeralRawData) {
  const {
    portalSlug,
    context,
    portalConfig,
    posicao,
    execSummary,
    gaps,
    fonte,
  } = raw;

  const selectedYear = context.selectedYear;
  const isCurrentYear = context.isCurrentYear;
  const portalName = portalConfig?.displayName;

  const routeUrl = (path: string) =>
    buildNavUrl({
      path,
      slug: portalSlug,
      exercice: String(selectedYear),
      entidades: context.entidadesIds,
    });

  const folhaPct = Number((raw.folha.percentualFolha || 0).toFixed(1));

  const totalArr = posicao.totalArrecadado || fonte?.totalArrecadado || 0;
  const uniaoArr = fonte?.transferenciasUniaoArrecadado || 0;
  const estadoArr = fonte?.transferenciasEstadoArrecadado || 0;
  const propriaArr =
    fonte?.receitaPropriaArrecadado ||
    Math.max(0, totalArr - uniaoArr - estadoArr);

  const uniaoPct = totalArr > 0 ? Math.round((uniaoArr / totalArr) * 100) : 0;
  const estadoPct = totalArr > 0 ? Math.round((estadoArr / totalArr) * 100) : 0;
  const propriaPct = totalArr > 0 ? Math.max(0, 100 - uniaoPct - estadoPct) : 0;

  const realizationPct =
    execSummary.totalDotacao > 0
      ? Math.round((totalArr / execSummary.totalDotacao) * 100)
      : 0;

  const originBreakdown = [
    {
      label: "Transferências da União",
      amountPerReal: `R$ ${(uniaoArr / (totalArr || 1)).toFixed(2).replace(".", ",")}`,
      percentage: uniaoPct,
      colorClass: "bg-blue-600",
    },
    {
      label: "Transferências do Estado",
      amountPerReal: `R$ ${(estadoArr / (totalArr || 1)).toFixed(2).replace(".", ",")}`,
      percentage: estadoPct,
      colorClass: "bg-sky-500",
    },
    {
      label: "Receita Própria",
      amountPerReal: `R$ ${(propriaArr / (totalArr || 1)).toFixed(2).replace(".", ",")}`,
      percentage: propriaPct,
      colorClass: "bg-emerald-600",
    },
  ];

  const totalDotacao = execSummary.totalDotacao;
  const totalEmpenhado = execSummary.totalEmpenhado;
  const totalLiquidado = execSummary.totalLiquidado;
  const totalPago = execSummary.totalPago;

  const empPctDotacao =
    totalDotacao > 0 ? (totalEmpenhado / totalDotacao) * 100 : 0;
  const liqPctDotacao =
    totalDotacao > 0 ? (totalLiquidado / totalDotacao) * 100 : 0;
  const pagPctDotacao = totalDotacao > 0 ? (totalPago / totalDotacao) * 100 : 0;

  const pipelineStages = [
    {
      name: "Dotação",
      formattedValue: fmtCompact(totalDotacao),
      percentage: 100,
      label: "100% autorizado",
      color: "bg-blue-600",
    },
    {
      name: "Empenhado",
      formattedValue: fmtCompact(totalEmpenhado),
      percentage: Number(empPctDotacao.toFixed(1)),
      label: `${fmtPercent(empPctDotacao)} da dotação`,
      color: "bg-indigo-600",
    },
    {
      name: "Liquidado",
      formattedValue: fmtCompact(totalLiquidado),
      percentage: Number(liqPctDotacao.toFixed(1)),
      label: `${fmtPercent(liqPctDotacao)} da dotação`,
      color: "bg-sky-600",
    },
    {
      name: "Pago",
      formattedValue: fmtCompact(totalPago),
      percentage: Number(pagPctDotacao.toFixed(1)),
      label: `${fmtPercent(pagPctDotacao)} da dotação`,
      color: "bg-emerald-600",
    },
  ];

  const acimaLimiteCount = gaps.filter((g) => g.acimaLimite).length;

  const maxPendente = Math.max(
    ...posicao.restosPendentes.map((r) => r.pendente),
    1,
  );

  const restosAnoAtual = posicao.restosPendentes.find(
    (r) => r.ano === selectedYear,
  );
  const liquidadoPendenteAnoAtual = restosAnoAtual
    ? Math.max(0, (restosAnoAtual.liquidado || 0) - (restosAnoAtual.pago || 0))
    : 0;

  const despesasCardData = {
    title: "Restos a pagar",
    linkText: "Detalhes →",
    linkHref: routeUrl("/despesas"),
    totalRestosPagarFormatted: fmtCompact(posicao.restosPendentesTotal),
    secondaryTextFormatted:
      liquidadoPendenteAnoAtual > 0
        ? `${fmtCompact(liquidadoPendenteAnoAtual)} liquidados`
        : undefined,
    totalEmpenhadoFormatted: fmtCompact(posicao.restosPendentesTotal),
    totalLiquidadoFormatted:
      liquidadoPendenteAnoAtual > 0
        ? fmtCompact(liquidadoPendenteAnoAtual)
        : undefined,
    subtext: `pendentes a ${posicao.totalCredoresAdmAtual || 0} fornecedores`,
    antiguidadeBars: posicao.restosPendentes.map((r) => {
      const totalPct = Math.round((r.pendente / maxPendente) * 100);
      const pendenteTotal = r.pendente || 1;
      const liquidadoPendente = Math.max(0, (r.liquidado || 0) - (r.pago || 0));
      const percentualLiquidado = Math.min(
        totalPct,
        Math.round((liquidadoPendente / pendenteTotal) * totalPct),
      );
      const percentualEmpenhado = Math.max(0, totalPct - percentualLiquidado);
      return {
        year: String(r.ano),
        amountFormatted: fmtCompact(r.pendente),
        percentage: totalPct,
        percentageLiquidado: percentualLiquidado,
        percentageEmpenhado: percentualEmpenhado,
        isCurrentYear: r.ano === selectedYear,
      };
    }),
    footerText:
      posicao.restosPendentesAnteriores > 0
        ? `Passivo anterior: ${fmtCompact(posicao.restosPendentesAnteriores)}`
        : "Sem pendências de anos anteriores",
  };

  const contratosServicos = raw.contratosServicos || {
    totalContratosVigentes: 0,
    totalContratosComPendencia: 0,
    totalEmpenhado: 0,
  };

  const licitacoesCardData = {
    title: "Licitações e Contratos",
    linkText: "Detalhes →",
    linkHref: routeUrl("/licitacoes"),
    items: [
      {
        count: acimaLimiteCount,
        label: "Acima do limite s/ licitação",
        isAlert: acimaLimiteCount > 0,
      },
      {
        count: gaps.length,
        label: "Contratos sem licitação registrados",
      },
      {
        count: contratosServicos.totalContratosVigentes,
        label: "Contratos de serviços vigentes",
      },
      {
        count: contratosServicos.totalContratosComPendencia,
        label: "Contratos sem pagamento registrado",
        isAlert: contratosServicos.totalContratosComPendencia > 0,
      },
    ],
    footerText:
      contratosServicos.totalEmpenhado > 0
        ? `${fmtCompact(contratosServicos.totalEmpenhado)} em contratos de serviços vigentes`
        : undefined,
  };

  const isEntidadeFiltrada = (context.entidadesIds?.length ?? 0) > 0;
  const lrfLimit = raw.lrfLimiteMaximo ?? 54;

  const pessoalCardData = {
    title: "Pessoal",
    linkText: "Detalhes →",
    linkHref: routeUrl("/pessoal"),
    receitaFolhaPercentFormatted: fmtPercent(folhaPct),
    receitaFolhaPercentValue: folhaPct,
    subtext: isEntidadeFiltrada
      ? "da receita municipal consumida por esta entidade"
      : "da receita comprometida com a folha",
    lrfLimitPercentValue: lrfLimit,
    lrfLimitPercentFormatted: isEntidadeFiltrada
      ? `${lrfLimit}% LRF (total)`
      : `${lrfLimit}% LRF`,
    footerText:
      raw.pctChefiasEfetivas !== null
        ? `${raw.pctChefiasEfetivas}% das chefias com servidores efetivos`
        : "Sem dados de ocupação de chefias no período",
  };

  const partialPeriod = getPartialYearPeriod(
    raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
  );
  const periodText = `VISÃO GERAL · EXERCÍCIO ${selectedYear}${
    isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""
  }`;
  const arrecadadoTitle = isCurrentYear
    ? "Arrecadado no ano até agora"
    : "Arrecadado no exercício";

  const heroHeadline = (
    <>
      De cada R$ 100 que entram no caixa,{" "}
      <span className="text-[oklch(0.55_0.11_250)]">R$ {propriaPct}</span> a
      cidade arrecada sozinha.
    </>
  );

  const heroSummary = isCurrentYear ? (
    <p>
      O município já recebeu <b>{fmtCompact(totalArr)}</b> em {selectedYear} —{" "}
      <b>{realizationPct}%</b> do previsto para o ano. Quase todo esse dinheiro
      vem de repasses da União e do Estado, o que torna as contas sensíveis a
      decisões tomadas longe daqui.
    </p>
  ) : (
    <p>
      O município arrecadou <b>{fmtCompact(totalArr)}</b> em {selectedYear} —{" "}
      <b>{realizationPct}%</b> do previsto para o exercício. Quase todo esse
      dinheiro veio de repasses da União e do Estado, o que torna as contas
      sensíveis a decisões tomadas longe daqui.
    </p>
  );

  const radarCivicoFeedData = buildRadarCivicoCards(
    raw.radarAlertas,
    portalSlug,
    {
      portalName,
      anoContexto: selectedYear,
    },
  );

  const radarCivicoFeed: RadarCivicoFeedViewModel = {
    title: "Radar Cívico Municipal",
    description:
      "Detecção estatística de desvios e variações atípicas em relação aos padrões históricos municipais.",
    cards: radarCivicoFeedData,
    hasAlertas: radarCivicoFeedData.length > 0,
    emptyState: {
      title: "Conformidade com Parâmetros Históricos",
      message: `Para o exercício de ${selectedYear}, as despesas, contratações diretas e o quadro de pessoal encontram-se dentro dos parâmetros históricos esperados, sem desvios estatísticos atípicos apurados.`,
    },
  };

  return {
    portalName,
    periodText,
    arrecadadoTitle,
    heroHeadline,
    heroSummary,
    selectedYear,
    realizationPercent: realizationPct,
    totalArrecadado: posicao.totalArrecadado,
    previstoTotal: execSummary.totalDotacao,
    originBreakdown,
    pipelineStages,
    despesasCardData,
    licitacoesCardData,
    pessoalCardData,
    posicaoFinanceira: raw.posicaoFinanceira,
    radarCivicoFeedData,
    radarCivicoFeed,
    orcamentoDetailUrl: routeUrl("/orcamento"),
    hasEntityFilter: Boolean(
      raw.context.entidadesIds && raw.context.entidadesIds.length > 0,
    ),
  };
}

export interface RadarCivicoCardItem {
  id?: string;
  anomaliaId: string;
  tipoAnomalia: string;
  titulo: string;
  dimensaoReferencia: string;
  grauSeveridade: GrauSeveridade;
  badgeSeveridade?: {
    label: string;
    variant: GrauSeveridade;
    colorClass: string;
  };
  metodologiaBadge: string;
  badgeMetodologia?: string;
  tipoMetodologia: "homologa" | "estoque";
  textoFactual: string;
  resumoFactual?: string;
  desvioPercentual: number;
  desvioPercentualFormatted?: string;
  valorObservado?: number;
  valorEsperado?: number;
  valorObservadoFormatted: string;
  valorEsperadoFormatted: string;
  ctaLabel: string;
  ctaUrl: string;
  deepLinkRota?: string;
  whatsappShareUrl: string;
  whatsappShareText?: string;
}

export interface RadarCivicoFeedViewModel {
  title: string;
  description: string;
  cards: RadarCivicoCardItem[];
  hasAlertas: boolean;
  emptyState: {
    title: string;
    message: string;
  };
}

const MESES_ABREV = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function getMesNome(mes: number | null | undefined): string {
  if (!mes || mes < 1 || mes > 12) {
    return "";
  }
  return MESES_ABREV[mes - 1] ?? "";
}

export const DIMENSAO_NOMES: Record<string, string> = {
  // Funções de Governo STN (Portaria 42/1999)
  legislativa: "Legislativa",
  judiciaria: "Judiciária",
  essencial_a_justica: "Essencial à Justiça",
  administracao: "Administração",
  defesa_nacional: "Defesa Nacional",
  seguranca_publica: "Segurança Pública",
  relacoes_exteriores: "Relações Exteriores",
  assistencia_social: "Assistência Social",
  previdencia_social: "Previdência Social",
  saude: "Saúde",
  trabalho: "Trabalho",
  educacao: "Educação",
  cultura: "Cultura",
  direitos_da_cidadania: "Direitos da Cidadania",
  urbanismo: "Urbanismo",
  habitacao: "Habitação",
  saneamento: "Saneamento",
  gestao_ambiental: "Gestão Ambiental",
  ciencia_e_tecnologia: "Ciência e Tecnologia",
  agricultura: "Agricultura",
  organizacao_agraria: "Organização Agrária",
  industria: "Indústria",
  comercio_e_servicos: "Comércio e Serviços",
  comunicacoes: "Comunicações",
  energia: "Energia",
  transporte: "Transporte",
  desporto_e_lazer: "Desporto e Lazer",
  encargos_especiais: "Encargos Especiais",
  sem_funcao: "Sem Função Específica",

  // Dimensões do Radar Cívico
  comissionados: "Cargos Comissionados",
  recursos_livres: "Recursos Livres",
  caixa: "Disponibilidade em Caixa",
  dispensas: "Contratações Diretas",
};

export const FUNCOES_INVESTIMENTO_SOCIAL = new Set([
  "saude",
  "educacao",
  "assistencia_social",
  "habitacao",
  "saneamento",
  "gestao_ambiental",
  "cultura",
  "desporto_e_lazer",
  "direitos_da_cidadania",
]);

export function isInvestimentoSocial(dimensao?: string | null): boolean {
  if (!dimensao) return false;
  return FUNCOES_INVESTIMENTO_SOCIAL.has(dimensao.toLowerCase().trim());
}

export function formatarDimensao(dimensao?: string | null): string {
  const clean = dimensao?.toLowerCase().trim();
  if (!clean) return "Geral";
  if (DIMENSAO_NOMES[clean]) return DIMENSAO_NOMES[clean];
  return clean
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getBadgeSeveridade(
  grau: GrauSeveridade | string,
  alerta?: Pick<RadarCivicoAlertaDTO, "tipoAnomalia" | "dimensaoReferencia">,
): {
  label: string;
  variant: GrauSeveridade;
  colorClass: string;
} {
  if (
    alerta?.tipoAnomalia === "pico_despesa_homologa" &&
    isInvestimentoSocial(alerta.dimensaoReferencia)
  ) {
    return {
      label: "Aporte Relevante",
      variant: "alto",
      colorClass: "bg-blue-50 text-blue-900 border-blue-200",
    };
  }

  if (grau === "critico") {
    return {
      label: "Atenção Especial",
      variant: "critico",
      colorClass: "bg-rose-50 text-rose-900 border-rose-200",
    };
  }
  if (grau === "alto") {
    return {
      label: "Atenção",
      variant: "alto",
      colorClass: "bg-amber-50 text-amber-950 border-amber-300",
    };
  }
  return {
    label: "Acompanhamento",
    variant: "moderado",
    colorClass: "bg-slate-100 text-slate-800 border-slate-200",
  };
}

export function formatDesvioPercentual(val: number): string {
  const absVal = Math.abs(val);
  if (Number.isInteger(absVal)) {
    return String(absVal);
  }
  return Number(absVal.toFixed(1)).toString().replace(".", ",");
}

export function formatPercentNumber(val: number): string {
  if (Number.isInteger(val)) {
    return String(val);
  }
  return Number(val.toFixed(1)).toString().replace(".", ",");
}

export function formatMoeda(val: number): string {
  return fmtCurrency(val).replace(/\u00a0/g, " ");
}

export function formatCompactBRL(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const val = (value / 1_000_000_000).toFixed(1).replace(".", ",");
    return `R$ ${val} bi`;
  }
  if (abs >= 1_000_000) {
    const val = (value / 1_000_000).toFixed(1).replace(".", ",");
    return `R$ ${val} mi`;
  }
  if (abs >= 1_000) {
    const k = value / 1_000;
    const formattedK =
      Number.isInteger(k) || k % 1 === 0
        ? String(Math.round(k))
        : k.toFixed(1).replace(".", ",");
    return `R$ ${formattedK} mil`;
  }
  return formatMoeda(value);
}

export function getBadgeMetodologia(
  alerta: Pick<RadarCivicoAlertaDTO, "tipoAnomalia" | "mesFinal">,
): string {
  if (
    alerta.tipoAnomalia === "explosao_comissionados" ||
    alerta.tipoAnomalia === "rombo_caixa"
  ) {
    return "Quadro Atual";
  }

  const mesFinal = alerta.mesFinal;
  if (
    alerta.tipoAnomalia === "pico_despesa_homologa" ||
    alerta.tipoAnomalia === "concentracao_dispensa"
  ) {
    const mesFinalNome = getMesNome(mesFinal);
    if (mesFinalNome && mesFinal) {
      if (mesFinal === 1) {
        return "Histórico Jan";
      }
      if (mesFinal < 12) {
        return `Histórico Jan a ${mesFinalNome}`;
      }
    }
    return "Média Histórica";
  }

  return "Média Histórica";
}

export function getCardTitulo(
  alerta: Pick<RadarCivicoAlertaDTO, "tipoAnomalia" | "dimensaoReferencia">,
): string {
  if (alerta.tipoAnomalia === "explosao_comissionados") {
    return "Variação em Cargos Comissionados";
  }
  if (alerta.tipoAnomalia === "rombo_caixa") {
    return "Disponibilidade em Recursos Livres";
  }
  if (alerta.tipoAnomalia === "pico_despesa_homologa") {
    const nomeFuncao = formatarDimensao(alerta.dimensaoReferencia);
    if (isInvestimentoSocial(alerta.dimensaoReferencia)) {
      return `Aporte Expressivo em ${nomeFuncao}`;
    }
    return `Aumento de Gastos em ${nomeFuncao}`;
  }
  if (alerta.tipoAnomalia === "concentracao_dispensa") {
    return "Volume em Contratações Diretas";
  }
  return "Indicador em Destaque";
}

export function formatFactualNarrative(
  alerta: Pick<
    RadarCivicoAlertaDTO,
    | "tipoAnomalia"
    | "ano"
    | "valorObservado"
    | "valorEsperado"
    | "desvioPercentual"
    | "mesFinal"
    | "dimensaoReferencia"
  >,
  anoContexto: number,
): string {
  if (alerta.tipoAnomalia === "explosao_comissionados") {
    const ano = alerta.ano || anoContexto;
    const obs = fmtNumber(Math.round(alerta.valorObservado ?? 0));
    const esp = fmtNumber(Math.round(alerta.valorEsperado ?? 0));
    const desvio = formatDesvioPercentual(alerta.desvioPercentual ?? 0);
    return `Em ${ano}, o quadro de pessoal registrou ${obs} cargos comissionados ativos, número +${desvio}% acima da média histórica observada (${esp} cargos).`;
  }

  if (alerta.tipoAnomalia === "rombo_caixa") {
    const obs = formatMoeda(alerta.valorObservado ?? 0);
    const esp = formatMoeda(alerta.valorEsperado ?? 0);
    const desvio = formatDesvioPercentual(alerta.desvioPercentual ?? 0);
    return `A disponibilidade financeira líquida em recursos livres encerrou o período em ${obs}, posicionando-se ${desvio}% abaixo da média histórica (${esp}).`;
  }

  if (alerta.tipoAnomalia === "pico_despesa_homologa") {
    const mesFinalNome = getMesNome(alerta.mesFinal);
    const periodoStr = (() => {
      if (mesFinalNome && alerta.mesFinal) {
        if (alerta.mesFinal === 1) return " (Jan)";
        if (alerta.mesFinal < 12) return ` (Jan a ${mesFinalNome})`;
      }
      return "";
    })();
    const nomeFuncao = formatarDimensao(alerta.dimensaoReferencia);
    const obs = formatCompactBRL(alerta.valorObservado ?? 0);
    const esp = formatCompactBRL(alerta.valorEsperado ?? 0);
    const desvio = formatDesvioPercentual(alerta.desvioPercentual ?? 0);

    if (isInvestimentoSocial(alerta.dimensaoReferencia)) {
      return `No período analisado${periodoStr}, os recursos aplicados na área de ${nomeFuncao} totalizaram ${obs} — valor +${desvio}% superior à média histórica do período (${esp}).`;
    }

    return `No período analisado${periodoStr}, as despesas empenhadas na função ${nomeFuncao} somaram ${obs}, com variação de +${desvio}% em relação à média histórica (${esp}).`;
  }

  if (alerta.tipoAnomalia === "concentracao_dispensa") {
    const obs = (alerta.valorObservado ?? 0).toFixed(1).replace(".", ",");
    const esp = (alerta.valorEsperado ?? 0).toFixed(1).replace(".", ",");
    return `No período de referência, ${obs}% do volume financeiro total licitado ocorreu via dispensa ou inexigibilidade de licitação, frente à média histórica de ${esp}%.`;
  }

  const desvio = formatDesvioPercentual(alerta.desvioPercentual ?? 0);
  const sinal = (alerta.desvioPercentual ?? 0) > 0 ? "+" : "";
  return `Registrada variação de ${sinal}${desvio}% no indicador em relação ao padrão histórico observado.`;
}

export function getCardCtaLabel(
  alerta: Pick<RadarCivicoAlertaDTO, "tipoAnomalia" | "dimensaoReferencia">,
): string {
  if (alerta.tipoAnomalia === "explosao_comissionados") {
    return "Auditar Cargos Comissionados";
  }
  if (alerta.tipoAnomalia === "rombo_caixa") {
    return "Verificar Saldo em Caixa";
  }
  if (alerta.tipoAnomalia === "pico_despesa_homologa") {
    const nomeFuncao = formatarDimensao(alerta.dimensaoReferencia);
    if (isInvestimentoSocial(alerta.dimensaoReferencia)) {
      return `Conferir Aplicação em ${nomeFuncao}`;
    }
    return `Explorar Despesas de ${nomeFuncao}`;
  }
  if (alerta.tipoAnomalia === "concentracao_dispensa") {
    return "Examinar Licitações e Contratos";
  }
  return "Ver detalhes";
}

export function getCardCtaUrl(
  alerta: Pick<RadarCivicoAlertaDTO, "deepLinkRota" | "tipoAnomalia" | "ano">,
  portalSlug: string,
  anoContexto: number,
): string {
  if (alerta.deepLinkRota?.trim()) {
    return alerta.deepLinkRota.trim();
  }
  const ano = alerta.ano || anoContexto;
  if (alerta.tipoAnomalia === "explosao_comissionados") {
    return `/${portalSlug}/pessoal?ano=${ano}#comissionados`;
  }
  if (alerta.tipoAnomalia === "rombo_caixa") {
    return `/${portalSlug}/receitas?ano=${ano}#saldo-caixa`;
  }
  if (alerta.tipoAnomalia === "pico_despesa_homologa") {
    return `/${portalSlug}/despesas?ano=${ano}`;
  }
  if (alerta.tipoAnomalia === "concentracao_dispensa") {
    return `/${portalSlug}/licitacoes?ano=${ano}`;
  }
  return `/${portalSlug}`;
}

function resolveCanonicalUrl(ctaUrl: string, cleanBase: string): string {
  if (ctaUrl.startsWith("http://") || ctaUrl.startsWith("https://")) {
    return ctaUrl;
  }
  const cleanPath = ctaUrl.startsWith("/") ? ctaUrl : `/${ctaUrl}`;
  return `${cleanBase}${cleanPath}`;
}

export function buildWhatsAppShareUrl(options: {
  textoFactual: string;
  ctaUrl: string;
  portalName?: string;
  baseUrl?: string;
}): { whatsappShareUrl: string; whatsappShareText: string } {
  const { textoFactual, ctaUrl, portalName, baseUrl } = options;

  let base = "https://maistransparencia.com";
  if (baseUrl?.trim()) {
    base = baseUrl.trim();
  } else if (env.NEXT_PUBLIC_APP_URL?.trim()) {
    base = env.NEXT_PUBLIC_APP_URL.trim();
  } else if (env.NEXT_PUBLIC_SITE_DOMAIN?.trim()) {
    const domain = env.NEXT_PUBLIC_SITE_DOMAIN.trim().replace(
      /^https?:\/\//,
      "",
    );
    base = `https://${domain}`;
  }

  const cleanBase = base.replace(/\/+$/, "");
  const canonicalUrl = resolveCanonicalUrl(ctaUrl, cleanBase);

  const portalNomeTexto = portalName ? ` em ${portalName}` : "";
  const whatsappShareText = `🔍 Radar Cívico${portalNomeTexto}: ${textoFactual} Confira os dados oficiais e audite as contas: ${canonicalUrl}`;
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;

  return { whatsappShareUrl, whatsappShareText };
}

export interface BuildRadarCivicoCardsOptions {
  portalName?: string;
  anoContexto?: number;
}

export function buildRadarCivicoCards(
  alertas: RadarCivicoAlertaDTO[] | undefined,
  portalSlug: string,
  options: BuildRadarCivicoCardsOptions = {},
): RadarCivicoCardItem[] {
  const { portalName, anoContexto = new Date().getFullYear() } = options;
  if (!alertas || alertas.length === 0) {
    return [];
  }

  return alertas.map((alerta) => {
    const titulo = getCardTitulo(alerta);
    const badgeSeveridade = getBadgeSeveridade(alerta.grauSeveridade, alerta);
    const metodologiaBadge = getBadgeMetodologia(alerta);
    const tipoMetodologia: "homologa" | "estoque" =
      alerta.tipoAnomalia === "explosao_comissionados" ||
      alerta.tipoAnomalia === "rombo_caixa"
        ? "estoque"
        : "homologa";
    const textoFactual = formatFactualNarrative(alerta, anoContexto);
    const ctaUrl = getCardCtaUrl(alerta, portalSlug, anoContexto);
    const ctaLabel = getCardCtaLabel(alerta);
    const { whatsappShareUrl, whatsappShareText } = buildWhatsAppShareUrl({
      textoFactual,
      ctaUrl,
      portalName,
    });

    const desvioPercentualFormatted = (() => {
      const val = alerta.desvioPercentual ?? 0;
      if (val === 0) return "0%";
      if (alerta.tipoAnomalia === "rombo_caixa") {
        return `-${formatDesvioPercentual(val)}%`;
      }
      const sinal = val > 0 ? "+" : "-";
      return `${sinal}${formatDesvioPercentual(val)}%`;
    })();

    const valorObservadoFormatted = (() => {
      if (alerta.tipoAnomalia === "explosao_comissionados") {
        return `${fmtNumber(Math.round(alerta.valorObservado))} cargos`;
      }
      if (alerta.tipoAnomalia === "concentracao_dispensa") {
        return `${alerta.valorObservado.toFixed(1).replace(".", ",")}%`;
      }
      if (alerta.tipoAnomalia === "pico_despesa_homologa") {
        return formatCompactBRL(alerta.valorObservado);
      }
      return formatMoeda(alerta.valorObservado);
    })();

    const valorEsperadoFormatted = (() => {
      if (alerta.tipoAnomalia === "explosao_comissionados") {
        return `${fmtNumber(Math.round(alerta.valorEsperado))} cargos`;
      }
      if (alerta.tipoAnomalia === "concentracao_dispensa") {
        return `${alerta.valorEsperado.toFixed(1).replace(".", ",")}%`;
      }
      if (alerta.tipoAnomalia === "pico_despesa_homologa") {
        return formatCompactBRL(alerta.valorEsperado);
      }
      return formatMoeda(alerta.valorEsperado);
    })();

    return {
      id: alerta.anomaliaId,
      anomaliaId: alerta.anomaliaId,
      tipoAnomalia: alerta.tipoAnomalia,
      titulo,
      dimensaoReferencia: alerta.dimensaoReferencia,
      grauSeveridade: alerta.grauSeveridade,
      badgeSeveridade,
      metodologiaBadge,
      badgeMetodologia: metodologiaBadge,
      tipoMetodologia,
      textoFactual,
      resumoFactual: textoFactual,
      desvioPercentual: alerta.desvioPercentual,
      desvioPercentualFormatted,
      valorObservado: alerta.valorObservado,
      valorEsperado: alerta.valorEsperado,
      valorObservadoFormatted,
      valorEsperadoFormatted,
      ctaLabel,
      ctaUrl,
      deepLinkRota: ctaUrl,
      whatsappShareUrl,
      whatsappShareText,
    };
  });
}
