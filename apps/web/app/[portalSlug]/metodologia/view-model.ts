import { buildComoAtualizamosViewModel } from "../como-atualizamos/view-model";
import type { MetodologiaRawData } from "./loader";

/** Cobertura só fala de acompanhamento da data de busca; atraso é assunto de "Como atualizamos". */
function describeCoverage(acompanhadas: number, semAcompanhamento: number) {
  if (semAcompanhamento === 0) {
    return "Acompanhamos o dia em que o portal busca cada uma destas fontes.";
  }
  const fontes =
    semAcompanhamento === 1 ? "uma fonte" : `${semAcompanhamento} fontes`;
  if (acompanhadas === 0) {
    return "Ainda não acompanhamos o dia em que o portal busca as fontes. Os números continuam à mostra, mas não dá para dizer até quando estão em dia.";
  }
  return `Para ${fontes} ainda sem acompanhamento, o portal não registra o dia da busca. Os números continuam à mostra, mas não dá para dizer até quando estão em dia.`;
}

export function buildMetodologiaViewModel(raw: MetodologiaRawData) {
  const { fontes, acompanhadas, semAcompanhamento } =
    buildComoAtualizamosViewModel(raw);
  return {
    portalSlug: raw.portalSlug,
    fontes: fontes.map((fonte) => ({
      fonte: fonte.fonte,
      descricao: fonte.descricao,
      fonteOficial: fonte.fonteOficial,
    })),
    cobertura: describeCoverage(acompanhadas.length, semAcompanhamento.length),
    lacunas: raw.lacunas.filter((lacuna) => lacuna.tipo === "lacuna"),
    divergencias: raw.lacunas.filter((lacuna) => lacuna.tipo === "divergencia"),
  };
}
