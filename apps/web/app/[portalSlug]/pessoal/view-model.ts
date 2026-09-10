import type { CategoriaRegime } from "@transparencia/db";
import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadPessoalData } from "./loader";

export const CATEGORIA_REGIME_LABELS: Record<CategoriaRegime, string> = {
  efetivo_concurso: "Concursados (Efetivos)",
  efetivo_comissao: "Efetivos em Chefia (FG/CC)",
  comissionado: "Cargos em Comissão",
  contrato_temporario: "Contratos Temporários",
  agente_politico: "Agentes Políticos",
  rpps_inativos: "RPPS / Previdenciários",
  outros: "Outros",
};

type PessoalRawData = Awaited<ReturnType<typeof loadPessoalData>>;

export function buildPessoalViewModel(raw: PessoalRawData) {
  const isEntidadeFiltrada = (raw.context.entidadesIds?.length ?? 0) > 0;
  const currentYearRow = raw.folhaData[0] || {
    totalFolha: 0,
    totalPago: 0,
    rclProxy: 0,
    percentualFolha: 0,
  };

  const folhaKpi = (() => {
    if (isEntidadeFiltrada) {
      return {
        title: "Folha / Receita Municipal",
        subtext: "impacto no teto da LRF do município (54%)",
        alert: false,
      };
    }
    if (currentYearRow.percentualFolha <= 54) {
      return {
        title: "Folha / Receita Arrecadada",
        subtext: "abaixo do teto de 54%",
        alert: false,
      };
    }
    return {
      title: "Folha / Receita Arrecadada",
      subtext: "acima do teto de 54%",
      alert: true,
    };
  })();

  const headerDescription = isEntidadeFiltrada
    ? "Impacto da folha de pagamento desta entidade na arrecadação do município. A Lei de Responsabilidade Fiscal limita o gasto total com pessoal a 54% da receita corrente líquida para o Poder Executivo."
    : "Quanto da receita arrecadada é comprometido com salários e proventos. A Lei de Responsabilidade Fiscal limita esse gasto a 54% da receita corrente líquida para o Poder Executivo.";

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    isEntidadeFiltrada,
    headerDescription,
    folhaKpi,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    pctChefias: raw.pctChefias,
    decimo13: raw.decimo13,
    distribuicaoProventos: raw.distribuicaoProventos,
    departmentalPayroll: raw.departmentalPayroll,
    regimeMetrics: (raw.regimeMetrics ?? []).map((item) => ({
      ...item,
      categoriaRegimeRotulo:
        CATEGORIA_REGIME_LABELS[item.categoriaRegime] ?? "Outros",
    })),
    currentYearRow,
  };
}
