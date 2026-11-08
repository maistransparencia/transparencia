/** Eyebrow de período: um único ano mostra só o ano; intervalo mostra `anoMin–anoMax`. */
export const rotuloPeriodoAnos = (anoMin: number, anoMax: number): string =>
  anoMin === anoMax ? String(anoMin) : `${anoMin}–${anoMax}`;
