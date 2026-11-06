import { db } from "../client";

export const AREAS_EMENDA_ESTADUAL = ["saude", "educacao"] as const;
export type AreaEmendaEstadual = (typeof AREAS_EMENDA_ESTADUAL)[number];

/** Para onde vai o dinheiro, pela modalidade da emenda. */
export type DestinoEmendaEstadual =
  | "chega_prefeitura"
  | "estado_executa"
  | "organizacao"
  | "nao_identificado";

interface ModalidadeRotulo {
  rotulo: string;
  explicacao: string;
  destino: DestinoEmendaEstadual;
}

/** Rótulos ao cidadão por código de modalidade (o mart guarda só o código em snake_case). */
export const MODALIDADES_EMENDA_ESTADUAL: Record<string, ModalidadeRotulo> = {
  transferencia_especial: {
    rotulo: "Repasse direto à Prefeitura (transferência especial)",
    explicacao: "O Estado envia o dinheiro direto à Prefeitura.",
    destino: "chega_prefeitura",
  },
  finalidade_definida: {
    rotulo: "Repasse com finalidade definida",
    explicacao: "O Estado repassa à Prefeitura para uma finalidade combinada.",
    destino: "chega_prefeitura",
  },
  fundo_a_fundo: {
    rotulo: "Fundo a fundo",
    explicacao: "O dinheiro vai do fundo do Estado para o fundo do município.",
    destino: "chega_prefeitura",
  },
  execucao_direta: {
    rotulo: "O Estado gasta direto",
    explicacao:
      "O próprio Estado faz a obra ou a compra. O dinheiro não passa pela Prefeitura.",
    destino: "estado_executa",
  },
  osc: {
    rotulo: "Repasse a organização da sociedade civil",
    explicacao:
      "O dinheiro vai a uma organização da sociedade civil, não à Prefeitura.",
    destino: "organizacao",
  },
};

const MODALIDADE_DESCONHECIDA: ModalidadeRotulo = {
  rotulo: "Modalidade não identificada",
  explicacao:
    "O Estado não informou a modalidade de um jeito que possamos classificar.",
  destino: "nao_identificado",
};

export interface EmendaEstadualDTO {
  id: string;
  numero: string;
  autor: string;
  objeto: string;
  beneficiario: string;
  valor: number;
  area: string;
  modalidade: string;
  modalidadeRotulo: string;
  modalidadeExplicacao: string;
  destino: DestinoEmendaEstadual;
  nomeArquivo: string;
  dataArquivo: string | null;
  faseArquivo: string | null;
  /** Falso quando a emenda não está no arquivo mais recente da sua fase (retirada ou ainda não incluída). */
  constaNoArquivoMaisRecente: boolean;
  dataArquivoMaisRecenteFase: string | null;
  /** Há cadastro da emenda na Prefeitura com o mesmo ano, número e autor. Falso não indica omissão. */
  constaNoCadastroMunicipal: boolean;
  valorCadastroMunicipal: number | null;
  /** Nulo quando nenhum relatório de execução do Estado traz a emenda. */
  execucao: ExecucaoEstadualDTO | null;
}

/** Execução da emenda segundo o relatório do Estado, na posição (mês/ano) em que o relatório foi feito. */
export interface ExecucaoEstadualDTO {
  /** Mês e ano a que o relatório se refere, por exemplo "08/2026". */
  posicao: string;
  dotacaoInicial: number | null;
  empenhado: number | null;
  liquidado: number | null;
  pago: number | null;
}

export interface FonteEmendaDTO {
  esfera: "estadual" | "federal" | "municipal";
  orgao: string;
  /** Nome do arquivo ou da página consultada. */
  nome: string;
  dataArquivo: string | null;
  /** Posição do relatório de execução (mês/ano); só existe quando a fonte traz execução. */
  posicaoRelatorio: string | null;
  url: string;
  /** O que esta fonte alimenta na tela (por exemplo, "emendas do Estado"). */
  uso: string;
}

export interface EmendasEstaduaisDTO {
  ano: number | null;
  /** `sem_fonte`: o Estado do portal não tem fonte oficial configurada (estado neutro na tela). */
  situacao: "sem_fonte" | "sem_emendas" | "com_emendas";
  fontes: FonteEmendaDTO[];
  emendas: EmendaEstadualDTO[];
  totalChegaPrefeitura: number;
  totalEstadoExecuta: number;
  totalOrganizacao: number;
  totalNaoIdentificado: number;
  totalIndicado: number;
  /** Posição (mês/ano) do relatório de execução mais recente do ano; nulo se o Estado não o publica. */
  posicaoExecucao: string | null;
}

export const emendasEstaduaisVazio: EmendasEstaduaisDTO = {
  ano: null,
  situacao: "sem_fonte",
  fontes: [],
  emendas: [],
  totalChegaPrefeitura: 0,
  totalEstadoExecuta: 0,
  totalOrganizacao: 0,
  totalNaoIdentificado: 0,
  totalIndicado: 0,
  posicaoExecucao: null,
};

/** Fonte nacional das emendas federais: órgão e página oficiais (não depende do município). */
export const FONTE_EMENDAS_FEDERAIS: FonteEmendaDTO = {
  esfera: "federal",
  orgao:
    "Controladoria-Geral da União (Portal da Transparência do Governo Federal)",
  nome: "Emendas parlamentares",
  dataArquivo: null,
  posicaoRelatorio: null,
  url: "https://portaldatransparencia.gov.br/emendas",
  uso: "emendas federais",
};

type Row = Record<string, unknown>;

function numeroOuNulo(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

/** "08/2026": mês com dois dígitos e ano. */
function formatarPosicao(ano: unknown, mes: unknown): string {
  return `${String(mes).padStart(2, "0")}/${String(ano)}`;
}

function isoDate(value: unknown): string | null {
  if (!value) return null;
  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).slice(0, 10);
}

/**
 * `fontesRows` são todas as fontes da UF do portal (qualquer ano): sem elas, estado neutro. Na tela entram só
 * os arquivos e as emendas do `ano` escolhido.
 */
export function montarEmendasEstaduais(
  fontesRows: Row[],
  emendasRows: Row[],
  ano: number,
): EmendasEstaduaisDTO {
  if (fontesRows.length === 0) return emendasEstaduaisVazio;

  const arquivosDetalhamento = fontesRows.filter(
    (r) => r.tipo_arquivo !== "execucao" && Number(r.ano) === ano,
  );
  const relatorios = fontesRows
    .filter(
      (r) =>
        r.tipo_arquivo === "execucao" &&
        Number(r.posicao_ano_relatorio) === ano,
    )
    .sort(
      (a, b) =>
        Number(b.posicao_mes_relatorio) - Number(a.posicao_mes_relatorio),
    );
  const relatorioMaisRecente = relatorios[0];
  const posicaoExecucao = relatorioMaisRecente
    ? formatarPosicao(
        relatorioMaisRecente.posicao_ano_relatorio,
        relatorioMaisRecente.posicao_mes_relatorio,
      )
    : null;

  const fontes: FonteEmendaDTO[] = [
    ...arquivosDetalhamento.map(
      (r): FonteEmendaDTO => ({
        esfera: "estadual",
        orgao: String(r.orgao_publicador),
        nome: String(r.nome_arquivo_estado),
        dataArquivo: isoDate(r.data_arquivo_estado),
        posicaoRelatorio: null,
        url: String(r.url_pagina_oficial),
        uso: "emendas do Estado",
      }),
    ),
    ...(relatorioMaisRecente
      ? [
          {
            esfera: "estadual" as const,
            orgao: String(relatorioMaisRecente.orgao_publicador),
            nome: String(relatorioMaisRecente.nome_arquivo_estado),
            dataArquivo: null,
            posicaoRelatorio: posicaoExecucao,
            url: String(relatorioMaisRecente.url_pagina_oficial),
            uso: "emendas do Estado",
          },
        ]
      : []),
  ];

  const emendas: EmendaEstadualDTO[] = emendasRows
    .map((r) => {
      const modalidade = String(r.modalidade);
      const rotulo =
        MODALIDADES_EMENDA_ESTADUAL[modalidade] ?? MODALIDADE_DESCONHECIDA;
      return {
        id: String(r.identificador),
        numero: String(r.numero_emenda),
        autor: String(r.autor),
        objeto: String(r.objeto_emenda ?? ""),
        beneficiario: String(r.beneficiario_emenda ?? ""),
        valor: Number(r.valor_emenda_estadual ?? 0),
        area: String(r.area_emenda),
        modalidade,
        modalidadeRotulo: rotulo.rotulo,
        modalidadeExplicacao: rotulo.explicacao,
        destino: rotulo.destino,
        nomeArquivo: String(r.nome_arquivo_estado),
        dataArquivo: isoDate(r.data_arquivo_estado),
        faseArquivo: r.fase_arquivo_estado
          ? String(r.fase_arquivo_estado)
          : null,
        constaNoArquivoMaisRecente: r.consta_no_arquivo_mais_recente !== false,
        dataArquivoMaisRecenteFase: isoDate(r.data_arquivo_mais_recente_fase),
        constaNoCadastroMunicipal: r.consta_no_cadastro_municipal === true,
        valorCadastroMunicipal: numeroOuNulo(r.valor_cadastro_municipal),
        execucao:
          r.posicao_mes_execucao_estado === null ||
          r.posicao_mes_execucao_estado === undefined
            ? null
            : {
                posicao: formatarPosicao(
                  r.posicao_ano_execucao_estado,
                  r.posicao_mes_execucao_estado,
                ),
                dotacaoInicial: numeroOuNulo(r.dotacao_inicial_estado),
                empenhado: numeroOuNulo(r.empenhado_estado),
                liquidado: numeroOuNulo(r.liquidado_estado),
                pago: numeroOuNulo(r.pago_estado),
              },
      };
    })
    .sort((a, b) => b.valor - a.valor || a.numero.localeCompare(b.numero));

  const somar = (destino: DestinoEmendaEstadual) =>
    emendas
      .filter((e) => e.destino === destino)
      .reduce((total, e) => total + e.valor, 0);

  return {
    ano,
    situacao: emendas.length > 0 ? "com_emendas" : "sem_emendas",
    fontes,
    emendas,
    totalChegaPrefeitura: somar("chega_prefeitura"),
    totalEstadoExecuta: somar("estado_executa"),
    totalOrganizacao: somar("organizacao"),
    totalNaoIdentificado: somar("nao_identificado"),
    totalIndicado: emendas.reduce((total, e) => total + e.valor, 0),
    posicaoExecucao,
  };
}

/**
 * Lista oficial de emendas do Estado para o município. A fonte é a do Estado do próprio portal
 * (configurada no pipeline); sem fonte, devolve o estado neutro. `area` filtra por objeto e beneficiário.
 */
export async function getEmendasEstaduais(
  portalSlug: string,
  ano: number,
  area?: AreaEmendaEstadual,
): Promise<EmendasEstaduaisDTO> {
  try {
    const [fontesRows, emendasRows] = await Promise.all([
      db
        .selectFrom("fct_emendas_estaduais_fontes")
        .selectAll()
        .where("portal_slug", "=", portalSlug)
        .orderBy("data_arquivo_estado", "desc")
        .execute(),
      db
        .selectFrom("fct_emendas_estaduais")
        .selectAll()
        .where("portal_slug", "=", portalSlug)
        .where("ano", "=", ano)
        .$if(area !== undefined, (qb) =>
          qb.where("area_emenda", "=", area as string),
        )
        .execute(),
    ]);
    return montarEmendasEstaduais(fontesRows, emendasRows, ano);
  } catch {
    return emendasEstaduaisVazio;
  }
}

/** Fontes das emendas de um portal: Estado (se houver), Governo Federal e a própria Prefeitura. */
export async function getFontesEmendas(
  portalSlug: string,
  ano: number,
): Promise<FonteEmendaDTO[]> {
  const estadual = await getEmendasEstaduais(portalSlug, ano);
  const portal = await db
    .selectFrom("dim_portais")
    .select(["display_name", "portal_url"])
    .where("portal_slug", "=", portalSlug)
    .executeTakeFirst()
    .catch(() => undefined);
  const municipal: FonteEmendaDTO[] = portal
    ? [
        {
          esfera: "municipal",
          orgao: String(portal.display_name),
          nome: "Portal da Transparência da Prefeitura",
          dataArquivo: null,
          posicaoRelatorio: null,
          url: String(portal.portal_url),
          uso: "cadastro da Prefeitura",
        },
      ]
    : [];
  return [...estadual.fontes, FONTE_EMENDAS_FEDERAIS, ...municipal];
}
