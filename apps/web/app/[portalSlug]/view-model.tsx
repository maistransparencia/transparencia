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
    licitacoesEmAndamentoCount: raw.licitacoesEmAndamentoCount ?? 0,
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
    licitacoesEmAndamentoCount: raw.licitacoesEmAndamentoCount ?? 0,
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
  esperadoLabel?: string;
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
  fundamentacaoLegal?: {
    label: string;
    url: string;
  };
}

export interface RadarCivicoFeedViewModel {
  title: string;
  description: string;
  cards: RadarCivicoCardItem[];
  hasAlertas: boolean;
  licitacoesEmAndamentoCount?: number;
  emptyState: {
    title: string;
    message: string;
  };
}

export {
  DIMENSAO_NOMES,
  FUNCOES_INVESTIMENTO_SOCIAL,
  formatarDimensao,
  formatDesvioPercentual,
  formatFactualNarrative,
  formatPercentNumber,
  getMesNome,
  isInvestimentoSocial,
  MESES_ABREV,
} from "@/lib/radar-civico-narrative";

import {
  formatarDimensao,
  formatDesvioPercentual,
  formatFactualNarrative,
  formatPercentNumber,
  getMesNome,
  isInvestimentoSocial,
} from "@/lib/radar-civico-narrative";

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

export function formatMoeda(val: number): string {
  return fmtCurrency(val).replace(/\u00a0/g, " ");
}

export function formatCompactBRL(value: number): string {
  return fmtCompact(value);
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

  if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
    return "Quota de Alerta (30%)";
  }

  if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
    return "Meta Atuarial";
  }

  if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
    return "Fluxo em Aberto";
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
    return "Compras sem Licitação";
  }
  if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
    return "Elevada Opacidade em Gastos Genéricos";
  }
  if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
    return "Inadimplência no Aporte Atuarial (RPPS)";
  }
  if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
    return "Retenção de Contribuição Patronal (RPPS)";
  }
  return "Indicador em Destaque";
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
    return "Examinar Licitações e Compras";
  }
  if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
    return "Fiscalizar Gastos Genéricos";
  }
  if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
    return "Auditar Aporte Atuarial";
  }
  if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
    return "Verificar Repasse Patronal";
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
  if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
    return `/${portalSlug}/despesas?ano=${ano}#gastos-genericos`;
  }
  if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
    return `/${portalSlug}/caprem?ano=${ano}#atuarial`;
  }
  if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
    return `/${portalSlug}/caprem?ano=${ano}#patronal`;
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
    const tipoMetodologia: "homologa" | "estoque" = (() => {
      if (
        alerta.tipoAnomalia === "pico_despesa_homologa" ||
        alerta.tipoAnomalia === "concentracao_dispensa"
      ) {
        return "homologa";
      }
      return "estoque";
    })();
    const esperadoLabel = (() => {
      if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
        return "Limite de Alerta";
      }
      if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
        return "Aporte Exigido";
      }
      if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
        return "Passivo Tolerado";
      }
      return "Média Histórica";
    })();
    const fundamentacaoLegal = (() => {
      if (alerta.tipoAnomalia === "inadimplencia_aporte_rpps") {
        return {
          label: "Lei nº 9.717/1998",
          url: "https://www.planalto.gov.br/ccivil_03/leis/l9717.htm#art1",
        };
      }
      if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
        return {
          label: "Art. 40 da CF/88",
          url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm#art40",
        };
      }
      return undefined;
    })();
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
      if (
        alerta.tipoAnomalia === "rombo_caixa" ||
        alerta.tipoAnomalia === "inadimplencia_aporte_rpps"
      ) {
        return `-${formatDesvioPercentual(val)}%`;
      }
      const sinal = val > 0 ? "+" : "-";
      return `${sinal}${formatDesvioPercentual(val)}%`;
    })();

    const valorObservadoFormatted = (() => {
      if (alerta.tipoAnomalia === "explosao_comissionados") {
        return `${fmtNumber(Math.round(alerta.valorObservado))} cargos`;
      }
      if (
        alerta.tipoAnomalia === "concentracao_dispensa" ||
        alerta.tipoAnomalia === "opacidade_gastos_genericos"
      ) {
        return `${formatPercentNumber(alerta.valorObservado)}%`;
      }
      return fmtCompact(alerta.valorObservado);
    })();

    const valorEsperadoFormatted = (() => {
      if (alerta.tipoAnomalia === "explosao_comissionados") {
        return `${fmtNumber(Math.round(alerta.valorEsperado))} cargos`;
      }
      if (
        alerta.tipoAnomalia === "concentracao_dispensa" ||
        alerta.tipoAnomalia === "opacidade_gastos_genericos"
      ) {
        return `${formatPercentNumber(alerta.valorEsperado)}%`;
      }
      if (alerta.tipoAnomalia === "retencao_patronal_rpps") {
        return "R$ 0";
      }
      return fmtCompact(alerta.valorEsperado);
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
      esperadoLabel,
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
      fundamentacaoLegal,
    };
  });
}
