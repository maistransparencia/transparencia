import { fireEvent, render, screen } from "@testing-library/react";
import type {
  ComparacaoReceitaEstadualDTO,
  EmendasEstaduaisDTO,
} from "@transparencia/db";
import { describe, expect, it } from "vitest";
import { EmendasSection } from "./emendas-section";

const emendasVazias = {
  totalAutorizado: 0,
  totalEmpenhado: 0,
  taxaEmpenho: 0,
  maiorEmenda: 0,
  lista: [],
};

const base: EmendasEstaduaisDTO = {
  ano: 2026,
  situacao: "com_emendas",
  fontes: [
    {
      esfera: "estadual",
      orgao: "Secretaria de Planejamento",
      nome: "detalhamento_abril.csv",
      dataArquivo: "2026-04-09",
      posicaoRelatorio: null,
      url: "https://oficial.test/emendas",
      uso: "emendas do Estado",
    },
    {
      esfera: "estadual",
      orgao: "Secretaria de Planejamento",
      nome: "detalhamento_agosto.csv",
      dataArquivo: "2026-08-18",
      posicaoRelatorio: null,
      url: "https://oficial.test/emendas",
      uso: "emendas do Estado",
    },
  ],
  emendas: [
    {
      id: "a",
      numero: "650",
      autor: "AUTOR UM",
      objeto: "SALA SENSORIAL",
      beneficiario: "PREFEITURA",
      valor: 100000,
      area: "educacao",
      modalidade: "transferencia_especial",
      modalidadeRotulo: "Transferência especial",
      modalidadeExplicacao: "O Estado envia o dinheiro direto à Prefeitura.",
      destino: "chega_prefeitura",
      nomeArquivo: "detalhamento_abril.csv",
      dataArquivo: "2026-04-09",
      faseArquivo: "1",
      constaNoArquivoMaisRecente: false,
      dataArquivoMaisRecenteFase: "2026-04-15",
      constaNoCadastroMunicipal: false,
      valorCadastroMunicipal: null,
      execucao: null,
    },
  ],
  totalChegaPrefeitura: 100000,
  totalEstadoExecuta: 0,
  totalOrganizacao: 0,
  totalNaoIdentificado: 0,
  totalIndicado: 100000,
  posicaoExecucao: null,
};

function renderizar(
  dados: EmendasEstaduaisDTO,
  comparacaoReceitaEstadual?: ComparacaoReceitaEstadualDTO,
) {
  return render(
    <EmendasSection
      ano={2026}
      emendasStats={emendasVazias}
      emendasEstaduais={dados}
      comparacaoReceitaEstadual={comparacaoReceitaEstadual}
      fontes={dados.fontes}
    />,
  );
}

describe("Emendas do Estado dentro de EmendasSection", () => {
  it("agrupa os arquivos do mesmo órgão e traz o link da página oficial", () => {
    renderizar(base);
    const fontes = screen.getByTestId("fontes-emendas");
    expect(fontes.textContent).toMatch(/Secretaria de Planejamento/);
    expect(fontes.textContent).toMatch(/detalhamento_abril\.csv/);
    expect(fontes.textContent).toMatch(/detalhamento_agosto\.csv/);
    expect(fontes.querySelectorAll("a")).toHaveLength(1);
    expect(fontes.querySelector("a")?.getAttribute("href")).toBe(
      "https://oficial.test/emendas",
    );
  });

  it("não repete a explicação da modalidade na linha e avisa quando a emenda saiu do arquivo mais recente", () => {
    const { container } = renderizar(base);
    const bloco = screen.getByTestId("emendas-estaduais");
    expect(bloco.textContent).not.toMatch(/envia o dinheiro direto/);
    const gatilho = container.querySelector<HTMLElement>(
      "[data-testid='emendas-estaduais'] [aria-expanded]",
    );
    expect(gatilho).not.toBeNull();
    fireEvent.click(gatilho as HTMLElement);
    expect(bloco.textContent).toMatch(/envia o dinheiro direto/);
    expect(bloco.textContent).toMatch(
      /não consta no arquivo mais recente do Estado \(15\/04\/2026\)/,
    );
  });

  it("mostra o total no rodapé da tabela e não mostra o arquivo no detalhe", () => {
    const { container } = renderizar(base);
    const bloco = screen.getByTestId("emendas-estaduais");
    expect(bloco.querySelector("tfoot")?.textContent).toMatch(/100\.000,00/);
    const gatilho = container.querySelector<HTMLElement>(
      "[data-testid='emendas-estaduais'] [aria-expanded]",
    );
    expect(gatilho).not.toBeNull();
    fireEvent.click(gatilho as HTMLElement);
    expect(bloco.textContent).not.toMatch(/Arquivo do Estado/);
  });

  it("o resumo diz quanto chega à Prefeitura sem dizer que os valores não se somam", () => {
    renderizar({ ...base, totalEstadoExecuta: 50000, totalIndicado: 150000 });
    const texto = screen.getByTestId("emendas-estaduais").textContent ?? "";
    expect(texto).toMatch(
      /indicados pelo Estado: .*são destinados à Prefeitura/,
    );
    expect(texto).toMatch(/o próprio Estado gasta direto/);
    expect(texto).not.toMatch(/não se somam/);
  });

  it("sem emendas no ano, a subseção inteira (título incluído) some", () => {
    renderizar({ ...base, situacao: "sem_emendas", ano: 2025, emendas: [] });
    expect(screen.queryByTestId("emendas-estaduais")).toBeNull();
    expect(screen.queryByText(/Quais emendas o Estado/)).toBeNull();
  });

  it("sem fonte configurada mostra o estado neutro, sem o título", () => {
    renderizar({ ...base, situacao: "sem_fonte", fontes: [], emendas: [] });
    expect(
      screen.getByText(/Ainda não temos uma fonte oficial do Estado/),
    ).toBeTruthy();
    expect(screen.queryByText(/Quais emendas o Estado/)).toBeNull();
  });

  it("falha na consulta mostra aviso de indisponível, não 'sem fonte'", () => {
    renderizar({ ...base, situacao: "indisponivel", fontes: [], emendas: [] });
    const texto = screen.getByTestId("emendas-estaduais").textContent ?? "";
    expect(texto).toMatch(/Não conseguimos carregar as emendas do Estado/);
    expect(texto).not.toMatch(/Ainda não temos uma fonte oficial/);
  });

  function abrirDetalhe(dados: EmendasEstaduaisDTO) {
    const { container } = renderizar(dados);
    const gatilho = container.querySelector<HTMLElement>(
      "[data-testid='emendas-estaduais'] [aria-expanded]",
    );
    expect(gatilho).not.toBeNull();
    fireEvent.click(gatilho as HTMLElement);
    return screen.getByTestId("emendas-estaduais").textContent ?? "";
  }

  it("sem relatório de execução não mostra a execução e diz que a emenda não está no cadastro", () => {
    const texto = abrirDetalhe(base);
    expect(texto).not.toMatch(/Execução pelo Estado/);
    expect(texto).toMatch(
      /Não encontramos esta emenda no cadastro da Prefeitura/,
    );
    expect(texto).not.toMatch(/omiss|irregular|não pagou/i);
  });

  it("mostra a execução com a posição e nunca afirma que o Estado não pagou", () => {
    const [emenda] = base.emendas;
    const texto = abrirDetalhe({
      ...base,
      posicaoExecucao: "08/2026",
      emendas: [
        {
          ...emenda,
          constaNoCadastroMunicipal: true,
          valorCadastroMunicipal: 100000,
          execucao: {
            posicao: "08/2026",
            dotacaoInicial: 100000,
            empenhado: 0,
            liquidado: 0,
            pago: 0,
          },
        },
      ],
    });
    expect(texto).toMatch(/posição em 08\/2026: reservado/);
    expect(texto).toMatch(
      /relatório de execução mais recente do Estado é de 08\/2026/,
    );
    expect(texto).toMatch(
      /Consta no cadastro da Prefeitura, com o mesmo valor/,
    );
    expect(texto).not.toMatch(/não pagou|não foi pago|omiss|irregular/i);
  });

  it("emenda fora do relatório e valores diferentes são ditos sem acusação", () => {
    const [emenda] = base.emendas;
    const texto = abrirDetalhe({
      ...base,
      posicaoExecucao: "08/2026",
      emendas: [
        {
          ...emenda,
          constaNoCadastroMunicipal: true,
          valorCadastroMunicipal: 90000,
        },
      ],
    });
    expect(texto).toMatch(
      /relatório do Estado de 08\/2026 não traz esta emenda/,
    );
    expect(texto).toMatch(
      /com valor de .*90\.000,00.*o Estado indica .*100\.000,00/,
    );
  });

  it("diz que a diferença ainda não aparece na receita, sem palavra acusatória", () => {
    renderizar(base, {
      ano: 2026,
      situacao: "pago_acima_do_registrado",
      posicaoExecucao: "08/2026",
      emendasConsideradas: 2,
      emendasSemPagoInformado: 0,
      pagoEstado: 25000,
      arrecadadoOutrasTransferenciasCorrente: 10000,
      arrecadadoOutrasTransferenciasCapital: 5000,
      arrecadadoOutrasTransferencias: 15000,
      valorAindaNaoApareceNaReceita: 10000,
    });
    const texto =
      screen.getByTestId("emendas-estaduais-receita").textContent ?? "";
    expect(texto).toMatch(/ainda não aparece na receita da Prefeitura/);
    expect(texto).toMatch(/calculado pelo portal/);
    expect(texto).toMatch(/sistemas diferentes/);
    expect(texto).not.toMatch(/omiss|irregular|desvio/i);
  });

  it("sem comparação, o bloco não aparece", () => {
    renderizar(base);
    expect(screen.queryByTestId("emendas-estaduais-receita")).toBeNull();
  });
});
