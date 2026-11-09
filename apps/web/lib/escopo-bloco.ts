/** Escopo temporal declarado no título de cada bloco das páginas de tema. */

/** Período de uma série histórica: "2017–2027", ou só o ano quando há um único. */
export const periodoDaSerie = (anoMin: number, anoMax: number): string =>
  anoMin === anoMax ? `${anoMin}` : `${anoMin}–${anoMax}`;

/** Bloco do exercício: o ano vem do parâmetro ativo. */
export const tituloDoExercicio = (titulo: string, ano?: number): string =>
  ano === undefined ? titulo : `${titulo} em ${ano}`;

/** Bloco de série histórica: o período vem dos pontos reais dos dados. */
export const tituloDaSerie = (
  titulo: string,
  anos: readonly number[],
): string =>
  anos.length === 0
    ? titulo
    : `${titulo} (${periodoDaSerie(Math.min(...anos), Math.max(...anos))})`;

/** Pergunta sobre uma série: "…, de 2024 a 2026?" ou "…, em 2026?" com um único ano. */
export const perguntaDaSerie = (
  pergunta: string,
  anos: readonly number[],
): string => {
  if (anos.length === 0) return `${pergunta}?`;
  const anoMin = Math.min(...anos);
  const anoMax = Math.max(...anos);
  return anoMin === anoMax
    ? `${pergunta}, em ${anoMin}?`
    : `${pergunta}, de ${anoMin} a ${anoMax}?`;
};

/** Verbo no tempo certo: presente no ano em andamento, passado nos anos fechados. */
export const pickTense = (
  isCurrentYear: boolean,
  present: string,
  past: string,
): string => (isCurrentYear ? present : past);
