import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import {
  Badge,
  fmtCompact,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
  fmtLicitacaoSituacao,
  fmtPercent,
  KPICard,
  TruncatedCellWithModal,
} from "@transparencia/ui";
import { Calendar, Coins, ExternalLink, Package } from "lucide-react";
import Link from "next/link";
import { KPIGrid } from "@/components/kpi-grid";

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

export function SaudeContratacaoSection({
  portalSlug,
  ano,
  orcamento,
  licitacoesSaude,
  licitacoesEmAndamento = [],
}: SaudeContratacaoSectionProps) {
  const caronaValor = licitacoesSaude.adesaoCaronaValor;
  const caronaPct =
    orcamento.empenhado > 0 ? (caronaValor / orcamento.empenhado) * 100 : 0;

  const barColors: Record<string, string> = {
    "Pregão eletrônico": "bg-accent",
    "Adesão a ata (carona)": "bg-amber-700",
    "Dispensa de licitação": "bg-teal-600",
    Inexigibilidade: "bg-teal-400",
    "Tomada de preços / outros": "bg-teal-300",
  };

  return (
    <section className="space-y-6 border-[#1a1d21] border-t-2 pt-8">
      {/* Header com Link */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold font-serif text-2xl text-slate-900">
            Como o Fundo contrata
          </h2>
          <p className="mt-1 max-w-3xl text-slate-600 text-sm leading-relaxed">
            O que a prefeitura faz com o dinheiro que chega ao Fundo — quantos
            contratos assinou, com quantos fornecedores, e por qual caminho.
            Parte da saúde é comprada{" "}
            <strong className="font-bold text-slate-900">
              na carona de atas de outras prefeituras
            </strong>
            , sem licitação própria do município.
          </p>
        </div>
        <Link
          href={`/${portalSlug}/licitacoes`}
          className="inline-flex shrink-0 items-center font-semibold text-accent text-sm hover:underline"
        >
          Ver todas as licitações &rarr;
        </Link>
      </div>

      {/* Banner de Alerta Âmbar */}
      <div className="flex items-start gap-3 rounded-xl border-amber-600 border-l-4 bg-[#fffaf0] p-4 text-[#7b341e] text-xs shadow-2xs sm:text-sm">
        <div>
          {caronaValor > 0 ? (
            <>
              <strong className="font-bold">
                {fmtCompact(caronaValor)} — {fmtPercent(caronaPct)} do empenho
                do Fundo —
              </strong>{" "}
              foram contratados por adesão a atas (carona). Modalidade legal,
              mas que dispensa licitação própria: exige acompanhamento para
              garantir preço e entrega.
            </>
          ) : licitacoesSaude.empenhosAtaExternaCount > 0 ? (
            <>
              <strong className="font-bold">
                {licitacoesSaude.empenhosAtaExternaCount} empenhos via ata
                externa ({fmtCompact(licitacoesSaude.pagoAtaExternaValor)}{" "}
                pagos)
              </strong>{" "}
              foram registrados no exercício. Modalidades por adesão a ata
              dispensam licitação própria do município.
            </>
          ) : (
            <>
              O Fundo registrou seus contratos e compras no exercício sob as
              modalidades legais cabíveis.
            </>
          )}
        </div>
      </div>

      {/* 4 KPI Cards */}
      <KPIGrid columns={4}>
        <KPICard
          title="Contratos vinculados"
          value={orcamento.contratosVinculadosCount}
          subtext={`com ${orcamento.fornecedoresAtivosCount} fornecedores`}
        />
        <KPICard
          title="Adesões de ata (carona)"
          value={
            <span className="font-bold text-amber-700">
              {licitacoesSaude.adesaoCaronaCount}
            </span>
          }
          subtext={`${fmtCompact(caronaValor)} contratados`}
        />
        <KPICard
          title="Empenhos via ata externa"
          value={licitacoesSaude.empenhosAtaExternaCount}
          subtext="notas de empenho"
        />
        <KPICard
          title="Pago via ata externa"
          value={
            <span className="font-bold text-accent">
              {fmtCompact(licitacoesSaude.pagoAtaExternaValor)}
            </span>
          }
          subtext="já liquidado e pago"
        />
      </KPIGrid>

      {/* Card Visual de Distribuição de Modalidades */}
      <div className="rounded-xl border border-[#e7e9ee] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold font-serif text-lg text-slate-900">
            Por qual caminho o Fundo contratou
          </h3>
          <span className="text-slate-500 text-xs">
            % do valor empenhado · {fmtCompact(orcamento.empenhado)}
          </span>
        </div>

        <div className="space-y-4">
          {licitacoesSaude.modalidades.map(
            (mod: SaudeContratacaoModalidadeItem) => {
              const colorClass = barColors[mod.nome] || "bg-slate-400";
              return (
                <div key={mod.nome} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {mod.nome}
                    </span>
                    <span className="font-bold text-slate-900">
                      {fmtCompact(mod.valor)}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-md bg-[#f4f5f7]">
                    <div
                      className={`h-full rounded-md transition-all duration-500 ${colorClass}`}
                      style={{
                        width: `${Math.min(100, Math.max(0, mod.pct))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* Bloco Dedicado: Compras e Licitações da Saúde em Andamento */}
      <div className="space-y-4 rounded-xl border border-[#e7e9ee] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold font-serif text-lg text-slate-900">
                Compras e Licitações da Saúde em Andamento
              </h3>
              <Badge variant="accent">Em Aberto</Badge>
            </div>
            <p className="mt-0.5 text-slate-500 text-xs leading-relaxed">
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
            className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
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
                  className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
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
                          className="inline-block rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-semibold text-[10px] text-emerald-700"
                          title="Objeto des-truncado via PNCP"
                        >
                          PNCP
                        </span>
                      )}
                      {lic.fonteObjeto === "contrato_local" && (
                        <span
                          className="inline-block rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 font-semibold text-[10px] text-indigo-700"
                          title="Objeto des-truncado via contrato local"
                        >
                          Contrato Local
                        </span>
                      )}
                    </div>

                    {/* Linha 2: Processo e Órgão empilhados verticalmente */}
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        Processo {lic.licitacaoNumero || "S/N"}
                      </span>
                      {lic.entidadeNome && (
                        <p className="mt-0.5 truncate text-slate-500 text-xs">
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
                    <div className="flex items-center gap-1.5 text-slate-500 text-xs">
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
                    <div className="grid grid-cols-2 gap-2 border-slate-100 border-t pt-2.5 text-xs">
                      <div>
                        <span className="block text-[11px] text-slate-400">
                          Valor Estimado
                        </span>
                        <div className="mt-0.5 flex items-center gap-1 font-bold font-serif text-slate-900">
                          <Coins
                            className="h-3.5 w-3.5 text-slate-400"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {valorEst ? fmtCurrency(valorEst) : "Não divulgado"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[11px] text-slate-400">
                          Homologado
                        </span>
                        {valorHom ? (
                          <div className="mt-0.5 flex items-center justify-end gap-1">
                            <span className="font-bold font-serif text-emerald-700">
                              {fmtCurrency(valorHom)}
                            </span>
                            {economia !== null && (
                              <span className="inline-block rounded bg-emerald-50 px-1 py-0.5 font-semibold text-[10px] text-emerald-700">
                                -{Math.round(economia)}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="mt-0.5 flex justify-end">
                            <span
                              className="inline-block rounded bg-amber-50 px-1.5 py-0.5 font-medium text-[10px] text-amber-800"
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
                  <div className="mt-3 flex items-center justify-between border-slate-100 border-t pt-2.5 text-xs">
                    <Link
                      href={
                        lic.licitacaoNumero
                          ? `/${portalSlug}/licitacoes?numero=${encodeURIComponent(lic.licitacaoNumero)}#itens`
                          : `/${portalSlug}/licitacoes#licitacoes-em-andamento`
                      }
                      className="inline-flex items-center gap-1 font-medium text-slate-600 transition-colors hover:text-slate-900"
                    >
                      <Package
                        className="h-3.5 w-3.5 text-slate-400"
                        aria-hidden="true"
                      />
                      <span>Ver Itens Licitados</span>
                    </Link>

                    {lic.linkSistemaOrigem && (
                      <a
                        href={lic.linkSistemaOrigem}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 font-medium text-blue-700 transition-colors hover:bg-blue-100"
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
          <div className="rounded-lg border border-slate-200 border-dashed bg-slate-50/50 p-4 text-center text-slate-500 text-xs">
            Nenhuma licitação da Saúde em andamento ou aberta no momento para
            este exercício.
          </div>
        )}
      </div>
    </section>
  );
}
