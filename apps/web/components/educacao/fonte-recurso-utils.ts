import type { GrupoFonteRecursoEducacao } from "@transparencia/db";
import { urlLegislacao } from "@/lib/constants/legislacao";

/** Ordem fixa de exibição das fontes (valores literais para não importar o runtime do banco no cliente). */
export const ORDEM_FONTES_RECURSO: GrupoFonteRecursoEducacao[] = [
  "fundeb",
  "fundeb_complementacao_uniao",
  "salario_educacao",
  "pnae",
  "pnate",
  "outros_fnde",
  "royalties",
  "outras_receitas",
  "nao_detalhado",
];

export interface BaseLegalFonte {
  rotulo: string;
  url: string;
}

export const ROTULO_FONTE_RECURSO: Record<GrupoFonteRecursoEducacao, string> = {
  fundeb: "FUNDEB",
  fundeb_complementacao_uniao: "Complementação da União",
  salario_educacao: "Salário-Educação",
  pnae: "Merenda (PNAE)",
  pnate: "Transporte Escolar (PNATE)",
  outros_fnde: "Outros programas do FNDE",
  royalties: "Royalties",
  outras_receitas: "Outras receitas",
  nao_detalhado: "Não detalhado",
};

export const DESCRICAO_FONTE_RECURSO: Record<
  GrupoFonteRecursoEducacao,
  string
> = {
  fundeb: "Recursos que o município recebeu do Fundo da Educação Básica.",
  fundeb_complementacao_uniao:
    "Recursos que o município recebeu da União para complementar o FUNDEB.",
  salario_educacao:
    "Recursos que o município recebeu da União a partir da contribuição social do salário-educação.",
  pnae: "Recursos que o município recebeu da União para a merenda escolar.",
  pnate: "Recursos que o município recebeu da União para o transporte escolar.",
  outros_fnde:
    "Recursos de outros programas do Fundo Nacional de Desenvolvimento da Educação.",
  royalties:
    "Recursos de royalties do petróleo recebidos pelo fundo, com os rendimentos de aplicação.",
  outras_receitas:
    "Rendimentos de aplicações, restituições e demais receitas do fundo.",
  nao_detalhado:
    "Parte da receita foi informada pelo portal sem indicar a origem.",
};

export const BASE_LEGAL_FONTE_RECURSO: Partial<
  Record<GrupoFonteRecursoEducacao, BaseLegalFonte[]>
> = {
  fundeb: [
    {
      rotulo: "Lei nº 14.113/2020",
      url: urlLegislacao("lei14113"),
    },
  ],
  fundeb_complementacao_uniao: [
    {
      rotulo: "Lei nº 14.113/2020",
      url: urlLegislacao("lei14113"),
    },
  ],
  salario_educacao: [
    {
      rotulo: "Lei nº 9.766/1998",
      url: urlLegislacao("lei9766"),
    },
  ],
  pnae: [
    {
      rotulo: "Lei nº 11.947/2009",
      url: urlLegislacao("lei11947"),
    },
  ],
  pnate: [
    {
      rotulo: "Lei nº 10.880/2004",
      url: urlLegislacao("lei10880"),
    },
  ],
  royalties: [
    {
      rotulo: "Lei nº 12.858/2013",
      url: urlLegislacao("lei12858"),
    },
    {
      rotulo: "Lei nº 7.990/1989",
      url: urlLegislacao("lei7990"),
    },
  ],
};

export function formatMesPorExtenso(mes: number): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2000, mes - 1, 1)));
}

export const LIMIAR_SEGMENTO_AGRUPADO = 3;

export function formatPercentualInteiro(percentual: number): string {
  if (percentual > 0 && percentual < 1) return "<1%";
  return `${Math.round(percentual)}%`;
}
