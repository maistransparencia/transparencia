import { describe, expect, it } from "vitest";
import { buildAlertaUrl } from "../radar-url";

describe("buildAlertaUrl", () => {
  it("deve gerar rota correta para desconto nulo em pregão com número de licitação e âncora #itens", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "desconto_nulo_pregao",
      ano: 2026,
      licitacaoNumero: "000517",
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/licitacoes?ano=2026&numero=000517#itens");
  });

  it("deve omitir parâmetro numero quando licitacaoNumero for nulo ou vazio", () => {
    const urlNull = buildAlertaUrl({
      tipoAnomalia: "desconto_nulo_pregao",
      ano: 2026,
      licitacaoNumero: null,
      portalSlug: "porciuncula",
    });
    expect(urlNull).toBe("/porciuncula/licitacoes?ano=2026#itens");

    const urlEmpty = buildAlertaUrl({
      tipoAnomalia: "desconto_nulo_pregao",
      ano: 2026,
      licitacaoNumero: "   ",
      portalSlug: "porciuncula",
    });
    expect(urlEmpty).toBe("/porciuncula/licitacoes?ano=2026#itens");
  });

  it("deve gerar rota correta para deságio extremo com número de licitação", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "desagio_extremo_inexequibilidade",
      ano: 2026,
      licitacaoNumero: "000290",
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/licitacoes?ano=2026&numero=000290#itens");
  });

  it("deve incluir parâmetro entidade quando especificado nas opções", () => {
    const url = buildAlertaUrl(
      {
        tipoAnomalia: "explosao_comissionados",
        ano: 2024,
        portalSlug: "porciuncula",
      },
      { entidade: "camara" },
    );
    expect(url).toBe(
      "/porciuncula/pessoal?ano=2024&entidade=camara#comissionados",
    );
  });

  it("deve ignorar parâmetro entidade quando vazio ou composto apenas por espaços", () => {
    const url = buildAlertaUrl(
      {
        tipoAnomalia: "explosao_comissionados",
        ano: 2024,
        portalSlug: "porciuncula",
      },
      { entidade: "   " },
    );
    expect(url).toBe("/porciuncula/pessoal?ano=2024#comissionados");
  });

  it("deve gerar rota correta para pico de despesa homóloga sem âncora", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/despesas?ano=2024");
  });

  it("deve gerar rota correta para opacidade em gastos genéricos com âncora #gastos-genericos", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "opacidade_gastos_genericos",
      ano: 2026,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/despesas?ano=2026#gastos-genericos");
  });

  it("deve gerar rota correta para rombo de caixa com âncora #saldo-caixa", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "rombo_caixa",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/receitas?ano=2024#saldo-caixa");
  });

  it("deve gerar rota correta para aporte atuarial do RPPS com âncora #atuarial", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "inadimplencia_aporte_rpps",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/caprem?ano=2024#atuarial");
  });

  it("deve gerar rota correta para retenção patronal do RPPS com âncora #patronal", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "retencao_patronal_rpps",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/caprem?ano=2024#patronal");
  });

  it("deve gerar rota correta para inconsistência de vínculo de pessoal com âncora #regime", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "inconsistencia_vinculo_pessoal",
      ano: 2026,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/pessoal?ano=2026#regime");
  });

  it("deve gerar rota correta para dependência de transferências sem âncora", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "dependencia_transferencias",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/receitas?ano=2024");
  });

  it("deve gerar rota correta para concentração de dispensas sem âncora", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "concentracao_dispensa",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula/licitacoes?ano=2024");
  });

  it("deve fornecer fallback seguro para raiz do portal quando anomalia for desconhecida", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "desconhecido",
      ano: 2024,
      portalSlug: "porciuncula",
    });
    expect(url).toBe("/porciuncula?ano=2024");
  });

  it("deve sanitizar portalSlug removendo barras e espaços adjacentes", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: 2024,
      portalSlug: " /porciuncula/ ",
    });
    expect(url).toBe("/porciuncula/despesas?ano=2024");
  });

  it("deve combinar ano, numero e entidade na ordem canônica com âncora ao final", () => {
    const url = buildAlertaUrl(
      {
        tipoAnomalia: "desconto_nulo_pregao",
        ano: 2026,
        licitacaoNumero: "000517",
        portalSlug: "porciuncula",
      },
      { entidade: "saude" },
    );
    expect(url).toBe(
      "/porciuncula/licitacoes?ano=2026&numero=000517&entidade=saude#itens",
    );
  });

  it("não deve gerar barras duplas quando portalSlug for vazio ou ausente", () => {
    const url = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: 2024,
      portalSlug: "",
    });
    expect(url).toBe("/despesas?ano=2024");
    expect(url.startsWith("//")).toBe(false);

    const urlRaiz = buildAlertaUrl({
      tipoAnomalia: "desconhecido",
      ano: 2024,
      portalSlug: undefined,
    });
    expect(urlRaiz).toBe("/?ano=2024");
  });

  it("deve fazer fallback para alerta.portalSlug quando opts.portalSlug for string vazia ou em branco", () => {
    const url = buildAlertaUrl(
      {
        tipoAnomalia: "opacidade_gastos_genericos",
        ano: 2026,
        portalSlug: "porciuncula",
      },
      { portalSlug: "   " },
    );
    expect(url).toBe("/porciuncula/despesas?ano=2026#gastos-genericos");
  });

  it("não deve incluir parâmetro de ano quando ano for zero, negativo ou não inteiro", () => {
    const urlZero = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: 0,
      portalSlug: "porciuncula",
    });
    expect(urlZero).toBe("/porciuncula/despesas");

    const urlNegativo = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: -1,
      portalSlug: "porciuncula",
    });
    expect(urlNegativo).toBe("/porciuncula/despesas");

    const urlFloat = buildAlertaUrl({
      tipoAnomalia: "pico_despesa_homologa",
      ano: 2024.5,
      portalSlug: "porciuncula",
    });
    expect(urlFloat).toBe("/porciuncula/despesas");
  });
});
