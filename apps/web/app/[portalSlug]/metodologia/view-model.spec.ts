import type { FrescorFonteDTO, LacunaConhecidaDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { buildMetodologiaViewModel } from "./view-model";

const fonte = (parcial: Partial<FrescorFonteDTO>): FrescorFonteDTO => ({
  fonte: "portal_municipal",
  descricaoDados: "sistema contábil",
  nomeFonte: "Fonte Exemplo",
  urlFonte: "https://fonte.exemplo.gov.br",
  esferaFonte: "nacional",
  frequenciaEsperada: "diaria",
  ultimaColetaEm: "2026-11-12T08:00:00.000Z",
  situacao: "coleta_em_dia",
  ...parcial,
});

const lacuna = (parcial: Partial<LacunaConhecidaDTO>): LacunaConhecidaDTO => ({
  codigo: "lacuna_x",
  fonte: "todas_as_fontes",
  tipo: "lacuna",
  textoCidadao: "texto",
  ...parcial,
});

const montar = (
  frescorFontes: FrescorFonteDTO[],
  lacunas: LacunaConhecidaDTO[] = [],
) =>
  buildMetodologiaViewModel({
    portalSlug: "portal_x",
    frescorFontes,
    portalUrl: null,
    portalNome: null,
    fonteEmendasEstaduais: null,
    lacunas,
  });

describe("buildMetodologiaViewModel", () => {
  it("separa lacunas de divergências", () => {
    const vm = montar(
      [],
      [lacuna({ codigo: "a" }), lacuna({ codigo: "b", tipo: "divergencia" })],
    );
    expect(vm.lacunas.map((item) => item.codigo)).toEqual(["a"]);
    expect(vm.divergencias.map((item) => item.codigo)).toEqual(["b"]);
  });

  it("fonte sem acompanhamento vem do estado calculado e não vira atraso", () => {
    const vm = montar([
      fonte({ fonte: "a" }),
      fonte({ fonte: "b", situacao: "nao_monitorado", ultimaColetaEm: null }),
    ]);
    expect(vm.cobertura).toContain("uma fonte ainda sem acompanhamento");
    expect(vm.cobertura).not.toMatch(/atras/i);
  });

  it("fonte atrasada não altera o texto de cobertura", () => {
    const vm = montar([fonte({ situacao: "coleta_atrasada" })]);
    expect(vm.cobertura).not.toMatch(/atras|sem acompanhamento/i);
  });

  it("some o aviso quando todas as fontes têm registro", () => {
    expect(montar([fonte({})]).cobertura).not.toMatch(/ainda sem/);
  });
});
