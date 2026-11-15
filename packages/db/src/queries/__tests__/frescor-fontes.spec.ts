import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../client";
import { getFrescorFontes, montarFrescorFontes } from "../frescor-fontes";

const PORTAL_TESTE = "portal_frescor_teste";
const OUTRO_PORTAL = "portal_frescor_outro_teste";
const DATA_REFERENCIA = "2031-06-10";

function linha(dados: {
  portalSlug: string;
  fonte: string;
  frequencia: string;
  situacao: string;
  ultimaColetaEm: string | null;
  toleranciaDias: number | null;
  totalLinhas?: number | null;
  ultimaFalhaEm?: string | null;
  ultimoErroCodigo?: string | null;
  periodoFim?: string | null;
  granularidade?: string | null;
  defasagemDias?: number | null;
}) {
  return {
    id_registro: `${dados.portalSlug}-${dados.fonte}`,
    portal_slug: dados.portalSlug,
    fonte: dados.fonte,
    frequencia_esperada: dados.frequencia,
    descricao_dados: `descricao ${dados.fonte}`,
    nome_fonte: `nome ${dados.fonte}`,
    url_fonte:
      dados.fonte === "sem_url" ? null : `https://${dados.fonte}.exemplo`,
    esfera_fonte: "nacional",
    tolerancia_dias: dados.toleranciaDias,
    situacao_monitoramento: dados.situacao,
    ultima_coleta_em: dados.ultimaColetaEm,
    ultima_coleta_total_linhas: dados.totalLinhas ?? null,
    ultima_falha_em: dados.ultimaFalhaEm ?? null,
    ultimo_erro_codigo: dados.ultimoErroCodigo ?? null,
    total_coletas: dados.ultimaColetaEm ? 1 : 0,
    periodo_mais_recente_fim: dados.periodoFim ?? null,
    granularidade_periodo: dados.granularidade ?? null,
    defasagem_publicacao_dias: dados.defasagemDias ?? null,
  };
}

async function limpar() {
  await db
    .deleteFrom("fct_coletas_por_fonte")
    .where("portal_slug", "in", [PORTAL_TESTE, OUTRO_PORTAL])
    .execute();
}

describe("getFrescorFontes", () => {
  beforeAll(async () => {
    await limpar();
    await db
      .insertInto("fct_coletas_por_fonte")
      .values([
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "a_diaria_no_limite",
          frequencia: "diaria",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-06T23:30:00+00:00",
          toleranciaDias: 4,
          totalLinhas: 10,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "b_diaria_atrasada",
          frequencia: "diaria",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-05T00:10:00+00:00",
          toleranciaDias: 4,
          totalLinhas: 10,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "c_sem_registro",
          frequencia: "diaria",
          situacao: "sem_registro",
          ultimaColetaEm: null,
          toleranciaDias: 4,
          // só falhas: sem coleta com sucesso, a fonte segue sem registro
          ultimaFalhaEm: "2031-06-09T08:00:00Z",
          ultimoErroCodigo: "fonte_fora_do_ar",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "d_nao_monitorado",
          frequencia: "mensal",
          situacao: "nao_monitorado",
          ultimaColetaEm: null,
          toleranciaDias: 40,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "e_coleta_vazia",
          frequencia: "semanal",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-08T08:00:00+00:00",
          toleranciaDias: 10,
          totalLinhas: 0,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "f_sob_demanda",
          frequencia: "sob_demanda",
          situacao: "monitorado",
          ultimaColetaEm: "2029-06-01T08:00:00+00:00",
          toleranciaDias: null,
          totalLinhas: 3,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "h_falha_antes_do_prazo",
          frequencia: "diaria",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 4,
          totalLinhas: 10,
          ultimaFalhaEm: "2031-06-10T08:00:00+00:00",
          ultimoErroCodigo: "fonte_fora_do_ar",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "i_falha_apos_prazo",
          frequencia: "diaria",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-01T08:00:00+00:00",
          toleranciaDias: 4,
          totalLinhas: 10,
          ultimaFalhaEm: "2031-06-10T08:00:00+00:00",
          ultimoErroCodigo: "formato_mudou",
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "p1_periodo_recente",
          frequencia: "mensal",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 40,
          periodoFim: "2031-04-11",
          granularidade: "mes",
          defasagemDias: 60,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "p2_periodo_fronteira",
          frequencia: "mensal",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 40,
          periodoFim: "2031-04-11",
          granularidade: "quadrimestre",
          defasagemDias: 60,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "p3_periodo_defasado",
          frequencia: "mensal",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 40,
          periodoFim: "2031-04-10",
          granularidade: "semestre",
          defasagemDias: 60,
        }),
        linha({
          portalSlug: PORTAL_TESTE,
          fonte: "p4_sem_defasagem_no_catalogo",
          frequencia: "mensal",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 40,
          periodoFim: "2031-06-09",
          granularidade: "dia",
        }),
        linha({
          portalSlug: OUTRO_PORTAL,
          fonte: "g_outro_portal",
          frequencia: "diaria",
          situacao: "monitorado",
          ultimaColetaEm: "2031-06-09T08:00:00+00:00",
          toleranciaDias: 4,
        }),
      ])
      .execute();
  });

  afterAll(limpar);

  it("classifica cada fonte do portal pela data de referência, em ordem de fonte", async () => {
    const resultado = await getFrescorFontes(PORTAL_TESTE, DATA_REFERENCIA);

    expect(resultado.map(({ fonte, situacao }) => [fonte, situacao])).toEqual([
      ["a_diaria_no_limite", "coleta_em_dia"],
      ["b_diaria_atrasada", "coleta_atrasada"],
      ["c_sem_registro", "coleta_sem_registro"],
      ["d_nao_monitorado", "nao_monitorado"],
      ["e_coleta_vazia", "coleta_em_dia"],
      ["f_sob_demanda", "coleta_em_dia"],
      ["h_falha_antes_do_prazo", "coleta_em_dia"],
      ["i_falha_apos_prazo", "coleta_atrasada"],
      ["p1_periodo_recente", "coleta_em_dia"],
      ["p2_periodo_fronteira", "coleta_em_dia"],
      ["p3_periodo_defasado", "coleta_em_dia"],
      ["p4_sem_defasagem_no_catalogo", "coleta_em_dia"],
    ]);
  });

  it("preenche ultimaColetaEm só quando há coleta monitorada", async () => {
    const resultado = await getFrescorFontes(PORTAL_TESTE, DATA_REFERENCIA);
    const porFonte = Object.fromEntries(resultado.map((f) => [f.fonte, f]));

    expect(porFonte.a_diaria_no_limite.ultimaColetaEm).toBe(
      "2031-06-06T23:30:00.000Z",
    );
    expect(porFonte.c_sem_registro.ultimaColetaEm).toBeNull();
    expect(porFonte.d_nao_monitorado.ultimaColetaEm).toBeNull();
    expect(porFonte.a_diaria_no_limite.descricaoDados).toBe(
      "descricao a_diaria_no_limite",
    );
    expect(porFonte.a_diaria_no_limite).toMatchObject({
      nomeFonte: "nome a_diaria_no_limite",
      urlFonte: "https://a_diaria_no_limite.exemplo",
      esferaFonte: "nacional",
    });
  });

  it("falha recente não troca a última coleta boa: antes do prazo segue em dia, depois do prazo fica atrasada", async () => {
    const resultado = await getFrescorFontes(PORTAL_TESTE, DATA_REFERENCIA);
    const porFonte = Object.fromEntries(resultado.map((f) => [f.fonte, f]));

    expect(porFonte.h_falha_antes_do_prazo.ultimaColetaEm).toBe(
      "2031-06-09T08:00:00.000Z",
    );
    expect(porFonte.i_falha_apos_prazo.ultimaColetaEm).toBe(
      "2031-06-01T08:00:00.000Z",
    );
  });

  it("classifica o período publicado contra a defasagem do catálogo, sem presumir o que falta", async () => {
    const resultado = await getFrescorFontes(PORTAL_TESTE, DATA_REFERENCIA);
    const porFonte = Object.fromEntries(resultado.map((f) => [f.fonte, f]));
    const dado = ({
      periodoMaisRecente,
      granularidadePeriodo,
      situacaoDado,
    }: (typeof resultado)[number]) => [
      periodoMaisRecente,
      granularidadePeriodo,
      situacaoDado,
    ];

    expect(dado(porFonte.p1_periodo_recente)).toEqual([
      "2031-04-11",
      "mes",
      "dado_recente",
    ]);
    expect(dado(porFonte.p2_periodo_fronteira)).toEqual([
      "2031-04-11",
      "quadrimestre",
      "dado_recente",
    ]);
    expect(dado(porFonte.p3_periodo_defasado)).toEqual([
      "2031-04-10",
      "semestre",
      "dado_defasado",
    ]);
    expect(dado(porFonte.p4_sem_defasagem_no_catalogo)).toEqual([
      "2031-06-09",
      "dia",
      "periodo_nao_disponivel",
    ]);
    expect(dado(porFonte.a_diaria_no_limite)).toEqual([
      null,
      null,
      "periodo_nao_disponivel",
    ]);
  });

  it("não mistura o período de um portal com o de outro", async () => {
    const resultado = await getFrescorFontes(OUTRO_PORTAL, DATA_REFERENCIA);

    expect(resultado.map((f) => f.periodoMaisRecente)).toEqual([null]);
  });

  it("devolve só as fontes do portal pedido", async () => {
    const resultado = await getFrescorFontes(OUTRO_PORTAL, DATA_REFERENCIA);

    expect(resultado.map((f) => f.fonte)).toEqual(["g_outro_portal"]);
  });

  it("devolve lista vazia para slug vazio", async () => {
    expect(await getFrescorFontes("  ", DATA_REFERENCIA)).toEqual([]);
  });

  it("recusa data de referência inválida em vez de afirmar coleta em dia", () => {
    expect(() => montarFrescorFontes([], "ontem")).toThrow(
      "dataReferencia inválida",
    );
  });
});
