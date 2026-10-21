import { describe, expect, it, vi } from "vitest";

vi.mock("@transparencia/db", () => ({
  getFarmaciaSus: vi.fn(),
  getPortalConfig: vi.fn(),
}));

const { buildFarmaciaViewModel } = await import("./view-model");

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
