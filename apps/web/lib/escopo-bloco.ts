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
