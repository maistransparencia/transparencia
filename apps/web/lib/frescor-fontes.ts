import { type FrescorFonteDTO, getFrescorFontes } from "@transparencia/db";

export interface SeloFonteViewModel {
  descricao: string;
  /** Data da última coleta já formatada em pt-BR; nula quando a fonte não é monitorada. */
  dataVerificacao: string | null;
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
  return {
    descricao: linha.descricaoDados,
    dataVerificacao,
    aviso: warningForStatus(linha.situacao, dataVerificacao),
    href: `/${portalSlug}/como-atualizamos`,
  };
}

export function buildSourceRows(
  frescor: FrescorFonteDTO[],
): FonteComoAtualizamosViewModel[] {
  return frescor.map((linha) => ({
    fonte: linha.fonte,
    descricao: linha.descricaoDados,
    nomeFonte: linha.nomeFonte,
    urlFonte: linha.urlFonte,
    esferaFonte: linha.esferaFonte,
    frequencia: frequencyInPlainLanguage(linha.frequenciaEsperada),
    dataVerificacao: formatVerificationDate(linha.ultimaColetaEm),
    situacao: linha.situacao,
  }));
}
