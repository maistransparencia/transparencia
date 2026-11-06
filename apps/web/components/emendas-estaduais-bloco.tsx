"use client";

import type {
  ComparacaoReceitaEstadualDTO,
  EmendaEstadualDTO,
  EmendasEstaduaisDTO,
  FonteEmendaDTO,
} from "@transparencia/db";
import {
  DenseTable,
  fmtCompact,
  fmtCurrency,
  fmtDate,
  toTitleCase,
} from "@transparencia/ui";
import { useCallback, useState } from "react";

const FRASE_FIXA =
  "Esta lista é o que o Estado publica. O cadastro da Prefeitura é outro sistema e pode ter datas diferentes.";

const colunas = (total: number) => [
  {
    header: "Autor da Emenda",
    accessorKey: "autor" as const,
    className: "min-w-[11rem] whitespace-nowrap font-bold",
  },
  {
    header: "Objeto",
    accessorKey: "objeto" as const,
    className: "min-w-[14rem]",
  },
  {
    header: "Como chega",
    accessorKey: "modalidadeRotulo" as const,
    className: "font-medium text-ink whitespace-nowrap",
  },
  {
    header: "Valor indicado",
    footer: fmtCurrency(total),
    accessorKey: "valor" as const,
    align: "right" as const,
    format: "currency" as const,
    defaultSortDir: "desc" as const,
  },
];

function textoCadastro(emenda: EmendaEstadualDTO): string {
  if (
    !emenda.constaNoCadastroMunicipal ||
    emenda.valorCadastroMunicipal === null
  )
    return "Não encontramos esta emenda no cadastro da Prefeitura. Os dois sistemas são separados e podem ter datas diferentes. Isso não quer dizer que o dinheiro não chegou.";
  if (emenda.valor === null)
    return `Consta no cadastro da Prefeitura, com valor de ${fmtCurrency(emenda.valorCadastroMunicipal)}; o Estado não informou o valor.`;
  return emenda.valorCadastroMunicipal === emenda.valor
    ? `Consta no cadastro da Prefeitura, com o mesmo valor (${fmtCurrency(emenda.valorCadastroMunicipal)}).`
    : `Consta no cadastro da Prefeitura, com valor de ${fmtCurrency(emenda.valorCadastroMunicipal)}; o Estado indica ${fmtCurrency(emenda.valor)}. Os dois registros podem ter datas diferentes.`;
}

function textoExecucao(
  emenda: EmendaEstadualDTO,
  posicaoExecucao: string,
): string {
  const execucao = emenda.execucao;
  if (!execucao)
    return `O relatório do Estado de ${posicaoExecucao} não traz esta emenda. Vale conferir na página oficial.`;
  const valor = (v: number | null) =>
    v === null ? "sem valor" : fmtCurrency(v);
  return `Relatório do Estado com posição em ${execucao.posicao}: reservado (empenhado) ${valor(execucao.empenhado)}, entrega conferida (liquidado) ${valor(execucao.liquidado)}, pago ${valor(execucao.pago)}. Pagamentos feitos depois dessa data não aparecem aqui.`;
}

function Detalhes({
  emenda,
  posicaoExecucao,
  fonte,
}: {
  emenda: EmendaEstadualDTO;
  posicaoExecucao: string | null;
  fonte?: FonteEmendaDTO;
}) {
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <dt className="eyebrow">Como o dinheiro chega</dt>
          <dd className="mt-1 text-ink">{emenda.modalidadeExplicacao}</dd>
        </div>
        <div>
          <dt className="eyebrow">Quem recebe</dt>
          <dd className="mt-1 text-ink">
            {emenda.beneficiario
              ? toTitleCase(emenda.beneficiario)
              : "Não informado."}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Número da emenda no Estado</dt>
          <dd className="mt-1 text-ink">{emenda.numero}</dd>
        </div>
        {emenda.destino === "chega_prefeitura" && (
          <div>
            <dt className="eyebrow">Na Prefeitura</dt>
            <dd className="mt-1 text-ink">{textoCadastro(emenda)}</dd>
          </div>
        )}
        {fonte && (
          <div>
            <dt className="eyebrow">Fonte no Estado</dt>
            <dd className="mt-1 text-ink">
              <a href={fonte.url} target="_blank" rel="noopener noreferrer">
                {fonte.orgao}
              </a>
              {`, arquivo ${emenda.nomeArquivo}`}
              {emenda.dataArquivo ? ` de ${fmtDate(emenda.dataArquivo)}` : ""}
              {emenda.faseArquivo ? `, fase ${emenda.faseArquivo}` : ""}.
            </dd>
          </div>
        )}
        {posicaoExecucao && (
          <div>
            <dt className="eyebrow">Execução pelo Estado</dt>
            <dd className="mt-1 text-ink">
              {textoExecucao(emenda, posicaoExecucao)}
            </dd>
          </div>
        )}
      </dl>
      {emenda.constaNoArquivoMaisRecente ? null : (
        <p className="caption">
          Esta emenda não consta no arquivo mais recente do Estado
          {emenda.dataArquivoMaisRecenteFase
            ? ` (${fmtDate(emenda.dataArquivoMaisRecenteFase)})`
            : ""}
          . Pode ter sido retirada ou alterada: vale conferir na página oficial.
        </p>
      )}
    </div>
  );
}

const FRASE_SISTEMAS_DIFERENTES =
  "Os registros vêm de sistemas diferentes e podem ter datas de corte diferentes.";

function textoComparacaoReceita(
  comparacao: ComparacaoReceitaEstadualDTO,
): string {
  const posicao = comparacao.posicaoExecucao;
  const arrecadado = comparacao.arrecadadoOutrasTransferencias;
  const base = `Considera só as transferências especiais do Estado à Prefeitura, de todas as áreas. O relatório do Estado não separa restos a pagar. ${FRASE_SISTEMAS_DIFERENTES}`;
  if (comparacao.situacao === "pago_acima_do_registrado") {
    return `O Estado informa ter pago ${fmtCurrency(comparacao.pagoEstado ?? 0)} nessas emendas até ${posicao}. A Prefeitura registrou ${fmtCurrency(arrecadado ?? 0)} em "outras transferências dos Estados" em ${comparacao.ano}. A diferença de ${fmtCurrency(comparacao.valorAindaNaoApareceNaReceita ?? 0)} ainda não aparece na receita da Prefeitura (valor calculado pelo portal, não informado por nenhum dos dois). ${base}`;
  }
  if (comparacao.situacao === "dentro_do_registrado") {
    return `O Estado informa ter pago ${fmtCurrency(comparacao.pagoEstado ?? 0)} nessas emendas até ${posicao}, e a Prefeitura registrou ${fmtCurrency(arrecadado ?? 0)} em "outras transferências dos Estados" em ${comparacao.ano}. Essa linha de receita reúne outras transferências além de emendas, então não prova que a emenda chegou. ${base}`;
  }
  if (comparacao.situacao === "exercicios_diferentes") {
    return `Não foi possível comparar: o relatório do Estado (${posicao}) não é do mesmo ano da receita da Prefeitura (${comparacao.ano}). ${FRASE_SISTEMAS_DIFERENTES}`;
  }
  return `Não foi possível comparar o que o Estado pagou com a receita da Prefeitura: falta informação em um dos lados. ${FRASE_SISTEMAS_DIFERENTES}`;
}

function resumirDestinos(dados: EmendasEstaduaisDTO): string {
  const partes = [
    `${fmtCompact(dados.totalChegaPrefeitura)} são destinados à Prefeitura`,
    dados.totalEstadoExecuta > 0
      ? `${fmtCompact(dados.totalEstadoExecuta)} o próprio Estado gasta direto, em obras e compras, sem passar pela Prefeitura`
      : null,
    dados.totalOrganizacao > 0
      ? `${fmtCompact(dados.totalOrganizacao)} vão a organizações da sociedade civil`
      : null,
    dados.totalNaoIdentificado > 0
      ? `${fmtCompact(dados.totalNaoIdentificado)} têm destino não identificado`
      : null,
  ].filter((parte): parte is string => parte !== null);
  return `Dos ${fmtCompact(dados.totalIndicado)} indicados pelo Estado: ${partes.join("; ")}.`;
}

/** Subseção "Emendas do Estado" dentro de "Emendas na saúde/educação": a lista oficial do Estado para o município. */
export function EmendasEstaduaisBloco({
  dados,
  comparacaoReceita,
}: {
  dados: EmendasEstaduaisDTO;
  comparacaoReceita?: ComparacaoReceitaEstadualDTO;
}) {
  const [totalVisivel, setTotalVisivel] = useState<number | null>(null);
  const aoFiltrar = useCallback((rows: { valor: number | null }[]) => {
    setTotalVisivel(rows.reduce((soma, row) => soma + (row.valor ?? 0), 0));
  }, []);
  const total =
    totalVisivel ?? dados.emendas.reduce((soma, e) => soma + (e.valor ?? 0), 0);
  if (dados.situacao === "sem_emendas") return null;
  if (dados.situacao === "indisponivel") {
    return (
      <p className="caption" data-testid="emendas-estaduais">
        Não conseguimos carregar as emendas do Estado agora. Tente novamente
        mais tarde.
      </p>
    );
  }
  if (dados.situacao === "sem_fonte") {
    return (
      <p className="caption" data-testid="emendas-estaduais">
        Ainda não temos uma fonte oficial do Estado para conferir as emendas
        estaduais.
      </p>
    );
  }
  const tabela = dados.emendas.map((emenda) => ({
    ...emenda,
    autor: toTitleCase(emenda.autor),
    objeto: toTitleCase(emenda.objeto),
  }));

  return (
    <div className="space-y-4" data-testid="emendas-estaduais">
      <div className="space-y-1">
        <h3>Quais emendas o Estado indicou para este município?</h3>
        <p className="text-mute text-sm">
          O Estado publica as emendas que deputados estaduais indicam para o
          município. Em algumas, o dinheiro vai para a Prefeitura; em outras, o
          próprio Estado faz a obra ou a compra. A lista mostra o valor
          indicado, não o que já foi pago.
        </p>
      </div>
      {dados.situacao === "com_emendas" && (
        <>
          <p className="caption">{resumirDestinos(dados)}</p>
          <DenseTable
            sortable
            data={tabela}
            columns={colunas(total)}
            onFilteredDataChange={aoFiltrar}
            searchableKeys={["autor", "objeto", "modalidadeRotulo"]}
            rowKey="id"
            renderExpandedRow={(row) => (
              <Detalhes
                emenda={row}
                posicaoExecucao={dados.posicaoExecucao}
                fonte={dados.fontes.find(
                  (fonte) =>
                    fonte.esfera === "estadual" &&
                    fonte.nome === row.nomeArquivo,
                )}
              />
            )}
            hideCsvOnMobile
            recordLabel="emendas"
            footerLabel="Total indicado"
          />
          <p className="caption">
            {FRASE_FIXA}
            {dados.posicaoExecucao
              ? ` O relatório de execução mais recente do Estado é de ${dados.posicaoExecucao}.`
              : ""}
          </p>
          {comparacaoReceita && dados.totalChegaPrefeitura > 0 && (
            <div className="space-y-1" data-testid="emendas-estaduais-receita">
              <h4>
                O dinheiro que o Estado diz ter pago já aparece na receita da
                Prefeitura?
              </h4>
              <p className="caption">
                {textoComparacaoReceita(comparacaoReceita)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
