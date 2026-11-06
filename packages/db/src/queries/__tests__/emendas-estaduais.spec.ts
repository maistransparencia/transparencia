import { describe, expect, it } from "vitest";
import {
  emendasEstaduaisVazio,
  getEmendasEstaduais,
  montarEmendasEstaduais,
} from "../emendas-estaduais";

const fonte = (orgao: string, url: string, ano = 2026) => ({
  ano,
  orgao_publicador: orgao,
  nome_arquivo_estado: "detalhamento.csv",
  data_arquivo_estado: "2026-08-18",
  url_pagina_oficial: url,
});

const emenda = (dados: Record<string, unknown>) => ({
  identificador: "i1",
  numero_emenda: "650",
  autor: "Autor",
  objeto_emenda: "Objeto",
  beneficiario_emenda: "Prefeitura",
  valor_emenda_estadual: 100,
  area_emenda: "outras",
  modalidade: "transferencia_especial",
  nome_arquivo_estado: "detalhamento.csv",
  data_arquivo_estado: "2026-08-18",
  fase_arquivo_estado: "2",
  ...dados,
});

describe("montarEmendasEstaduais", () => {
  it("sem fonte configurada devolve o estado neutro", () => {
    expect(montarEmendasEstaduais([], [], 2026)).toEqual(emendasEstaduaisVazio);
    expect(emendasEstaduaisVazio.situacao).toBe("sem_fonte");
  });

  it("com fonte e sem emendas informa sem_emendas e mostra a fonte", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão A", "https://a.test")],
      [],
      2026,
    );
    expect(r.situacao).toBe("sem_emendas");
    expect(r.fontes[0]).toMatchObject({
      esfera: "estadual",
      orgao: "Órgão A",
      url: "https://a.test",
      dataArquivo: "2026-08-18",
    });
  });

  it("execução direta e OSC nunca entram no que chega à Prefeitura", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test")],
      [
        emenda({ identificador: "a", valor_emenda_estadual: 100 }),
        emenda({
          identificador: "b",
          modalidade: "execucao_direta",
          valor_emenda_estadual: 200,
        }),
        emenda({
          identificador: "c",
          modalidade: "osc",
          valor_emenda_estadual: 300,
        }),
        emenda({
          identificador: "d",
          modalidade: "fundo_a_fundo",
          valor_emenda_estadual: 50,
        }),
      ],
      2026,
    );
    expect(r.totalChegaPrefeitura).toBe(150);
    expect(r.totalEstadoExecuta).toBe(200);
    expect(r.totalOrganizacao).toBe(300);
    expect(r.totalIndicado).toBe(650);
  });

  it("funciona com uma segunda fonte fictícia de outro Estado e modalidade desconhecida", () => {
    const r = montarEmendasEstaduais(
      [fonte("Secretaria Fictícia", "https://ficticia.test")],
      [emenda({ modalidade: "inventada" })],
      2026,
    );
    expect(r.emendas[0]).toMatchObject({
      destino: "nao_identificado",
      modalidadeRotulo: "Modalidade não identificada",
    });
    expect(r.totalChegaPrefeitura).toBe(0);
  });

  it("mantém duas emendas de mesmo número e autores diferentes", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test")],
      [
        emenda({ identificador: "x", autor: "Um" }),
        emenda({ identificador: "y", autor: "Dois" }),
      ],
      2026,
    );
    expect(r.emendas.map((e) => e.autor).sort()).toEqual(["Dois", "Um"]);
  });
});

describe("ano selecionado", () => {
  it("ano sem arquivo da fonte é sem_emendas (não sem_fonte) e não lista fontes de outro ano", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test", 2026)],
      [],
      2025,
    );
    expect(r.situacao).toBe("sem_emendas");
    expect(r.ano).toBe(2025);
    expect(r.fontes).toEqual([]);
  });

  it("emenda fora do arquivo mais recente da fase vem sinalizada, com a data", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test")],
      [
        emenda({
          consta_no_arquivo_mais_recente: false,
          data_arquivo_mais_recente_fase: "2026-04-09",
        }),
      ],
      2026,
    );
    expect(r.emendas[0]).toMatchObject({
      constaNoArquivoMaisRecente: false,
      dataArquivoMaisRecenteFase: "2026-04-09",
    });
  });
});

const relatorio = (mes: number, ano = 2026) => ({
  ano: null,
  tipo_arquivo: "execucao",
  orgao_publicador: "Órgão",
  nome_arquivo_estado: `relatorio_${mes}.csv`,
  data_arquivo_estado: null,
  url_pagina_oficial: "https://a.test",
  posicao_ano_relatorio: ano,
  posicao_mes_relatorio: mes,
});

describe("conferência e execução do Estado", () => {
  it("mostra só o relatório de posição mais recente do ano, com mês/ano", () => {
    const r = montarEmendasEstaduais(
      [
        fonte("Órgão", "https://a.test"),
        relatorio(4),
        relatorio(8),
        relatorio(12, 2025),
      ],
      [emenda({})],
      2026,
    );
    expect(r.posicaoExecucao).toBe("08/2026");
    const estaduais = r.fontes.filter((f) => f.posicaoRelatorio);
    expect(estaduais).toHaveLength(1);
    expect(estaduais[0].posicaoRelatorio).toBe("08/2026");
  });

  it("execução zerada na posição fica como zero medido, e sem relatório fica nula", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test")],
      [
        emenda({
          identificador: "a",
          posicao_ano_execucao_estado: 2026,
          posicao_mes_execucao_estado: 8,
          dotacao_inicial_estado: 100,
          empenhado_estado: 0,
          liquidado_estado: 0,
          pago_estado: 0,
        }),
        emenda({ identificador: "b" }),
      ],
      2026,
    );
    const porId = Object.fromEntries(r.emendas.map((e) => [e.id, e]));
    expect(porId.a.execucao).toEqual({
      posicao: "08/2026",
      dotacaoInicial: 100,
      empenhado: 0,
      liquidado: 0,
      pago: 0,
    });
    expect(porId.b.execucao).toBeNull();
  });

  it("cruza com o cadastro da Prefeitura e informa o valor de lá", () => {
    const r = montarEmendasEstaduais(
      [fonte("Órgão", "https://a.test")],
      [
        emenda({
          identificador: "a",
          consta_no_cadastro_municipal: true,
          valor_cadastro_municipal: 90,
        }),
        emenda({ identificador: "b", consta_no_cadastro_municipal: false }),
      ],
      2026,
    );
    const porId = Object.fromEntries(r.emendas.map((e) => [e.id, e]));
    expect(porId.a).toMatchObject({
      constaNoCadastroMunicipal: true,
      valorCadastroMunicipal: 90,
    });
    expect(porId.b).toMatchObject({
      constaNoCadastroMunicipal: false,
      valorCadastroMunicipal: null,
    });
  });
});

describe("getEmendasEstaduais", () => {
  it("portal sem fonte devolve o estado neutro, sem erro", async () => {
    const r = await getEmendasEstaduais("portal_inexistente_teste", 2026);
    expect(r.situacao).toBe("sem_fonte");
    expect(r.emendas).toEqual([]);
  });
});
