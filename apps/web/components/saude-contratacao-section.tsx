import type { LicitacaoEmAndamentoDTO } from "@transparencia/db";
import {
  Badge,
  fmtCompact,
  fmtCurrency,
  fmtDate,
  fmtLicitacaoModalidade,
  fmtPercent,
  KPICard,
} from "@transparencia/ui";
import { Calendar, Coins } from "lucide-react";
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {licitacoesEmAndamento.slice(0, 6).map((lic) => {
              const valorTxt = (() => {
                const val = lic.valorEstimado ?? lic.valor;
                if (typeof val === "number" && val > 0) {
                  return fmtCurrency(val);
                }
                return "Valor não divulgado";
              })();

              return (
                <div
                  key={lic.licitacaoId}
                  className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/60 p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold font-mono text-slate-900">
                      Processo {lic.licitacaoNumero || "S/N"}
                    </span>
                    <Badge variant="accent">
                      {fmtLicitacaoModalidade(lic.modalidade)}
                    </Badge>
                  </div>
                  <p
                    className="line-clamp-2 font-medium text-slate-700"
                    title={lic.objeto}
                  >
                    {lic.objeto}
                  </p>
                  <div className="flex items-center justify-between border-slate-200/60 border-t pt-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      <span>
                        {lic.dataAbertura
                          ? fmtDate(lic.dataAbertura)
                          : "Abertura não informada"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 font-bold font-serif text-slate-900">
                      <Coins
                        className="h-3 w-3 text-slate-400"
                        aria-hidden="true"
                      />
                      <span>{valorTxt}</span>
                    </div>
                  </div>
                </div>
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
