import { Indicator, IndicatorPanel } from "@transparencia/ui";
import Link from "next/link";
import type { ObrasKpisViewModel } from "@/app/[portalSlug]/obras/view-model";

export interface ObrasHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  kpis: ObrasKpisViewModel;
}

export function ObrasHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  kpis,
}: ObrasHeroSectionProps) {
  const hrefParalisadasNoMapa = `?ano=${ano}&status=paralisada#secao-mapa-obras`;

  const leadText = (() => {
    if (kpis.totalObras === 0) {
      return `Nenhuma obra pública com movimentação registrada em ${ano}. Veja os outros anos ou consulte a base do ObrasGov.br.`;
    }
    const obrasTexto =
      kpis.totalObras === 1
        ? "1 obra mapeada"
        : `${kpis.totalObras} obras mapeadas`;
    const avisoParalisadas =
      kpis.paralisadas > 0
        ? " Obra parada é motivo para perguntar, não prova de erro."
        : "";
    return `São ${obrasTexto} na cidade.${avisoParalisadas}`;
  })();

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <p className="eyebrow text-brand-text!">
          OBRAS PÚBLICAS · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>

        <h1>As obras da cidade estão andando?</h1>

        <p className="lead">{leadText}</p>
      </div>

      {kpis.totalObras > 0 && (
        <IndicatorPanel tone="brand" size="md" columns={4}>
          <Indicator
            label="Em execução"
            value={kpis.emExecucao}
            note="Obras em andamento"
          />
          <Indicator
            label="Paralisadas"
            value={kpis.paralisadas}
            note={
              <>
                Merecem atenção
                {kpis.paralisadas > 0 && (
                  <>
                    {" · "}
                    <Link href={hrefParalisadasNoMapa}>Ver no mapa</Link>
                  </>
                )}
              </>
            }
            tone={kpis.paralisadas > 0 ? "warn" : "default"}
          />
          <Indicator
            label="Concluídas"
            value={kpis.concluidas}
            note="Entregues à população"
          />
          <Indicator
            label="Avanço físico médio"
            value={kpis.percentualMedioExecucaoFormatado}
            note="Das obras em andamento, conforme o ObrasGov.br"
          />
        </IndicatorPanel>
      )}
    </div>
  );
}
