import { getPartialYearPeriod } from "@transparencia/ui";
import { buildSourceSeal } from "@/lib/frescor-fontes";
import { buildRadarCivicoCards } from "../view-model";
import type { loadReceitasData } from "./loader";

/** Fonte de origem dos números de /receitas (conferida pelo lineage do dbt). */
const FONTE_RECEITAS = "portal_municipal";

type ReceitasRawData = Awaited<ReturnType<typeof loadReceitasData>>;

export function buildReceitasViewModel(raw: ReceitasRawData) {
  const rec = raw.fonte || {
    receitaPropria: 0,
    transferenciasUniao: 0,
    transferenciasEstado: 0,
    receitaExtraOrcamentaria: 0,
    total: 0,
    pctPropria: 0,
    pctPropriaPrevisto: 0,
    alertaDependencia: false,
    receitaPropriaPrevisto: 0,
    receitaPropriaArrecadado: 0,
    transferenciasUniaoPrevisto: 0,
    transferenciasUniaoArrecadado: 0,
    transferenciasEstadoPrevisto: 0,
    transferenciasEstadoArrecadado: 0,
    receitaExtraOrcamentariaArrecadado: 0,
    totalPrevisto: 0,
    totalArrecadado: 0,
    pctArrecadado: 0,
    totalPctChange: null,
    emendasTotalArrecadado: 0,
    emendasTotalEmpenhado: 0,
    emendasPixArrecadado: 0,
    emendasIndividuaisArrecadado: 0,
    fpmArrecadado: 0,
    icmsArrecadado: 0,
    issIptuArrecadado: 0,
  };

  const totalArr = rec.totalArrecadado;
  const totalPrev = rec.totalPrevisto;
  const pctArrecadadoAnual = (rec.pctArrecadado || 0) * 100;

  const origensData = [
    {
      fonte: "Transferências da União",
      previsto: rec.transferenciasUniaoPrevisto,
      arrecadado: rec.transferenciasUniaoArrecadado,
      pctRealizado:
        rec.transferenciasUniaoPrevisto > 0
          ? (rec.transferenciasUniaoArrecadado /
              rec.transferenciasUniaoPrevisto) *
            100
          : 0,
    },
    {
      fonte: "Transferências do Estado",
      previsto: rec.transferenciasEstadoPrevisto,
      arrecadado: rec.transferenciasEstadoArrecadado,
      pctRealizado:
        rec.transferenciasEstadoPrevisto > 0
          ? (rec.transferenciasEstadoArrecadado /
              rec.transferenciasEstadoPrevisto) *
            100
          : 0,
    },
    {
      fonte: "Receita própria",
      previsto: rec.receitaPropriaPrevisto,
      arrecadado: rec.receitaPropriaArrecadado,
      pctRealizado:
        rec.receitaPropriaPrevisto > 0
          ? (rec.receitaPropriaArrecadado / rec.receitaPropriaPrevisto) * 100
          : 0,
    },
    {
      // A receita extra-orçamentária não tem valor previsto: a UI não exibe percentual
      fonte: "Entradas fora do orçamento",
      semPrevisao: true,
      previsto: rec.receitaExtraOrcamentariaArrecadado,
      arrecadado: rec.receitaExtraOrcamentariaArrecadado,
      pctRealizado: 100,
      origem: raw.origemExtra,
    },
  ];

  // Ano em andamento acumula só parte dos meses; contra o ano anterior inteiro a variação sairia falsa.
  const comparacaoArrecadacao = ((): {
    direcao: "alta" | "queda" | null;
    texto: string;
  } | null => {
    if (raw.context.isCurrentYear) {
      return {
        direcao: null,
        texto:
          "Ano em andamento: ainda não dá para comparar com o ano anterior inteiro.",
      };
    }
    if (rec.totalPctChange === null) return null;
    const percentual = Math.abs(rec.totalPctChange)
      .toFixed(1)
      .replace(".", ",");
    const anoAnterior = raw.context.selectedYear - 1;
    if (rec.totalPctChange >= 0) {
      return {
        direcao: "alta",
        texto: `A Prefeitura arrecadou ${percentual}% a mais que em ${anoAnterior}, sem descontar a inflação.`,
      };
    }
    return {
      direcao: "queda",
      texto: `A Prefeitura arrecadou ${percentual}% a menos que em ${anoAnterior}, sem descontar a inflação.`,
    };
  })();

  const radarCards = buildRadarCivicoCards(raw.radarAlertas, raw.portalSlug, {
    portalName: raw.portalConfig?.displayName,
    anoContexto: raw.context.selectedYear,
  });

  const cardDependencia =
    radarCards.find((c) => c.tipoAnomalia === "dependencia_transferencias") ??
    null;

  return {
    selectedYear: raw.context.selectedYear,
    isCurrentYear: raw.context.isCurrentYear,
    partialPeriod: getPartialYearPeriod(
      raw.portalConfig?.dataExtracaoDate ?? raw.portalConfig?.dataExtracao,
    ),
    rec,
    totalArr,
    totalPrev,
    pctArrecadadoAnual,
    origensData,
    totalExtraOrcamentario: rec.receitaExtraOrcamentariaArrecadado,
    comparacaoArrecadacao,
    cardDependencia,
    seloFonte: buildSourceSeal(
      raw.frescorFontes,
      FONTE_RECEITAS,
      raw.portalSlug,
    ),
  };
}
