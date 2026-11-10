import type { ResumoObrasDTO, SituacaoHomeDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import type { EducacaoResumoCardData } from "@/components/educacao-resumo-card";
import {
  type BuildSituacaoCidadeParams,
  buildSituacaoCidadeCards,
} from "./situacao-cidade";

const SEM_ATENCAO = { emAtencao: false, motivo: null } as const;

const situacao = (parcial: Partial<SituacaoHomeDTO> = {}): SituacaoHomeDTO => ({
  saude: { estado: "normal", ...SEM_ATENCAO },
  obras: { estado: "normal", ...SEM_ATENCAO },
  educacao: { estado: "normal", ...SEM_ATENCAO },
  ...parcial,
});

const minimo = (percentualAplicado: number | null, limite = 15) => ({
  limite,
  percentualAplicado,
  baseLegal: "CF/88 Art. 198",
  urlBaseLegal: "https://www.planalto.gov.br/exemplo",
});

const obras = (parcial: Partial<ResumoObrasDTO> = {}): ResumoObrasDTO => ({
  totalObras: 5,
  emExecucao: 2,
  paralisadas: 1,
  concluidas: 2,
  cadastradas: 0,
  canceladas: 0,
  valorTotalInvestimento: 0,
  valorEmExecucao: 0,
  valorParalisadas: 0,
  valorConcluidas: 0,
  valorCadastradas: 0,
  percentualMedioExecucaoFisica: null,
  obrasSemMedicaoCount: 0,
  ...parcial,
});

const educacao = (
  parcial: Partial<EducacaoResumoCardData> = {},
): EducacaoResumoCardData =>
  ({
    notaIdebTexto: "5,9",
    notaAnteriorValorTexto: "5,4",
    evolucaoTom: "destaque",
    metaTexto: null,
    ...parcial,
  }) as EducacaoResumoCardData;

const base = (
  parcial: Partial<BuildSituacaoCidadeParams> = {},
): BuildSituacaoCidadeParams => ({
  situacao: situacao(),
  ano: 2024,
  farmaciaStatus: "conforme",
  minimoSaude: minimo(18.2),
  resumoObras: obras(),
  educacaoResumo: educacao(),
  minimoEducacao: minimo(27, 25),
  saudeDetailUrl: "/saude",
  obrasDetailUrl: "/obras",
  educacaoDetailUrl: "/educacao",
  ...parcial,
});

const card = (
  parametros: BuildSituacaoCidadeParams,
  area: "saude" | "obras" | "educacao",
) => buildSituacaoCidadeCards(parametros).find((c) => c.area === area);

describe("buildSituacaoCidadeCards", () => {
  it("mantém a ordem fixa Saúde, Obras, Educação", () => {
    expect(buildSituacaoCidadeCards(base()).map((c) => c.area)).toEqual([
      "saude",
      "obras",
      "educacao",
    ]);
  });

  it("estado normal: apoio com 'Sim' e sem etiqueta", () => {
    const saude = card(base(), "saude");
    expect(saude?.apoio?.texto).toMatch(/^Sim:/);
    expect(saude?.motivoAtencao).toBeNull();
    expect(saude?.tom).toBe("neutro");
  });

  it("parcial: 'Em andamento' sem veredito", () => {
    const saude = card(
      base({
        situacao: situacao({
          saude: { estado: "parcial", ...SEM_ATENCAO },
        }),
      }),
      "saude",
    );
    expect(saude?.apoio?.texto).toMatch(/^Em andamento:/);
    expect(saude?.apoio?.texto).not.toMatch(/Sim|Ainda não/);
    expect(saude?.motivoAtencao).toBeNull();
  });

  it("abaixo em ano fechado: 'Ainda não', tom de atenção e motivo escrito", () => {
    const educacaoCard = card(
      base({
        situacao: situacao({
          educacao: {
            estado: "abaixo",
            emAtencao: true,
            motivo: "abaixo_minimo",
          },
        }),
      }),
      "educacao",
    );
    expect(educacaoCard?.apoio?.texto).toMatch(/^Ainda não:/);
    expect(educacaoCard?.tom).toBe("atencao");
    expect(educacaoCard?.motivoAtencao).toBe(
      "Aplicou menos que o mínimo exigido no ano.",
    );
  });

  it("sem_dado: a linha da régua não aparece", () => {
    const saude = card(
      base({
        situacao: situacao({
          saude: { estado: "sem_dado", ...SEM_ATENCAO },
        }),
      }),
      "saude",
    );
    expect(saude?.apoio).toBeNull();
  });

  it("obra paralisada: etiqueta com motivo no singular e no plural", () => {
    const parametros = (paralisadas: number) =>
      base({
        resumoObras: obras({ paralisadas }),
        situacao: situacao({
          obras: {
            estado: "normal",
            emAtencao: true,
            motivo: "obra_paralisada",
          },
        }),
      });
    expect(card(parametros(1), "obras")?.motivoAtencao).toBe(
      "1 obra está parada.",
    );
    expect(card(parametros(2), "obras")?.motivoAtencao).toBe(
      "2 obras estão paradas.",
    );
    // O motivo já diz quantas estão paradas; o complemento não repete.
    expect(card(parametros(1), "obras")?.complemento).toBeNull();
  });

  it("sem obra andando nem parada, a manchete mostra as não iniciadas", () => {
    const obrasCard = card(
      base({
        resumoObras: obras({
          emExecucao: 0,
          paralisadas: 0,
          cadastradas: 15,
          concluidas: 2,
        }),
      }),
      "obras",
    );
    expect(obrasCard?.manchete).toBe("15 não iniciadas");
    expect(obrasCard?.complemento).toBe("2 concluídas");
    expect(obrasCard?.textoCompartilhar).toContain(
      "15 não iniciadas e 2 concluídas.",
    );
  });

  it("obras em andamento sem nenhuma parada dizem isso por extenso", () => {
    const obrasCard = card(
      base({ resumoObras: obras({ emExecucao: 3, paralisadas: 0 }) }),
      "obras",
    );
    expect(obrasCard?.manchete).toBe("3 em andamento");
    expect(obrasCard?.complemento).toBe("nenhuma parada");
  });

  it("farmácia em apagão: sem etiqueta e com borda neutra", () => {
    const saude = card(base({ farmaciaStatus: "apagao" }), "saude");
    expect(saude?.manchete).toBe("Sem informação de estoque");
    expect(saude?.motivoAtencao).toBeNull();
    expect(saude?.tom).toBe("neutro");
  });

  it("farmácia indisponível: o mínimo vira a manchete; sem mínimo o card some", () => {
    const comMinimo = card(base({ farmaciaStatus: "indisponivel" }), "saude");
    expect(comMinimo?.manchete).toMatch(/^Sim:/);
    expect(comMinimo?.apoio).toBeNull();
    const semMinimo = card(
      base({
        farmaciaStatus: "indisponivel",
        minimoSaude: null,
        situacao: situacao({
          saude: { estado: "indisponivel", ...SEM_ATENCAO },
        }),
      }),
      "saude",
    );
    expect(semMinimo).toBeUndefined();
  });

  it("cidade sem obras ou sem Ideb não gera card", () => {
    expect(
      card(base({ resumoObras: obras({ totalObras: 0 }) }), "obras"),
    ).toBeUndefined();
    expect(card(base({ resumoObras: null }), "obras")).toBeUndefined();
    expect(
      card(
        base({ educacaoResumo: educacao({ notaIdebTexto: "—" }) }),
        "educacao",
      ),
    ).toBeUndefined();
  });

  it("Ideb em queda mostra a seta para baixo com era X e nunca gera etiqueta", () => {
    const educacaoCard = card(
      base({ educacaoResumo: educacao({ evolucaoTom: "atencao" }) }),
      "educacao",
    );
    expect(educacaoCard?.complemento).toBe("era 5,4");
    expect(educacaoCard?.sentidoComplemento).toBe("caiu");
    expect(educacaoCard?.textoCompartilhar).toContain("(caiu, era 5,4)");
    expect(educacaoCard?.motivoAtencao).toBeNull();
  });

  it("as fontes do card apontam para os links oficiais", () => {
    const obrasCard = card(base(), "obras");
    expect(obrasCard?.fontes[0]?.url).toMatch(/^https:\/\//);
  });

  it("o texto de compartilhar leva período e fonte", () => {
    const obrasCard = card(base(), "obras");
    expect(obrasCard?.textoCompartilhar).toContain("Dados de 2024");
    expect(obrasCard?.textoCompartilhar).toContain("Fonte: ObrasGov.br");
  });
});
