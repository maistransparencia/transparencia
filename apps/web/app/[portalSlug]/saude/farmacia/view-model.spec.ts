import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const {
  buildFarmaciaViewModel,
  buildFatoApagao,
  buildRequerimentoFiscalizacao,
  buildTextoWhatsApp,
  LEI_FARMACIA_SUS_URL,
  LEI_ORGANICA_SAUDE_URL,
} = await import("./view-model");

function makeRaw(opts: {
  busca?: string;
  idUnidade?: string | null;
  limiteUnidades?: number;
  unidades?: number;
  totalUnidades?: number;
}) {
  const unidades = Array.from({ length: opts.unidades ?? 0 }, (_, i) => ({
    idUnidade: `u${i}`,
    nomeUnidade: `Unidade ${i}`,
    enderecoUnidade: null,
    telefoneUnidade: null,
    latitudeUnidade: null,
    longitudeUnidade: null,
    medicamentos: [],
  }));
  return {
    portalSlug: "portal_x",
    portalName: "Prefeitura X",
    context: {
      busca: opts.busca ?? "",
      idUnidade: opts.idUnidade ?? null,
      limiteUnidades: opts.limiteUnidades ?? 10,
    },
    farmacia: {
      status: "conforme",
      dataColeta: null,
      dataPosicaoMaisRecente: null,
      diasDesdePosicaoMaisRecente: null,
      totalUnidades: opts.totalUnidades ?? unidades.length,
      unidades,
    },
  } as unknown as Parameters<typeof buildFarmaciaViewModel>[0];
}

describe("buildFarmaciaViewModel", () => {
  it("unidade filtrada: limpar sem unidade e ver mais mantendo unidade", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({ busca: "dip", idUnidade: "u1", unidades: 1, totalUnidades: 5 }),
    );
    expect(vm.limparFiltroUnidadeHref).toBe("/portal_x/saude/farmacia?q=dip");
    expect(vm.hasMaisUnidades).toBe(true);
    expect(vm.maisUnidadesHref).toBe(
      "/portal_x/saude/farmacia?q=dip&unidade=u1&limite=20",
    );
  });

  it("esconde ver mais no teto de 200", () => {
    const vm = buildFarmaciaViewModel(
      makeRaw({
        busca: "dip",
        limiteUnidades: 200,
        unidades: 1,
        totalUnidades: 500,
      }),
    );
    expect(vm.hasMaisUnidades).toBe(false);
  });

  it("q curto nao executa busca e mostra dica", () => {
    const vm = buildFarmaciaViewModel(makeRaw({ busca: "d" }));
    expect(vm.hasBusca).toBe(false);
    expect(vm.hasBuscaCurta).toBe(true);
    const vazio = buildFarmaciaViewModel(makeRaw({}));
    expect(vazio.hasBuscaCurta).toBe(false);
  });
});

describe("buildFarmaciaViewModel href e mapa", () => {
  it("monta href da unidade com q e unidade", () => {
    const vm = buildFarmaciaViewModel(makeRaw({ busca: "dip", unidades: 2 }));
    expect(vm.unidades.map((u) => u.href)).toEqual([
      "/portal_x/saude/farmacia?q=dip&unidade=u0",
      "/portal_x/saude/farmacia?q=dip&unidade=u1",
    ]);
  });

  it("mapMarkers inclui apenas unidades com coordenada valida", () => {
    const raw = makeRaw({ busca: "dip", unidades: 3 });
    raw.farmacia.unidades[0].latitudeUnidade = -20.9;
    raw.farmacia.unidades[0].longitudeUnidade = -42;
    raw.farmacia.unidades[1].latitudeUnidade = 95;
    raw.farmacia.unidades[1].longitudeUnidade = -42;
    const vm = buildFarmaciaViewModel(raw);
    expect(vm.mapMarkers).toEqual([
      { id: "u0", latitude: -20.9, longitude: -42 },
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
  it("inclui municipio, leis e citacao do Art. 6º-B", () => {
    const texto = buildRequerimentoFiscalizacao({
      portalName: "Prefeitura X",
      dataPosicaoMaisRecente: "2026-01-10",
      diasDesdePosicaoMaisRecente: 20,
    });
    expect(texto).toContain("Ouvidoria de Prefeitura X.");
    expect(texto).toContain("Art. 6º-B da Lei nº 8.080/1990");
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
