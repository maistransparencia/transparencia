import { getPartialYearPeriod } from "@transparencia/ui";
import type { loadPessoalData } from "./loader";

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
    partialPeriod: getPartialYearPeriod(),
    pctChefias: raw.pctChefias,
    decimo13: raw.decimo13,
    distribuicaoProventos: raw.distribuicaoProventos,
    departmentalPayroll: raw.departmentalPayroll,
    currentYearRow,
  };
}
