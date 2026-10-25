import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaLotesAVencer: vi.fn(),
  getFarmaciaSentinelas: vi.fn(),
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const {
  buildFarmaciaViewModel,
  buildFatoApagao,
  buildPedidoEsclarecimento,
  buildTelefoneHref,
  buildRequerimentoFiscalizacao,
  buildTextoWhatsApp,
  LEI_FARMACIA_SUS_URL,
  LEI_ORGANICA_SAUDE_URL,
} = await import("./view-model");

function makeRaw(opts: {
  busca?: string;
  unidades?: number;
  totalUnidadesAtivas?: number;
  dataPosicaoMaisRecente?: string | null;
  diasDesdePosicaoMaisRecente?: number | null;
  indicadores?: Record<string, number>;
}) {
  const unidades = Array.from({ length: opts.unidades ?? 0 }, (_, i) => ({
    idUnidade: `u${i}`,
    nomeUnidade: `UNIDADE DE SAUDE ${i}`,
    enderecoUnidade: null,
    telefoneUnidade: i === 0 ? "(22) 3333-4444" : null,
    latitudeUnidade: null,
    longitudeUnidade: null,
    totalQuantidadeEstoque: 100 - i * 10,
    medicamentos: [
      {
        nomeMedicamento: "OMEPRAZOL 20 MG",
        quantidadeEstoque: 100 - i * 10,
        dataPosicaoEstoque: null,
      },
    ],
  }));
  return {
    portalSlug: "portal_x",
    portalName: "Prefeitura X",
    context: { busca: opts.busca ?? "" },
    farmacia: {
      status: "conforme",
      dataColeta: null,
      dataPosicaoMaisRecente: opts.dataPosicaoMaisRecente ?? null,
      diasDesdePosicaoMaisRecente: opts.diasDesdePosicaoMaisRecente ?? null,
      totalUnidades: unidades.length,
      totalQuantidadeEstoque: unidades.reduce(
        (soma, u) => soma + u.totalQuantidadeEstoque,
        0,
      ),
      totalApresentacoes: unidades.length > 0 ? 1 : 0,
      unidades,
      remedios:
        unidades.length > 0
          ? [
              {
                nomeMedicamento: "OMEPRAZOL 20 MG",
                totalQuantidadeEstoque: unidades.reduce(
                  (soma, u) => soma + u.totalQuantidadeEstoque,
                  0,
                ),
                totalUnidadesComEstoque: unidades.length,
                unidades: unidades.map((u) => ({
                  idUnidade: u.idUnidade,
                  quantidadeEstoque: u.totalQuantidadeEstoque,
                })),
              },
            ]
          : [],
    },
    sentinelas: {
      totalUnidadesAtivas: opts.totalUnidadesAtivas ?? 4,
      indicadores: {
        totalEssenciais: 4,
        essenciaisNoEstoque: 2,
        essenciaisSomenteCombinacao: 1,
        essenciaisSemRegistro: 1,
        ...opts.indicadores,
      },
      sentinelas: [
        {
          codigoPrincipioAtivo: "losartana",
          nomePrincipioAtivo: "Losartana",
          grupoTerapeutico: "cardiovascular",
          ordemExibicao: 1,
          destaqueCardInicial: true,
          unidadesComRegistro: 3,
          unidadesSomenteCombinacao: 0,
        },
        {
          codigoPrincipioAtivo: "metformina",
          nomePrincipioAtivo: "Metformina",
          grupoTerapeutico: "diabetes",
          ordemExibicao: 2,
          destaqueCardInicial: false,
          unidadesComRegistro: 0,
          unidadesSomenteCombinacao: 0,
        },
        {
          codigoPrincipioAtivo: "captopril",
          nomePrincipioAtivo: "Captopril",
          grupoTerapeutico: "cardiovascular",
          ordemExibicao: 3,
          destaqueCardInicial: false,
          unidadesComRegistro: 1,
          unidadesSomenteCombinacao: 0,
        },
        {
          codigoPrincipioAtivo: "hidroclorotiazida",
          nomePrincipioAtivo: "Hidroclorotiazida",
          grupoTerapeutico: "cardiovascular",
          ordemExibicao: 4,
          destaqueCardInicial: false,
          unidadesComRegistro: 0,
          unidadesSomenteCombinacao: 2,
        },
      ],
    },
  } as unknown as Parameters<typeof buildFarmaciaViewModel>[0];
}

describe("buildFarmaciaViewModel", () => {
  it("q curto nao executa busca e mostra dica", () => {
    const vm = buildFarmaciaViewModel(makeRaw({ busca: "d" }));
    expect(vm.hasBusca).toBe(false);
    expect(vm.hasBuscaCurta).toBe(true);
    const vazio = buildFarmaciaViewModel(makeRaw({}));
    expect(vazio.hasBuscaCurta).toBe(false);
  });

  it("chips de mais procurados seguem o criterio das sentinelas de destaque", () => {
    const vm = buildFarmaciaViewModel(makeRaw({}));
    expect(vm.exemplos).toEqual([
      {
        codigoPrincipioAtivo: "losartana",
        nomePrincipioAtivo: "Losartana",
        href: "/portal_x/farmacia?q=Losartana#resultados",
      },
    ]);
  });
});

describe("buildFarmaciaViewModel indicadores", () => {
  it("usa o numero de unidades dos dados e sinaliza atencao nos essenciais", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        totalUnidadesAtivas: 7,
        dataPosicaoMaisRecente: "2026-10-19",
        diasDesdePosicaoMaisRecente: 5,
      }),
    );
    const [unidades, essenciais, atualizacao] = vm.indicadores;
    expect(unidades.valor).toBe("7");
    expect(essenciais.valor).toBe("2 de 4");
    expect(essenciais.nota).toBe(
      "1 não aparece na lista de estoque · 1 só em combinação",
    );
    expect(essenciais.notaAtencao).toBe(true);
    expect(atualizacao.nota).toContain("Há 5 dias");
  });

  it("essenciais sem pendencia: nota neutra sem atencao", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        indicadores: {
          essenciaisSemRegistro: 0,
          essenciaisSomenteCombinacao: 0,
        },
      }),
    );
    expect(vm.indicadores[1].nota).toBe("Todos aparecem na lista de estoque");
    expect(vm.indicadores[1].notaAtencao).toBe(false);
  });

  it("plural quando mais de um essencial nao aparece", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        indicadores: {
          essenciaisSemRegistro: 2,
          essenciaisSomenteCombinacao: 0,
        },
      }),
    );
    expect(vm.indicadores[1].nota).toBe("2 não aparecem na lista de estoque");
  });

  it("sem essenciais o cartao e omitido", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({ indicadores: { totalEssenciais: 0 } }),
    );
    expect(vm.indicadores.map((i) => i.codigo)).toEqual([
      "unidades_informaram",
    ]);
  });

  it.each([
    [0, "Enviada hoje"],
    [1, "Há 1 dia"],
  ])("dias %s na nota da atualizacao", (dias, esperado) => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        dataPosicaoMaisRecente: "2026-10-19",
        diasDesdePosicaoMaisRecente: dias,
      }),
    );
    expect(vm.indicadores[2].nota).toContain(esperado);
  });

  it("sem dias a nota da lista mais recente e omitida", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({ dataPosicaoMaisRecente: "2026-10-19" }),
    );
    expect(vm.indicadores[2].rotulo).toBe("Lista de estoque mais recente");
    expect(vm.indicadores[2].nota).toBeNull();
  });

  it("sem data de atualizacao o cartao e omitido", () => {
    const vm = buildFarmaciaViewModel(makeRaw({}));
    expect(vm.indicadores.map((i) => i.codigo)).not.toContain(
      "ultima_atualizacao",
    );
  });

  it("sem unidades ativas o bloco de indicadores e omitido", () => {
    const vm = buildFarmaciaViewModel(makeRaw({ totalUnidadesAtivas: 0 }));
    expect(vm.indicadores).toEqual([]);
  });
});

describe("buildFarmaciaViewModel essenciais", () => {
  it("lista essenciais com status, categoria e href de busca", () => {
    const vm = buildFarmaciaViewModel(makeRaw({}));
    expect(vm.totalUnidadesAtivas).toBe(4);
    expect(vm.categoriasEssenciais).toEqual([
      { codigo: "cardiovascular", rotulo: "Coração e pressão" },
      { codigo: "diabetes", rotulo: "Diabetes" },
    ]);
    expect(vm.essenciais.map((e) => [e.nomePrincipioAtivo, e.status])).toEqual([
      ["Losartana", "no_estoque"],
      ["Metformina", "sem_registro"],
      ["Captopril", "no_estoque"],
      ["Hidroclorotiazida", "somente_combinacao"],
    ]);
    expect(vm.essenciais[1].href).toBe(
      "/portal_x/farmacia?q=Metformina#resultados",
    );
  });

  it.each([
    "cardiovascular",
    "diabetes",
    "dor_febre",
    "antibiotico",
    "gastrointestinal",
    "respiratorio",
    "endocrino",
    "saude_mental",
  ])("grupo %s tem rotulo proprio", (grupoTerapeutico) => {
    const raw = makeRaw({});
    raw.sentinelas.sentinelas = [
      {
        codigoPrincipioAtivo: "x",
        nomePrincipioAtivo: "X",
        grupoTerapeutico,
        ordemExibicao: 1,
        destaqueCardInicial: false,
        unidadesComRegistro: 1,
        unidadesSomenteCombinacao: 0,
      },
    ];
    const [essencial] = buildFarmaciaViewModel(raw).essenciais;
    expect(essencial.rotuloCategoria).not.toContain("_");
    expect(essencial.rotuloCategoria).not.toBe(grupoTerapeutico);
  });
});

describe("buildFarmaciaViewModel resultados e mapa", () => {
  it("numera unidades, formata nomes e monta barras proporcionais por remedio", () => {
    const vm = buildFarmaciaViewModel(makeRaw({ busca: "omep", unidades: 2 }));
    expect(vm.unidades.map((u) => [u.numero, u.nomeUnidade])).toEqual([
      [1, "Unidade de Saude 0"],
      [2, "Unidade de Saude 1"],
    ]);
    expect(vm.unidades[0].telefoneHref).toBe("tel:2233334444");
    expect(vm.unidades[1].telefoneHref).toBeNull();
    expect(vm.unidades[0].medicamentos[0].nomeMedicamento).toBe(
      "Omeprazol 20 mg",
    );
    expect(vm.remedios[0].nomeMedicamento).toBe("Omeprazol 20 mg");
    expect(vm.remedios[0].unidades.map((u) => u.percentualBarra)).toEqual([
      100, 90,
    ]);
    expect(vm.resumoBusca).toBe("1 remédio em 2 de 4 unidades");
  });

  it("resumo sem unidades ativas e com uma unidade", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({ busca: "omep", unidades: 1, totalUnidadesAtivas: 0 }),
    );
    expect(vm.resumoBusca).toBe("1 remédio em 1 unidade");
  });

  it("mapMarkers inclui apenas unidades com coordenada valida e mantem o numero", () => {
    const raw = makeRaw({ busca: "dip", unidades: 3 });
    raw.farmacia.unidades[1].latitudeUnidade = -20.9;
    raw.farmacia.unidades[1].longitudeUnidade = -42;
    raw.farmacia.unidades[2].latitudeUnidade = 95;
    raw.farmacia.unidades[2].longitudeUnidade = -42;
    const vm = buildFarmaciaViewModel(raw);
    expect(vm.mapMarkers).toEqual([
      {
        id: "u1",
        numero: 2,
        nome: "Unidade de Saude 1",
        latitude: -20.9,
        longitude: -42,
      },
    ]);
  });
});

describe("buildFatoApagao", () => {
  it("com data e dias cita a data e os dias", () => {
    const fato = buildFatoApagao("2026-01-10", 20);
    expect(fato).toContain("há 20 dias");
    expect(fato).toContain("BNAFAR/Hórus");
  });

  it("sem data ou sem dias informa ausencia de divulgacao", () => {
    expect(buildFatoApagao(null, null)).toContain("não consta divulgação");
    expect(buildFatoApagao("2026-01-10", null)).toContain(
      "não consta divulgação",
    );
    expect(buildFatoApagao(null, 20)).toContain("não consta divulgação");
  });
});

describe("buildRequerimentoFiscalizacao", () => {
  it("inclui municipio, leis e citacao do Art. 6º-A", () => {
    const texto = buildRequerimentoFiscalizacao({
      portalName: "Prefeitura X",
      dataPosicaoMaisRecente: "2026-01-10",
      diasDesdePosicaoMaisRecente: 20,
    });
    expect(texto).toContain("Ouvidoria de Prefeitura X.");
    expect(texto).toContain("Art. 6º-A da Lei nº 8.080/1990");
    expect(texto).toContain(LEI_ORGANICA_SAUDE_URL);
    expect(texto).toContain(LEI_FARMACIA_SUS_URL);
    expect(LEI_FARMACIA_SUS_URL).toContain("l14654");
    expect(texto).toContain("há 20 dias");
  });

  it("sem portalName usa 'o município' e sem data usa fato generico", () => {
    const texto = buildRequerimentoFiscalizacao({
      portalName: "",
      dataPosicaoMaisRecente: null,
      diasDesdePosicaoMaisRecente: null,
    });
    expect(texto).toContain("Ouvidoria de o município.");
    expect(texto).toContain("não consta divulgação recente");
  });
});

describe("buildTextoWhatsApp", () => {
  it("com portalName e dias", () => {
    const texto = buildTextoWhatsApp({
      portalName: "Prefeitura X",
      diasDesdePosicaoMaisRecente: 20,
    });
    expect(texto).toContain("Prefeitura X:");
    expect(texto).toContain("tem 20 dias");
    expect(texto).toContain("Lei nº 14.654/2023");
  });

  it("sem portalName e sem dias usa textos neutros", () => {
    const texto = buildTextoWhatsApp({
      portalName: "",
      diasDesdePosicaoMaisRecente: null,
    });
    expect(texto).toContain("Este município:");
    expect(texto).toContain("Não há divulgação recente");
  });
});

describe("buildTelefoneHref", () => {
  it.each([
    ["(22) 3333-4444 / 3333-5555", "tel:2233334444"],
    ["22 99999-8888; 3333-1111", "tel:22999998888"],
    ["sem telefone", null],
    ["123", null],
    [null, null],
  ])("%s -> %s", (telefone, esperado) => {
    expect(buildTelefoneHref(telefone)).toBe(esperado);
  });
});

describe("buildFarmaciaViewModel pedido por remedio", () => {
  it("so o essencial sem registro recebe pedido, sem afirmar falta nem descumprimento", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({ dataPosicaoMaisRecente: "2026-10-18" }),
    );
    const [losartana, metformina, , hidro] = vm.essenciais;
    expect(losartana.pedido).toBeNull();
    expect(hidro.pedido).toBeNull();
    expect(metformina.pedido?.texto).toContain("Metformina");
    expect(metformina.pedido?.texto).toContain("18/10/2026");
    expect(metformina.pedido?.texto).toMatch(
      /arts\. 10 e 11 da Lei nº 12\.527/,
    );
    expect(metformina.pedido?.texto).toContain("Secretaria Municipal de Saúde");
    expect(metformina.pedido?.texto.toLowerCase()).not.toMatch(
      /esgotad|zerad|descumpr/,
    );
    expect(metformina.pedido?.textoWhatsApp.toLowerCase()).not.toMatch(
      /esgotad|zerad|descumpr/,
    );
  });

  it("sem data usa redacao generica e sem portalName cita o municipio", () => {
    const texto = buildPedidoEsclarecimento({
      portalName: "",
      nomeMedicamento: "Captopril",
      dataPosicaoMaisRecente: null,
    });
    expect(texto).toContain("Na posição de estoque divulgada, não consta");
    expect(texto).toContain("Secretaria Municipal de Saúde do município.");
  });
});

describe("buildFarmaciaViewModel lotes a vencer", () => {
  const lotes = {
    janelaDias: 60,
    totalLotesComValidade: 5,
    totalLotesAVencer: 2,
    totalRemediosAVencer: 1,
    totalLotesVencidosComSaldo: 0,
    dataVencimentoMaisProxima: "2026-11-05",
  };
  const comLotes = (valor: unknown) =>
    ({ ...makeRaw({}), lotesAVencer: valor }) as unknown as Parameters<
      typeof buildFarmaciaViewModel
    >[0];

  it("mostra o indicador com lotes, remedios e vencimento mais proximo", () => {
    const indicador = buildFarmaciaViewModel(comLotes(lotes)).indicadores.find(
      (i) => i.codigo === "lotes_a_vencer",
    );
    expect(indicador?.valor).toBe("2");
    expect(indicador?.rotulo).toContain("60");
    expect(indicador?.nota).toContain("1 remédio");
    expect(indicador?.nota).toContain("05/11/2026");
  });

  it("com tudo ja vencido mostra 0 a vencer e os vencidos com saldo", () => {
    const indicador = buildFarmaciaViewModel(
      comLotes({
        ...lotes,
        totalLotesAVencer: 0,
        totalRemediosAVencer: 0,
        totalLotesVencidosComSaldo: 2,
        dataVencimentoMaisProxima: null,
      }),
    ).indicadores.find((i) => i.codigo === "lotes_a_vencer");
    expect(indicador?.valor).toBe("0");
    expect(indicador?.nota).toContain("Nenhum vence em até 60 dias");
    expect(indicador?.nota).toContain("2 lotes já constam como vencidos");
    expect(indicador?.notaAtencao).toBe(true);
  });

  it.each([
    ["nula", null],
    ["sem validade", { ...lotes, totalLotesComValidade: 0 }],
  ])("omite o card quando %s", (_nome, valor) => {
    const vm = buildFarmaciaViewModel(comLotes(valor));
    expect(vm.indicadores.some((i) => i.codigo === "lotes_a_vencer")).toBe(
      false,
    );
  });
});
