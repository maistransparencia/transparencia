import { fmtCurrency } from "@transparencia/ui";
import {
  Award,
  BookOpen,
  GraduationCap,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import type { TrofeuCivicoKPIs } from "@/app/[portalSlug]/educacao/view-model";

export interface EducacaoHeroSectionProps {
  municipioNome: string;
  municipioUf: string;
  selectedYear: number;
  trofeuCivico: TrofeuCivicoKPIs;
}

export function EducacaoHeroSection({
  municipioNome,
  municipioUf,
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
        badgeClass: "text-emerald-700 bg-emerald-100",
        Icon: TrendingUp,
      };
    }
    if (pts < 0) {
      return {
        text: `-${ptsFmt} ponto`,
        badgeClass: "text-rose-700 bg-rose-100",
        Icon: TrendingDown,
      };
    }
    return {
      text: "0,0 ponto",
      badgeClass: "text-slate-700 bg-slate-100",
      Icon: TrendingUp,
    };
  })();

  return (
    <section
      aria-label="Destaque e Indicadores Gerais da Educação"
      className="space-y-6"
    >
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-medium text-sky-800 text-xs">
          <GraduationCap className="h-3.5 w-3.5 text-sky-600" />
          <span>Tema Temático Canônico</span>
        </div>
        <h1 className="font-bold font-serif text-3xl text-slate-900 tracking-tight sm:text-4xl">
          Educação Básica & Rigor Fiscal em {municipioNome} ({municipioUf})
        </h1>
        <p className="max-w-4xl text-slate-600 text-sm leading-relaxed sm:text-base">
          Monitoramento auditável da evolução pedagógica (série histórica do
          IDEB, proficiências SAEB e fluxo de aprovação apurados pelo INEP)
          integrada à execução orçamentária, aplicação constitucional de
          MDE/FUNDEB e custos por aluno da rede municipal.
        </p>
      </div>

      {/* Card do Troféu Cívico / Destaque Institucional */}
      <div
        className="relative overflow-hidden rounded-xl border border-amber-400 bg-amber-50/50 p-5 shadow-xs sm:p-6"
        data-testid="trofeu-civico-card"
      >
        <div className="flex flex-col items-start justify-between gap-4 border-amber-200/80 border-b pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-400/20 text-amber-800">
              <Trophy className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <span className="inline-block rounded-md border border-amber-300/70 bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-900 text-xs">
                Ciclo Oficial INEP/MEC {selectedYear}
              </span>
              <p className="mt-1 font-bold font-serif text-amber-950 text-base sm:text-lg">
                {trofeuCivico.destaqueBadgeTexto}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-left sm:text-right">
            <span className="block font-semibold text-amber-800 text-xs uppercase tracking-wider">
              Reconhecimento
            </span>
            <span className="font-medium text-amber-900 text-sm">
              Rede Pública & Comunidade Escolar
            </span>
          </div>
        </div>

        {/* Grid de KPIs Principais */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <div className="rounded-lg border border-amber-200/60 bg-white/80 p-4 shadow-xs">
            <div className="flex items-center justify-between font-semibold text-slate-500 text-xs uppercase tracking-wider">
              <span>Nota IDEB {selectedYear}</span>
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-extrabold font-serif text-3xl text-slate-900 sm:text-4xl">
                {notaAtualFmt}
              </span>
              {crescimentoConfig && (
                <span
                  className={`inline-flex items-center rounded px-1.5 py-0.5 font-bold text-xs ${crescimentoConfig.badgeClass}`}
                >
                  <crescimentoConfig.Icon className="mr-0.5 inline h-3 w-3" />
                  {crescimentoConfig.text}
                </span>
              )}
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Anos Iniciais da Rede Municipal
            </p>
          </div>

          <div className="rounded-lg border border-amber-200/60 bg-white/80 p-4 shadow-xs">
            <div className="flex items-center justify-between font-semibold text-slate-500 text-xs uppercase tracking-wider">
              <span>Ciclo Anterior</span>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="font-extrabold font-serif text-3xl text-slate-700 sm:text-4xl">
                {notaAnteriorFmt}
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              {trofeuCivico.notaAnterior !== null
                ? `Referência anterior (${selectedYear - 2})`
                : "Primeiro ciclo apurado"}
            </p>
          </div>

          <div className="rounded-lg border border-amber-200/60 bg-white/80 p-4 shadow-xs">
            <div className="flex items-center justify-between font-semibold text-slate-500 text-xs uppercase tracking-wider">
              <span>Classificação Estadual</span>
              <Trophy className="h-4 w-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="font-bold font-serif text-slate-900 text-xl leading-tight sm:text-2xl">
                {trofeuCivico.rankingEstadualLabel}
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              Rede Municipal ({municipioUf})
            </p>
          </div>

          <div className="rounded-lg border border-amber-200/60 bg-white/80 p-4 shadow-xs">
            <div className="flex items-center justify-between font-semibold text-slate-500 text-xs uppercase tracking-wider">
              <span>Custo Anual / Aluno</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="font-extrabold font-serif text-2xl text-slate-900 sm:text-3xl">
                {trofeuCivico.custoAnualPorAluno !== null
                  ? fmtCurrency(trofeuCivico.custoAnualPorAluno)
                  : "—"}
              </span>
            </div>
            <p className="mt-1 text-slate-500 text-xs">
              {trofeuCivico.totalMatriculas !== null
                ? `${trofeuCivico.totalMatriculas.toLocaleString("pt-BR")} matrículas ativas`
                : "Função 12 (Educação)"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
