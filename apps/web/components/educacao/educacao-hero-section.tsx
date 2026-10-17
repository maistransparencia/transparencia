import { fmtCurrency, KPICard } from "@transparencia/ui";
import type { TrofeuCivicoKPIs } from "@/app/[portalSlug]/educacao/view-model";
import { KPIGrid } from "@/components/kpi-grid";

export interface EducacaoHeroSectionProps {
  selectedYear: number;
  trofeuCivico: TrofeuCivicoKPIs;
}

export function EducacaoHeroSection({
  selectedYear,
  trofeuCivico,
}: EducacaoHeroSectionProps) {
  const notaAtualFmt = (() => {
    if (trofeuCivico.notaAtual === null) return "—";
    return trofeuCivico.notaAtual.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  })();

  const notaAnteriorFmt = (() => {
    if (trofeuCivico.notaAnterior === null) return "—";
    return trofeuCivico.notaAnterior.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  })();

  const crescimentoConfig = (() => {
    if (trofeuCivico.crescimentoPontos === null) return null;
    const pts = trofeuCivico.crescimentoPontos;
    const ptsFmt = Math.abs(pts).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });

    if (pts > 0) {
      return {
        text: `+${ptsFmt} ponto`,
        isPositive: true,
      };
    }
    if (pts < 0) {
      return {
        text: `-${ptsFmt} ponto`,
        isPositive: false,
      };
    }
    return {
      text: "0,0 ponto",
      isPositive: true,
    };
  })();

  return (
    <section
      aria-label="Destaque e Indicadores Gerais da Educação"
      className="space-y-8"
    >
      {/* Grid Hero Canônico: Narrativa Editorial à esquerda + Destaque Cívico à direita */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda: Narrativa Editorial no Padrão de Temas */}
        <div className="space-y-4 lg:col-span-7">
          <span className="inline-block font-semibold text-accent text-xs uppercase tracking-wider">
            TEMAS · EDUCAÇÃO BÁSICA · {selectedYear}
          </span>

          <h1 className="font-bold font-serif text-3xl text-slate-900 leading-tight tracking-tight sm:text-4xl">
            Do aprendizado aos recursos:{" "}
            <span className="text-accent">acompanhe a evolução do IDEB</span> e
            o rigor fiscal da educação no município.
          </h1>

          <p className="text-slate-600 text-sm leading-relaxed sm:text-base">
            Monitoramento auditável da evolução pedagógica (série histórica do
            IDEB, proficiências SAEB e fluxo de aprovação apurados pelo
            INEP/MEC) integrada à aplicação dos pisos constitucionais de MDE
            (25%) e FUNDEB (70%), ao custo por aluno e aos contratos de merenda,
            transporte e serviços escolares da rede municipal.
          </p>
        </div>

        {/* Coluna Direita: Card Visual de Destaque Cívico / Conquista Escolar */}
        <div
          className="rounded-[14px] border border-[#e7e9ee] bg-white p-6 shadow-xs lg:col-span-5"
          data-testid="trofeu-civico-card"
        >
          <div className="flex items-center justify-between gap-2 border-slate-100 border-b pb-3">
            <span className="inline-block rounded-md border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-700 text-xs">
              Ciclo Oficial INEP/MEC {selectedYear}
            </span>
            <span className="font-semibold text-slate-500 text-xs uppercase tracking-wider">
              Destaque Cívico
            </span>
          </div>

          <h2 className="mt-4 font-bold font-serif text-slate-900 text-xl leading-snug sm:text-2xl">
            {trofeuCivico.destaqueBadgeTexto}
          </h2>

          <p className="mt-3 text-slate-600 text-xs leading-relaxed">
            Reconhecimento pedagógico atribuído à dedicação dos estudantes,
            professores e equipes escolares da rede municipal.
          </p>
        </div>
      </div>

      {/* KPIs Canônicos em Grid de 4 Colunas */}
      <KPIGrid columns={4}>
        <KPICard
          title={`Nota IDEB ${selectedYear}`}
          value={notaAtualFmt}
          subtext="Anos Iniciais da Rede Municipal"
          trend={
            crescimentoConfig
              ? {
                  value: crescimentoConfig.text,
                  isPositive: crescimentoConfig.isPositive,
                }
              : undefined
          }
        />
        <KPICard
          title="Ciclo Anterior"
          value={notaAnteriorFmt}
          subtext={
            trofeuCivico.notaAnterior !== null
              ? `Referência anterior (${selectedYear - 2})`
              : "Primeiro ciclo apurado"
          }
        />
        <KPICard
          title="Classificação Estadual"
          value={trofeuCivico.rankingPosicaoLabel}
          subtext={trofeuCivico.rankingSubtext}
          trend={trofeuCivico.rankingTrend}
        />
        <KPICard
          title="Custo Anual / Aluno"
          value={
            trofeuCivico.custoAnualPorAluno !== null
              ? fmtCurrency(trofeuCivico.custoAnualPorAluno)
              : "—"
          }
          subtext={
            trofeuCivico.totalMatriculas !== null
              ? `${trofeuCivico.totalMatriculas.toLocaleString("pt-BR")} matrículas ativas`
              : "Função 12 (Educação)"
          }
          className="min-w-0"
        />
      </KPIGrid>
    </section>
  );
}
