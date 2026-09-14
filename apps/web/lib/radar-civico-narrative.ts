import { fmtCompact, fmtNumber } from "@transparencia/ui";

export const MESES_ABREV = [
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
  dispensas: "Compras sem Licitação",
  gastos_genericos: "Gastos Genéricos (.99)",
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

export function formatDesvioPercentual(val: number): string {
  const absVal = Math.abs(val);
  if (Number.isInteger(absVal)) {
    return String(absVal);
  }
  return Number(absVal.toFixed(1)).toString();
}

export function formatPercentNumber(val: number): string {
  if (Number.isInteger(val)) {
    return String(val);
  }
  return Number(val.toFixed(1)).toString();
}

/**
 * Constrói narrativa descritiva, neutra e factual para anomalias cívicas
 * em estrita conformidade com as diretrizes de controle social.
 */
export interface FactualNarrativeInput {
  tipoAnomalia: string;
  ano?: number;
  valorObservado?: number | null;
  valorEsperado?: number | null;
  desvioPercentual?: number | null;
  mesFinal?: number | null;
  dimensaoReferencia?: string | null;
}

export function formatFactualNarrative(
  alerta: FactualNarrativeInput,
  anoContexto: number,
): string {
  if (alerta.tipoAnomalia === "explosao_comissionados") {
    const ano = alerta.ano || anoContexto;
    const obs = fmtNumber(Math.round(alerta.valorObservado ?? 0));
    const esp = fmtNumber(Math.round(alerta.valorEsperado ?? 0));
    const desvioVal = alerta.desvioPercentual ?? 0;
    const desvio = formatDesvioPercentual(desvioVal);
    const comparacao = (() => {
      if (desvioVal < 0)
        return `-${desvio}% abaixo da média histórica observada (${esp} cargos).`;
      return `+${desvio}% acima da média histórica observada (${esp} cargos).`;
    })();
    return `Em ${ano}, o quadro de pessoal registrou ${obs} cargos comissionados ativos, número ${comparacao}`;
  }

  if (alerta.tipoAnomalia === "rombo_caixa") {
    const ano = alerta.ano || anoContexto;
    const obs = fmtCompact(alerta.valorObservado ?? 0);
    const esp = fmtCompact(alerta.valorEsperado ?? 0);
    const desvio = formatDesvioPercentual(alerta.desvioPercentual ?? 0);
    return `Em ${ano}, a disponibilidade financeira líquida em recursos livres encerrou o período em ${obs}, posicionando-se ${desvio}% abaixo da média histórica (${esp}).`;
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
    const obs = fmtCompact(alerta.valorObservado ?? 0);
    const esp = fmtCompact(alerta.valorEsperado ?? 0);
    const desvioVal = alerta.desvioPercentual ?? 0;
    const desvio = formatDesvioPercentual(desvioVal);
    const sinal = (() => {
      if (desvioVal > 0) return "+";
      if (desvioVal < 0) return "-";
      return "";
    })();

    if (isInvestimentoSocial(alerta.dimensaoReferencia)) {
      const comparacao = (() => {
        if (desvioVal < 0)
          return `valor -${desvio}% inferior à média histórica do período (${esp}).`;
        return `valor +${desvio}% superior à média histórica do período (${esp}).`;
      })();
      return `No período analisado${periodoStr}, os recursos aplicados na área de ${nomeFuncao} totalizaram ${obs} — ${comparacao}`;
    }

    return `No período analisado${periodoStr}, as despesas empenhadas na função ${nomeFuncao} somaram ${obs}, com variação de ${sinal}${desvio}% em relação à média histórica (${esp}).`;
  }

  if (alerta.tipoAnomalia === "concentracao_dispensa") {
    const ano = alerta.ano || anoContexto;
    const obs = formatPercentNumber(alerta.valorObservado ?? 0);
    const esp = formatPercentNumber(alerta.valorEsperado ?? 0);
    return `Em ${ano}, no período analisado, ${obs}% dos processos de contratação foram realizados por dispensa ou inexigibilidade de licitação, frente à média histórica de ${esp}%.`;
  }

  if (alerta.tipoAnomalia === "opacidade_gastos_genericos") {
    const ano = alerta.ano || anoContexto;
    const obs = formatPercentNumber(alerta.valorObservado ?? 0);
    const esp = formatPercentNumber(alerta.valorEsperado ?? 30);
    return `Em ${ano}, ${obs}% das despesas pagas foram alocadas sob subitens genéricos (.99), superando o limite prudencial de ${esp}% estabelecido para a transparência pública.`;
  }

  const desvioVal = alerta.desvioPercentual ?? 0;
  const desvio = formatDesvioPercentual(desvioVal);
  const sinal = (() => {
    if (desvioVal > 0) return "+";
    if (desvioVal < 0) return "-";
    return "";
  })();
  return `Registrada variação de ${sinal}${desvio}% no indicador em relação ao padrão histórico observado.`;
}
