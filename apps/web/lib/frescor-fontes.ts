import { type FrescorFonteDTO, getFrescorFontes } from "@transparencia/db";

export interface SeloFonteViewModel {
  descricao: string;
  /** Data da última coleta já formatada em pt-BR; nula quando a fonte não é monitorada. */
  dataVerificacao: string | null;
  /** Até quando vão os números da fonte, em linguagem comum; nulo quando a fonte não traz período. */
  dadosAte: string | null;
  aviso: string | null;
  href: string;
}

export interface FonteComoAtualizamosViewModel {
  fonte: string;
  descricao: string;
  nomeFonte: string | null;
  urlFonte: string | null;
  esferaFonte: FrescorFonteDTO["esferaFonte"];
  frequencia: string;
  dataVerificacao: string | null;
  situacao: FrescorFonteDTO["situacao"];
  dadosAte: string | null;
  avisoDado: string | null;
}

const FREQUENCIA_EM_LINGUAGEM_COMUM: Record<string, string> = {
  diaria: "todo dia útil",
  semanal: "toda semana",
  mensal: "todo mês",
  anual: "uma vez por ano",
  sob_demanda: "quando há dado novo",
};

const SITUACOES_COM_AVISO = new Set<FrescorFonteDTO["situacao"]>([
  "coleta_atrasada",
  "coleta_sem_registro",
  "nao_monitorado",
]);

export function utcReferenceDate(agora: Date = new Date()): string {
  return agora.toISOString().slice(0, 10);
}

/** Deixa o erro subir: loaders com cache não devem guardar uma falha como lista vazia. */
export function loadSourceFreshness(
  portalSlug: string,
): Promise<FrescorFonteDTO[]> {
  return getFrescorFontes(portalSlug, utcReferenceDate());
}

/** Para o selo, que é secundário: sem dado de frescor, o selo some. */
export async function loadSourceFreshnessOrEmpty(
  portalSlug: string,
): Promise<FrescorFonteDTO[]> {
  try {
    return await loadSourceFreshness(portalSlug);
  } catch {
    return [];
  }
}

export function formatVerificationDate(ultimaColetaEm: string | null) {
  if (!ultimaColetaEm) return null;
  const data = new Date(ultimaColetaEm);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function frequencyInPlainLanguage(frequenciaEsperada: string) {
  return (
    FREQUENCIA_EM_LINGUAGEM_COMUM[frequenciaEsperada] ?? frequenciaEsperada
  );
}

export function warningForStatus(
  situacao: FrescorFonteDTO["situacao"],
  dataVerificacao: string | null,
): string | null {
  if (situacao === "coleta_atrasada") {
    return dataVerificacao
      ? `Não conseguimos verificar esta fonte desde ${dataVerificacao}.`
      : "Não conseguimos verificar esta fonte no prazo previsto.";
  }
  if (situacao === "coleta_sem_registro") {
    return "Ainda não temos registro de quando buscamos os dados desta fonte.";
  }
  if (situacao === "nao_monitorado") {
    return "Não acompanhamos a data de atualização desta fonte.";
  }
  return null;
}

/** Período no tamanho que a fonte publica: "abril de 2026", "1º quadrimestre de 2026", "1º semestre de 2026" ou a data. */
export function formatPublishedPeriod(
  periodoMaisRecente: string | null,
  granularidade: FrescorFonteDTO["granularidadePeriodo"],
): string | null {
  if (!periodoMaisRecente || !granularidade) return null;
  const data = new Date(`${periodoMaisRecente}T00:00:00Z`);
  if (Number.isNaN(data.getTime())) return null;
  const mes = data.getUTCMonth() + 1;
  const ano = data.getUTCFullYear();
  if (granularidade === "dia") {
    return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  if (granularidade === "mes") {
    return data.toLocaleDateString("pt-BR", {
      timeZone: "UTC",
      month: "long",
      year: "numeric",
    });
  }
  const mesesPorPeriodo = granularidade === "quadrimestre" ? 4 : 6;
  return `${Math.ceil(mes / mesesPorPeriodo)}º ${granularidade} de ${ano}`;
}

/** A defasagem esperada é estimativa do catálogo: o aviso nunca a apresenta como fato medido. */
export function warningForDataStatus(
  situacaoDado: FrescorFonteDTO["situacaoDado"],
  dadosAte: string | null,
): string | null {
  if (situacaoDado !== "dado_defasado" || !dadosAte) return null;
  return `Os números desta fonte vão até ${dadosAte}, mais antigo do que ela costuma levar para publicar (estimativa nossa, não confirmada com a fonte).`;
}

export function hasFreshnessWarning(fonte: FrescorFonteDTO): boolean {
  return SITUACOES_COM_AVISO.has(fonte.situacao);
}

export function buildSourceSeal(
  frescor: FrescorFonteDTO[],
  fonte: string,
  portalSlug: string,
): SeloFonteViewModel | null {
  const linha = frescor.find((item) => item.fonte === fonte);
  if (!linha) return null;
  const dataVerificacao = formatVerificationDate(linha.ultimaColetaEm);
  const dadosAte = formatPublishedPeriod(
    linha.periodoMaisRecente,
    linha.granularidadePeriodo,
  );
  return {
    descricao: linha.descricaoDados,
    dataVerificacao,
    dadosAte,
    aviso:
      warningForStatus(linha.situacao, dataVerificacao) ??
      warningForDataStatus(linha.situacaoDado, dadosAte),
    href: `/${portalSlug}/como-atualizamos`,
  };
}

export function buildSourceRows(
  frescor: FrescorFonteDTO[],
): FonteComoAtualizamosViewModel[] {
  return frescor.map((linha) => {
    const dadosAte = formatPublishedPeriod(
      linha.periodoMaisRecente,
      linha.granularidadePeriodo,
    );
    return {
      fonte: linha.fonte,
      descricao: linha.descricaoDados,
      nomeFonte: linha.nomeFonte,
      urlFonte: linha.urlFonte,
      esferaFonte: linha.esferaFonte,
      frequencia: frequencyInPlainLanguage(linha.frequenciaEsperada),
      dataVerificacao: formatVerificationDate(linha.ultimaColetaEm),
      situacao: linha.situacao,
      dadosAte,
      avisoDado: warningForDataStatus(linha.situacaoDado, dadosAte),
    };
  });
}
