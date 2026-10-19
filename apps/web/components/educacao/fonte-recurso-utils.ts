import type { GrupoFonteRecursoEducacao } from "@transparencia/db";

/** Ordem fixa de exibição das fontes (valores literais para não importar o runtime do banco no cliente). */
export const ORDEM_FONTES_RECURSO: GrupoFonteRecursoEducacao[] = [
  "fundeb",
  "fundeb_complementacao_uniao",
  "salario_educacao",
  "pnae",
  "pnate",
  "outros_fnde",
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
  outras_receitas:
    "Rendimentos de aplicações, restituições e demais receitas do fundo.",
  nao_detalhado:
    "Parte da receita foi informada pelo portal sem indicar a origem.",
};

export const BASE_LEGAL_FONTE_RECURSO: Partial<
  Record<GrupoFonteRecursoEducacao, BaseLegalFonte>
> = {
  fundeb: {
    rotulo: "Lei nº 14.113/2020",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14113.htm",
  },
  fundeb_complementacao_uniao: {
    rotulo: "Lei nº 14.113/2020",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14113.htm",
  },
  salario_educacao: {
    rotulo: "Lei nº 9.766/1998",
    url: "https://www.planalto.gov.br/ccivil_03/leis/l9766.htm",
  },
  pnae: {
    rotulo: "Lei nº 11.947/2009",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/lei/l11947.htm",
  },
  pnate: {
    rotulo: "Lei nº 10.880/2004",
    url: "https://www.planalto.gov.br/ccivil_03/_ato2004-2006/2004/lei/l10.880.htm",
  },
};

/** Cor fixa por fonte (não por posição), para não mudar de um ano para outro. */
export const COR_FONTE_RECURSO: Record<GrupoFonteRecursoEducacao, string> = {
  fundeb: "bg-sky-700",
  fundeb_complementacao_uniao: "bg-amber-500",
  salario_educacao: "bg-emerald-600",
  pnae: "bg-rose-500",
  pnate: "bg-violet-600",
  outros_fnde: "bg-cyan-600",
  outras_receitas: "bg-slate-400",
  nao_detalhado: "bg-slate-300",
};

export const ID_PAINEL_FISCAL_EDUCACAO = "painel-fiscal-educacao";

export const LIMIAR_SEGMENTO_AGRUPADO = 3;

export function formatPercentualInteiro(percentual: number): string {
  if (percentual > 0 && percentual < 1) return "<1%";
  return `${Math.round(percentual)}%`;
}
