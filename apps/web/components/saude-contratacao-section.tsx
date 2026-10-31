import type {
  CaminhoContratacaoSaudeDTO,
  LicitacaoEmAndamentoDTO,
} from "@transparencia/db";
import {
  Badge,
  fmtCompact,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
  fmtLicitacaoSituacao,
  fmtPercent,
  SectionHeader,
  TruncatedCellWithModal,
} from "@transparencia/ui";
import { Calendar, Coins, ExternalLink, Package } from "lucide-react";
import Link from "next/link";

export interface SaudeContratacaoModalidadeItem {
  nome: string;
  valor: number;
  pct: number;
}

export interface SaudeContratacaoLicitacoesProps {
  adesaoCaronaCount: number;
  adesaoCaronaValor: number;
  empenhosAtaExternaCount: number;
  pagoAtaExternaValor: number;
  modalidades: SaudeContratacaoModalidadeItem[];
  caminhos: CaminhoContratacaoSaudeDTO[];
}

export interface SaudeContratacaoOrcamentoProps {
  empenhado: number;
  contratosVinculadosCount: number;
  fornecedoresAtivosCount: number;
}

export interface SaudeContratacaoSectionProps {
  portalSlug: string;
  ano?: number;
  orcamento: SaudeContratacaoOrcamentoProps;
  licitacoesSaude: SaudeContratacaoLicitacoesProps;
  licitacoesEmAndamento?: LicitacaoEmAndamentoDTO[];
}

const CAMINHOS_CONTRATACAO = [
  {
    tipoContratacao: "licitacao_propria",
    nome: "Licitação própria",
    unidade: "licitações",
    semEmpenho:
      "O portal não liga essas licitações às notas de empenho, por isso não há valor empenhado para mostrar.",
  },
  {
    tipoContratacao: "adesao_ata_interna",
    nome: "Adesão a ata (carona)",
    unidade: "contratos",
    nota: "Contratos cadastrados como adesão a uma ata de registro de preços.",
  },
  {
    tipoContratacao: "adesao_ata_externa",
    nome: "Empenhos que citam ata de registro de preços",
    unidade: "empenhos",
    nota: "Identificados pelo texto da descrição do empenho.",
  },
  {
    tipoContratacao: "gap_licitacao",
    nome: "Contratos sem licitação identificada",
    unidade: "contratos",
    nota: "O cadastro não mostra a licitação desses contratos; vale consultar o processo.",
  },
] as const;

const percentualEntre0e100 = (valor: number, total: number) =>
  total > 0 ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;

export function SaudeContratacaoSection({
  portalSlug,
  ano,
  orcamento,
  licitacoesSaude,
  licitacoesEmAndamento = [],
}: SaudeContratacaoSectionProps) {
  const caminhos = CAMINHOS_CONTRATACAO.map((definicao) => {
    const encontrado = licitacoesSaude.caminhos.find(
      (caminho) => caminho.tipoContratacao === definicao.tipoContratacao,
    );
    return {
      ...definicao,
      quantidade: encontrado?.quantidade ?? 0,
      valorEmpenhado: encontrado?.valorEmpenhado ?? 0,
    };
  });

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Como o Fundo contrata"
        description="Por qual caminho o Fundo comprou: licitou, aderiu a uma ata de registro de preços ou contratou sem licitação identificada. Os caminhos podem se sobrepor e não se somam."
        action={
          <Link
            href={`/${portalSlug}/licitacoes`}
            className="font-semibold text-brand-text hover:underline"
          >
            Ver todas as licitações &rarr;
          </Link>
        }
      />

      <ul className="space-y-6">
        {caminhos.map((caminho) => {
          const temEmpenho = caminho.valorEmpenhado > 0;
          return (
            <li key={caminho.tipoContratacao} className="space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold text-ink">{caminho.nome}</span>
                <span className="caption shrink-0">
                  {caminho.quantidade} {caminho.unidade}
                </span>
              </div>
              {temEmpenho ? (
                <>
                  <div className="h-3 w-full bg-track">
                    <div
                      className="h-full bg-brand-fill"
                      style={{
                        width: `${percentualEntre0e100(caminho.valorEmpenhado, orcamento.empenhado)}%`,
                      }}
                    />
                  </div>
                  <p className="caption">
                    <strong className="text-ink">
                      {fmtCompact(caminho.valorEmpenhado)}
                    </strong>{" "}
                    empenhados (
                    {fmtPercent(
                      percentualEntre0e100(
                        caminho.valorEmpenhado,
                        orcamento.empenhado,
                      ),
                    )}{" "}
                    do total reservado pelo Fundo).{" "}
                    {"nota" in caminho ? caminho.nota : ""}
                  </p>
                </>
              ) : (
                <p className="caption">
                  {"semEmpenho" in caminho
                    ? caminho.semEmpenho
                    : "Nenhum valor empenhado ligado a este caminho."}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Bloco Dedicado: Compras e Licitações da Saúde em Andamento */}
      <div className="space-y-4 border-line border-t pt-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3>Compras e Licitações da Saúde em Andamento</h3>
              <Badge variant="accent">Em Aberto</Badge>
            </div>
            <p className="mt-0.5 text-mute text-xs leading-relaxed">
              Processos licitatórios abertos da pasta de saúde (medicamentos,
              insumos hospitalares e equipamentos).
            </p>
          </div>
          <Link
            href={
              ano
                ? `/${portalSlug}/licitacoes?ano=${ano}#licitacoes-em-andamento`
                : `/${portalSlug}/licitacoes#licitacoes-em-andamento`
            }
            className="inline-flex items-center gap-1 font-semibold text-brand-text text-xs hover:underline"
          >
            Ver radar geral &rarr;
          </Link>
        </div>

        {Array.isArray(licitacoesEmAndamento) &&
        licitacoesEmAndamento.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {licitacoesEmAndamento.slice(0, 6).map((lic) => {
              const valorEst = lic.valorEstimado ?? lic.valor;
              const valorHom = lic.valorHomologado;
              const economia = (() => {
                if (valorEst && valorHom && valorHom < valorEst) {
                  return ((valorEst - valorHom) / valorEst) * 100;
                }
                return null;
              })();

              return (
                <article
                  key={lic.licitacaoId}
                  className="panel flex flex-col justify-between border-0! border-t-[3px]! px-0! py-4! sm:px-4!"
                >
                  <div className="space-y-3">
                    {/* Linha 1: Badges horizontais com wrap */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="accent">
                        {fmtLicitacaoModalidade(lic.modalidade)}
                      </Badge>
                      <Badge variant="warning">
                        {fmtLicitacaoSituacao(lic.situacao)}
                      </Badge>
                      {lic.fonteObjeto === "pncp" && (
                        <span
                          className="inline-block rounded border border-ok-fill bg-ok-fill/15 px-2 py-0.5 font-semibold text-ok-text text-xs"
                          title="Objeto des-truncado via PNCP"
                        >
                          PNCP
                        </span>
                      )}
                      {lic.fonteObjeto === "contrato_local" && (
                        <span
                          className="inline-block rounded border border-brand-fill bg-brand-fill/15 px-2 py-0.5 font-semibold text-brand-text text-xs"
                          title="Objeto des-truncado via contrato local"
                        >
                          Contrato Local
                        </span>
                      )}
                    </div>

                    {/* Linha 2: Processo e Órgão empilhados verticalmente */}
                    <div>
                      <span className="font-bold text-ink text-sm">
                        Processo {lic.licitacaoNumero || "S/N"}
                      </span>
                      {lic.entidadeNome && (
                        <p className="mt-0.5 truncate text-mute text-xs">
                          {lic.entidadeNome}
                        </p>
                      )}
                    </div>

                    {/* Linha 3: Objeto com modal */}
                    <div>
                      <TruncatedCellWithModal
                        text={lic.objeto}
                        modalTitle={`Processo ${lic.licitacaoNumero || "S/N"} — Objeto da Licitação (Saúde)`}
                        characterThreshold={120}
                        maxLines={3}
                        badge={(() => {
                          if (lic.fonteObjeto === "pncp") return "PNCP";
                          if (lic.fonteObjeto === "contrato_local")
                            return "Contrato Local";
                          return undefined;
                        })()}
                        secondaryText={
                          lic.discriminacao && lic.discriminacao !== lic.objeto
                            ? lic.discriminacao
                            : undefined
                        }
                        externalUrl={lic.linkSistemaOrigem}
                        externalLabel="Sala de Disputa"
                      />
                    </div>

                    {/* Linha 4: Data de abertura */}
                    <div className="flex items-center gap-1.5 text-mute text-xs">
                      <Calendar
                        className="h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      <span>
                        Abertura:{" "}
                        {lic.dataAbertura
                          ? fmtDate(lic.dataAbertura)
                          : "Não informada"}
                      </span>
                    </div>

                    {/* Linha 5: Grade financeira 2 colunas */}
                    <div className="grid grid-cols-2 gap-2 border-line border-t pt-2.5 text-xs">
                      <div>
                        <span className="block text-mute2 text-xs">
                          Valor Estimado
                        </span>
                        <div className="mt-0.5 flex items-center gap-1 font-bold font-serif text-ink">
                          <Coins
                            className="h-3.5 w-3.5 text-mute2"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {valorEst ? fmtCurrency(valorEst) : "Não divulgado"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-mute2 text-xs">
                          Homologado
                        </span>
                        {valorHom ? (
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            <span className="font-bold font-serif text-ok-text">
                              {fmtCurrency(valorHom)}
                            </span>
                            {economia !== null && (
                              <span className="inline-block rounded bg-ok-fill/15 px-1 py-0.5 font-semibold text-ok-text text-xs">
                                -{Math.round(economia)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-0.5 flex justify-end">
                            <span
                              className="inline-block rounded bg-warn-fill/15 px-1.5 py-0.5 font-medium text-warn-text text-xs"
                              title="Em disputa pública ou aguardando adjudicação/homologação"
                            >
                              Em disputa
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linha 6: Ações no rodapé */}
                  <div className="mt-3 flex items-center justify-between border-line border-t pt-2.5 text-xs">
                    <Link
                      href={
                        lic.licitacaoNumero
                          ? `/${portalSlug}/licitacoes?numero=${encodeURIComponent(lic.licitacaoNumero)}#itens`
                          : `/${portalSlug}/licitacoes#licitacoes-em-andamento`
                      }
                      className="inline-flex items-center gap-1 font-medium text-mute transition-colors hover:text-ink"
                    >
                      <Package
                        className="h-3.5 w-3.5 text-mute2"
                        aria-hidden="true"
                      />
                      <span>Ver Itens Licitados</span>
                    </Link>

                    {lic.linkSistemaOrigem && (
                      <a
                        href={lic.linkSistemaOrigem}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-brand-fill/15 px-2.5 py-1 font-medium text-brand-text transition-colors hover:bg-brand-fill/25"
                        title="Acessar sala de disputa pública externa"
                      >
                        <span>Sala de Disputa</span>
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="border-line border-y bg-line2 p-4 text-center text-mute text-xs">
            Nenhuma licitação da Saúde em andamento ou aberta no momento para
            este exercício.
          </div>
        )}
      </div>
    </section>
  );
}
