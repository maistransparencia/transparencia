import { Indicator, IndicatorPanel } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ObrasKpisViewModel } from "@/app/[portalSlug]/obras/view-model";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

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

  const fonteObrasGov = (
    <a
      href={FONTES_OFICIAIS.obrasgov.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-text inline-flex items-center gap-1 underline underline-offset-2"
    >
      ObrasGov.br
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
    </a>
  );

  const leadText = (() => {
    if (kpis.totalObras === 0) {
      return (
        <>
          Nenhuma obra pública com movimentação registrada em {ano}. Veja os
          outros anos ou consulte a base do {fonteObrasGov}.
        </>
      );
    }
    const obrasTexto =
      kpis.totalObras === 1
        ? "1 obra mapeada"
        : `${kpis.totalObras} obras mapeadas`;
    return (
      <>
        São {obrasTexto} na cidade, segundo o {fonteObrasGov}.
        {kpis.paralisadas > 0 &&
          " Obra parada é motivo para perguntar, não prova de erro."}
      </>
    );
  })();

  return (
    <div className="space-y-8">
      <div className="max-w-3xl space-y-4">
        <h1>As obras da cidade estão andando?</h1>

        <p className="eyebrow">
          Dados de {ano}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </p>
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
                    <Link
                      href={hrefParalisadasNoMapa}
                      className="text-brand-text underline underline-offset-2"
                    >
                      Ver no mapa
                    </Link>
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
