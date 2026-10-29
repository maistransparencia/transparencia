import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaLotesAVencer: vi.fn(),
  getFarmaciaSentinelas: vi.fn(),
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const {
  buildFarmaciaViewModel,
  buildIndiceAz,
  buildFatoApagao,
  buildPedidoEsclarecimento,
  buildTelefoneHref,
  buildRequerimentoFiscalizacao,
  nomeMunicipioDoPortal,
  buildTextoWhatsApp,
  buildTextoWhatsAppPedido,
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
    expect(atualizacao.nota).toBeNull();
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

  it("a lista mais recente mostra so a data, sem nota de dias", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        dataPosicaoMaisRecente: "2026-10-19",
        diasDesdePosicaoMaisRecente: 5,
      }),
    );
    expect(vm.indicadores[2].rotulo).toBe("Lista de estoque mais recente");
    expect(vm.indicadores[2].valor).toBe("19/10/2026");
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
        unidadesSomenteLoteVencido: 0,
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
      portalName: "Prefeitura de Cidade Exemplo",
      dataPosicaoMaisRecente: "2026-01-10",
      diasDesdePosicaoMaisRecente: 20,
    });
    expect(texto).toContain("Ouvidoria de Cidade Exemplo.");
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
    expect(texto).toContain("Ouvidoria do município.");
    expect(texto).toContain("não consta divulgação recente");
  });
});

describe("nomeMunicipioDoPortal", () => {
  it.each([
    ["Prefeitura de Cidade Exemplo", "Cidade Exemplo"],
    ["Prefeitura Municipal de São José", "São José"],
    ["Prefeitura da Barra", "Barra"],
    ["Cidade Exemplo", "Cidade Exemplo"],
    ["", ""],
  ])("%s vira %s", (entrada, esperado) => {
    expect(nomeMunicipioDoPortal(entrada)).toBe(esperado);
  });

  it("o pedido e dirigido a Secretaria Municipal de Saude so com o nome da cidade", () => {
    const texto = buildPedidoEsclarecimento({
      portalName: "Prefeitura de Cidade Exemplo",
      nomeMedicamento: "Captopril",
      dataPosicaoMaisRecente: "2026-10-19",
    });
    expect(texto).toContain(
      "À Secretaria Municipal de Saúde de Cidade Exemplo.",
    );
    expect(texto).not.toContain("Prefeitura");
  });
});

describe("buildTextoWhatsAppPedido", () => {
  it("cita a Secretaria de Saude so com o nome da cidade", () => {
    const texto = buildTextoWhatsAppPedido({
      portalName: "Prefeitura de Cidade Exemplo",
      nomeMedicamento: "Captopril",
    });
    expect(texto).toContain("Secretaria de Saúde de Cidade Exemplo");
    expect(texto).not.toContain("Prefeitura");
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
    totalRemediosSomenteVencidos: 0,
    totalLotesRemediosSomenteVencidos: 0,
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
    expect(indicador?.nota).toBe(
      "2 lotes, de 1 remédio. O primeiro vence em 05/11/2026.",
    );
    expect(indicador?.detalhe).toBeNull();
  });

  it("explica que lotes e remedios sao contagens diferentes", () => {
    const indicador = buildFarmaciaViewModel(
      comLotes({ ...lotes, totalLotesAVencer: 36, totalRemediosAVencer: 23 }),
    ).indicadores.find((i) => i.codigo === "lotes_a_vencer");
    expect(indicador?.valor).toBe("36");
    expect(indicador?.nota).toContain("36 lotes, de 23 remédios diferentes.");
  });

  it.each([
    [1, 1, "1 remédio tem só lote com a validade vencida (1 lote)."],
    [102, 162, "102 remédios têm só lotes com a validade vencida (162 lotes)."],
  ])(
    "mostra remedios so com lotes vencidos (%i remedios, %i lotes)",
    (remedios, lotesVencidos, trecho) => {
      const indicador = buildFarmaciaViewModel(
        comLotes({
          ...lotes,
          totalRemediosSomenteVencidos: remedios,
          totalLotesRemediosSomenteVencidos: lotesVencidos,
        }),
      ).indicadores.find((i) => i.codigo === "lotes_a_vencer");
      expect(indicador?.nota).not.toContain("Na lista de estoque");
      expect(indicador?.detalhe?.paragrafos[0]).toBe(
        `Na lista de estoque mais recente, ${trecho}`,
      );
      expect(indicador?.detalhe?.paragrafos[1]).toContain(
        "Não significa que o remédio",
      );
      expect(indicador?.notaAtencao).toBe(true);
    },
  );

  it("com tudo ja vencido mostra 0 a vencer e os vencidos com saldo", () => {
    const indicador = buildFarmaciaViewModel(
      comLotes({
        ...lotes,
        totalLotesAVencer: 0,
        totalRemediosAVencer: 0,
        totalLotesVencidosComSaldo: 2,
        totalRemediosSomenteVencidos: 2,
        totalLotesRemediosSomenteVencidos: 2,
        dataVencimentoMaisProxima: null,
      }),
    ).indicadores.find((i) => i.codigo === "lotes_a_vencer");
    expect(indicador?.valor).toBe("0");
    expect(indicador?.nota).toContain("Nenhum vence em até 60 dias");
    expect(indicador?.detalhe?.resumo).toBe("2 remédios só com lote vencido");
    expect(indicador?.detalhe?.paragrafos[0]).toContain(
      "2 remédios têm só lotes com a validade vencida (2 lotes)",
    );
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

describe("buildIndiceAz", () => {
  const indice = {
    status: "conforme",
    totalUnidades: 4,
    letrasDisponiveis: ["A", "B", "D"],
    totalLetras: 3,
    letras: [
      {
        letra: "A",
        totalMedicamentos: 4,
        medicamentos: [
          { nomeMedicamento: "AMOXICILINA", unidadesComEstoque: 2 },
          { nomeMedicamento: "Atenolol 50mg", unidadesComEstoque: 1 },
        ],
      },
      {
        letra: "B",
        totalMedicamentos: 1,
        medicamentos: [{ nomeMedicamento: "Bromexina", unidadesComEstoque: 1 }],
      },
    ],
  } as never;
  const contexto = {
    busca: "",
    letra: "",
    letrasVisiveis: 2,
    itensVisiveis: 25,
  };
  const contextoPedido = {
    portalName: "Prefeitura de Teste",
    dataPosicaoMaisRecente: "2026-10-18",
  };
  const parametros = {
    contextoPedido,
    portalSlug: "portal_x",
    indice,
    context: contexto,
    totalUnidadesAtivas: 7,
    passoLetras: 6,
    passoItens: 25,
  };

  it("sem 'Ver mais' quando o limite visivel ja e o maximo", () => {
    expect(
      buildIndiceAz({
        ...parametros,
        indice: { ...(indice as object), totalLetras: 30 } as never,
        context: { ...contexto, letrasVisiveis: 27 },
      })?.hrefMais,
    ).toBeNull();
  });

  it("sem indice ou sem letras nao ha secao", () => {
    expect(buildIndiceAz({ ...parametros, indice: null })).toBeNull();
    expect(
      buildIndiceAz({
        ...parametros,
        indice: { ...(indice as object), letrasDisponiveis: [] } as never,
      }),
    ).toBeNull();
  });

  it("resumo: A-Z ativo, letras sem itens desabilitadas e links por letra", () => {
    const vm = buildIndiceAz(parametros);
    expect(vm?.modo).toBe("resumo");
    const porCodigo = new Map(vm?.chips.map((c) => [c.codigo, c]));
    expect(vm?.chips).toHaveLength(27);
    expect(porCodigo.get("todas")).toMatchObject({
      rotulo: "A–Z",
      ativo: true,
    });
    expect(porCodigo.get("B")?.href).toBe("/portal_x/farmacia?letra=B#indice");
    expect(porCodigo.get("C")?.href).toBeNull();
    expect(vm?.grupos[0]).toMatchObject({
      letra: "A",
      rotuloTotal: "4 remédios",
      rotuloTodos: "Ver todos com A",
      hrefTodos: "/portal_x/farmacia?letra=A#indice",
    });
    expect(vm?.grupos[1].rotuloTotal).toBe("1 remédio");
    expect(vm?.grupos[0].medicamentos[0]).toMatchObject({
      nomeMedicamento: "Amoxicilina",
      href: "/portal_x/farmacia?q=AMOXICILINA#resultados",
    });
    expect(vm?.totalUnidades).toBe(7);
  });

  it("resumo: revela o proximo passo de letras com o que falta", () => {
    const vm = buildIndiceAz(parametros);
    expect(vm?.rotuloProgresso).toBe("Mostrando 2 de 3 letras");
    expect(vm?.hrefMais).toBe("/portal_x/farmacia?letras=8#indice");
    expect(vm?.rotuloMais).toBe("Ver mais 1 letra");
    const completo = buildIndiceAz({
      ...parametros,
      indice: {
        ...(indice as object),
        totalLetras: 2,
      } as never,
    });
    expect(completo?.hrefMais).toBeNull();
  });

  it("letra: marca o chip, mostra o progresso e propoe mais itens", () => {
    const vm = buildIndiceAz({
      ...parametros,
      context: { ...contexto, letra: "A", itensVisiveis: 2 },
      indice: {
        ...(indice as object),
        letras: [(indice as { letras: unknown[] }).letras[0]],
      } as never,
    });
    expect(vm?.modo).toBe("letra");
    expect(vm?.letraSelecionada).toBe("A");
    expect(vm?.chips.find((c) => c.ativo)?.codigo).toBe("A");
    expect(vm?.rotuloProgresso).toBe("Mostrando 2 de 4");
    expect(vm?.hrefMais).toBe("/portal_x/farmacia?letra=A&itens=27#indice");
    expect(vm?.rotuloMais).toBe("Ver mais 2 remédios");
  });

  it("busca por texto: nenhum chip marcado e sem lista", () => {
    const vm = buildIndiceAz({
      ...parametros,
      context: { ...contexto, busca: "dipirona", letra: "A" },
    });
    expect(vm?.modo).toBe("busca");
    expect(vm?.chips.some((c) => c.ativo)).toBe(false);
  });

  it("usa o total de unidades do indice quando nao ha unidades ativas nas sentinelas", () => {
    const vm = buildIndiceAz({ ...parametros, totalUnidadesAtivas: 0 });
    expect(vm?.totalUnidades).toBe(4);
  });

  it("0-9 vira chip depois do Z so quando o grupo existe", () => {
    const comNumeros = buildIndiceAz({
      ...parametros,
      indice: {
        ...(indice as object),
        letrasDisponiveis: ["A", "0-9"],
        totalLetras: 2,
        letras: [
          {
            letra: "0-9",
            totalMedicamentos: 1,
            medicamentos: [
              { nomeMedicamento: "5-fluorouracila", unidadesComEstoque: 1 },
            ],
          },
        ],
      } as never,
      context: { ...contexto, letra: "0-9" },
    });
    expect(comNumeros?.chips).toHaveLength(28);
    expect(comNumeros?.chips.at(-1)).toMatchObject({
      codigo: "0-9",
      rotulo: "0–9",
      href: "/portal_x/farmacia?letra=0-9#indice",
      ativo: true,
    });
    expect(comNumeros?.grupos[0]).toMatchObject({
      rotuloLetra: "0–9",
      rotuloTodos: "Ver todos com 0–9",
    });
    expect(comNumeros?.rotuloLetraSelecionada).toBe("0–9");
    expect(buildIndiceAz(parametros)?.chips).toHaveLength(27);
  });
});

describe("remedio so com lote vencido", () => {
  const contexto = {
    portalName: "Prefeitura de Teste",
    dataPosicaoMaisRecente: "2026-10-18",
  };

  it("o pedido troca a constatacao e pede lote dentro da validade, mantendo a base legal", () => {
    const texto = buildPedidoEsclarecimento({
      ...contexto,
      nomeMedicamento: "Captopril",
      situacao: "somente_vencido",
    });
    expect(texto).toContain("arts. 10 e 11 da Lei nº 12.527/2011");
    expect(texto).toContain("art. 6º-A da Lei nº 8.080/1990");
    expect(texto).toContain(
      "todos os lotes desse item que constam na lista estão com a validade vencida",
    );
    expect(texto).not.toContain("até a baixa");
    expect(texto).toContain(
      "Peço informar se há lote desse medicamento dentro da validade em alguma unidade e, se não houver, a previsão de reposição.",
    );
    expect(texto).not.toContain("não consta registro de estoque");
  });

  it("o texto do WhatsApp diz que os lotes estao vencidos na lista", () => {
    const texto = buildTextoWhatsAppPedido({
      portalName: contexto.portalName,
      nomeMedicamento: "Captopril",
      situacao: "somente_vencido",
    });
    expect(texto).toContain(
      "Na lista de estoque divulgada, todos os lotes desse remédio estão com a validade vencida.",
    );
    expect(texto).not.toContain("não aparece na lista");
  });

  it("essencial so com lote vencido tem estado proprio, pedido e resumo no cartao", () => {
    const raw = makeRaw({});
    raw.sentinelas.sentinelas = [
      {
        codigoPrincipioAtivo: "captopril",
        nomePrincipioAtivo: "Captopril",
        grupoTerapeutico: "cardiovascular",
        ordemExibicao: 1,
        destaqueCardInicial: false,
        unidadesComRegistro: 0,
        unidadesSomenteCombinacao: 0,
        unidadesSomenteLoteVencido: 2,
      },
    ];
    raw.sentinelas.indicadores = {
      totalEssenciais: 1,
      essenciaisNoEstoque: 0,
      essenciaisSomenteLoteVencido: 1,
      essenciaisSomenteCombinacao: 0,
      essenciaisSemRegistro: 0,
    };
    const vm = buildFarmaciaViewModel(raw);
    expect(vm.essenciais[0]).toMatchObject({
      status: "somente_vencido",
      rotuloSituacao: "Sem lote dentro da validade na lista",
    });
    expect(vm.essenciais[0]?.pedido?.texto).toContain("validade vencida");
    const cartao = vm.indicadores.find(
      (i) => i.codigo === "essenciais_no_estoque",
    );
    expect(cartao?.valor).toBe("0 de 1");
    expect(cartao?.nota).toBe("1 só com lote vencido");
  });

  it("no indice, o remedio so vencido perde o link e ganha o pedido", () => {
    const indice = {
      status: "conforme",
      totalUnidades: 4,
      letrasDisponiveis: ["C"],
      totalLetras: 1,
      letras: [
        {
          letra: "C",
          totalMedicamentos: 2,
          medicamentos: [
            {
              nomeMedicamento: "Captopril",
              unidadesComEstoque: 0,
              situacaoValidade: "somente_vencido",
            },
            {
              nomeMedicamento: "Carvedilol",
              unidadesComEstoque: 2,
              situacaoValidade: "com_lote_valido",
            },
          ],
        },
      ],
    } as never;
    const vm = buildIndiceAz({
      portalSlug: "portal_x",
      indice,
      context: { busca: "", letra: "", letrasVisiveis: 6, itensVisiveis: 25 },
      totalUnidadesAtivas: 4,
      passoLetras: 6,
      passoItens: 25,
      contextoPedido: contexto,
    });
    const [captopril, carvedilol] = vm?.grupos[0]?.medicamentos ?? [];
    expect(captopril?.href).toBeNull();
    expect(captopril?.semLoteValido?.rotulo).toBe(
      "Sem lote dentro da validade na lista",
    );
    expect(captopril?.semLoteValido?.pedido.texto).toContain("Captopril");
    expect(carvedilol?.href).toContain("q=Carvedilol");
    expect(carvedilol?.semLoteValido).toBeNull();
  });

  it("mapeia remedios so vencidos da busca com nome formatado, link, rotulo e pedido", () => {
    const raw = makeRaw({ busca: "captopril", unidades: 1 });
    const vm = buildFarmaciaViewModel({
      ...raw,
      farmacia: {
        ...raw.farmacia,
        medicamentosSemLoteValido: ["captopril 25mg"],
      },
    } as Parameters<typeof buildFarmaciaViewModel>[0]);
    expect(vm.medicamentosSemLoteValido).toHaveLength(1);
    const [item] = vm.medicamentosSemLoteValido;
    expect(item.nomeMedicamento.toLowerCase()).toContain("captopril");
    expect(item.href).toContain("q=captopril");
    expect(item.rotulo).toBe("Sem lote dentro da validade na lista");
    expect(item.pedido.texto).toContain("validade vencida");
    expect(item.pedido.texto).not.toContain("baixa ou o descarte");
  });
});
