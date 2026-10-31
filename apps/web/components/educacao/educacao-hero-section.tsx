import { fmtCompact, KPICard } from "@transparencia/ui";
import { Users } from "lucide-react";
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
          <span className="inline-block font-semibold text-brand-text text-xs uppercase tracking-wider">
            {trofeuCivico.eyebrowLabel}
          </span>

          <h1>
            Do aprendizado aos recursos:{" "}
            <span className="text-brand-text">
              acompanhe a evolução do IDEB
            </span>{" "}
            e o rigor fiscal da educação no município.
          </h1>

          <p className="text-mute text-sm leading-relaxed sm:text-base">
            Monitoramento auditável da evolução pedagógica (série histórica do
            IDEB, proficiências SAEB e fluxo de aprovação apurados pelo
            INEP/MEC) integrada aos recursos orçamentários da Educação e aos
            contratos de fornecimento da merenda escolar (PNAE), transporte
            (PNATE) e infraestrutura da rede municipal.
          </p>
        </div>

        {/* Coluna Direita: Card Visual de Destaque Cívico / Conquista Escolar */}
        <div
          className="border-line border-t pt-6 lg:col-span-5"
          data-testid="trofeu-civico-card"
        >
          <div className="flex items-center justify-between gap-2 border-line border-b pb-3">
            <span className="inline-block rounded-md border border-line bg-line2 px-2.5 py-0.5 font-medium text-ink text-xs">
              Ciclo Oficial INEP/MEC {trofeuCivico.anoBaseIdeb}
            </span>
            <span className="font-semibold text-mute text-xs uppercase tracking-wider">
              Indicador Oficial
            </span>
          </div>

          <h2 className="mt-4">{trofeuCivico.destaqueBadgeTexto}</h2>

          <p className="mt-3 text-mute text-xs leading-relaxed">
            Indicador oficial apurado pelo INEP/MEC que combina o rendimento
            escolar (taxas de aprovação no Censo) com as médias de desempenho em
            Língua Portuguesa e Matemática apuradas pelo Saeb.
          </p>

          {trofeuCivico.totalMatriculas !== null && (
            <div className="mt-4 flex items-center gap-2 border-line border-y bg-line2 px-3 py-2 text-ink text-xs">
              <Users
                className="h-4 w-4 shrink-0 text-mute"
                aria-hidden="true"
              />
              <span>
                <strong className="font-semibold text-ink">
                  {trofeuCivico.totalMatriculas.toLocaleString("pt-BR")} alunos
                  matriculados
                </strong>{" "}
                na rede municipal (Censo Escolar {selectedYear})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* KPIs Canônicos em Grid de 4 Colunas */}
      <KPIGrid columns={4}>
        <KPICard
          title={`Nota IDEB ${trofeuCivico.anoBaseIdeb}`}
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
              ? `Referência anterior (${trofeuCivico.anoBaseIdeb - 2})`
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
          title="Despesa na Educação"
          value={
            trofeuCivico.despesaTotalEducacao !== null
              ? fmtCompact(trofeuCivico.despesaTotalEducacao)
              : "—"
          }
          subtext={`Valor liquidado · Exercício ${selectedYear}`}
          className="min-w-0"
        />
      </KPIGrid>
    </section>
  );
}
