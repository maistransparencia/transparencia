import type { FrescorFonteDTO } from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { buildComoAtualizamosViewModel } from "./view-model";

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

const montar = (frescorFontes: FrescorFonteDTO[]) =>
  buildComoAtualizamosViewModel({
    portalSlug: "portal_x",
    frescorFontes,
    portalUrl: "https://prefeitura.exemplo.gov.br",
    portalNome: "Prefeitura Exemplo",
    fonteEmendasEstaduais: {
      nome: "Secretaria Estadual",
      url: "https://estado.exemplo.gov.br/emendas",
    },
  });

describe("buildComoAtualizamosViewModel", () => {
  it("todas em dia: sem aviso no topo", () => {
    const vm = montar([fonte({})]);
    expect(vm.avisoTopo).toBeNull();
    expect(vm.semFonteMonitorada).toBe(false);
    expect(vm.fontes[0]?.situacaoTexto).toBe(
      "Dados buscados dentro do prazo previsto",
    );
  });

  it("alguma atrasada: aviso no topo", () => {
    const vm = montar([fonte({ situacao: "coleta_atrasada" })]);
    expect(vm.avisoTopo).toContain("uma fonte");
  });

  it("todas não monitoradas: estado neutro", () => {
    const vm = montar([
      fonte({ situacao: "nao_monitorado", ultimaColetaEm: null }),
    ]);
    expect(vm.semFonteMonitorada).toBe(true);
    expect(vm.fontes[0]?.dataVerificacao).toBeNull();
  });

  it("fonte acompanhada sem coleta registrada: lista com aviso próprio", () => {
    const vm = montar([
      fonte({ situacao: "coleta_sem_registro", ultimaColetaEm: null }),
    ]);
    expect(vm.semFonteMonitorada).toBe(false);
    expect(vm.avisoTopo).toBeNull();
    expect(vm.fontes[0]?.situacaoTexto).toBe(
      "Ainda não temos registro de quando buscamos os dados desta fonte.",
    );
  });

  it("resolve a fonte oficial pela esfera: nacional do catálogo, municipal e estadual do portal", () => {
    const vm = montar([
      fonte({
        fonte: "pncp",
        nomeFonte: "PNCP",
        urlFonte: "https://pncp.gov.br",
      }),
      fonte({
        fonte: "portal_municipal",
        nomeFonte: null,
        urlFonte: null,
        esferaFonte: "municipal",
      }),
      fonte({
        fonte: "emendas_estaduais",
        nomeFonte: null,
        urlFonte: null,
        esferaFonte: "estadual",
        situacao: "nao_monitorado",
      }),
      fonte({
        fonte: "inep_censo",
        nomeFonte: "Censo Escolar (INEP)",
        urlFonte: "https://inep.exemplo.gov.br/censo-escolar",
        situacao: "nao_monitorado",
      }),
    ]);
    expect(vm.fontes.map((linha) => linha.fonteOficial)).toEqual([
      { nome: "PNCP", url: "https://pncp.gov.br" },
      {
        nome: "Prefeitura Exemplo",
        url: "https://prefeitura.exemplo.gov.br",
      },
      {
        nome: "Secretaria Estadual",
        url: "https://estado.exemplo.gov.br/emendas",
      },
      {
        nome: "Censo Escolar (INEP)",
        url: "https://inep.exemplo.gov.br/censo-escolar",
      },
    ]);
  });

  it("lista vazia: estado neutro", () => {
    expect(montar([]).semFonteMonitorada).toBe(true);
  });
});
