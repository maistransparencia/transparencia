import type { ReactNode } from "react";

export interface IndicadorLinhaItem {
  codigo: string;
  rotulo: string;
  valor: ReactNode;
  nota?: string | null;
  notaAtencao?: boolean;
  destaque?: boolean;
  detalhe?: { resumo: string; paragrafos: string[] } | null;
}

export function IndicadoresLinha({
  indicadores,
}: {
  indicadores: IndicadorLinhaItem[];
}) {
  if (indicadores.length === 0) return null;

  return (
    <dl className="flex flex-col divide-y divide-line border-line border-y sm:flex-row sm:divide-x sm:divide-y-0">
      {indicadores.map((indicador) => (
        <div
          key={indicador.codigo}
          className="flex flex-1 flex-col gap-1.5 py-4 sm:px-4 sm:first:pl-0"
        >
          <dt className="eyebrow">{indicador.rotulo}</dt>
          <dd
            className={`font-bold font-sans text-[32px] ${indicador.destaque ? "text-brand" : "text-ink"}`}
          >
            {indicador.valor}
          </dd>
          {indicador.nota && (
            <dd
              className={`text-xs ${indicador.notaAtencao ? "text-warn-text" : "text-mute2"}`}
            >
              {indicador.nota}
            </dd>
          )}
          {indicador.detalhe && (
            <dd>
              <details className="text-mute2 text-xs">
                <summary className="cursor-pointer font-medium text-warn-text underline underline-offset-4">
                  {indicador.detalhe.resumo}
                </summary>
                {indicador.detalhe.paragrafos.map((paragrafo) => (
                  <p key={paragrafo} className="mt-1">
                    {paragrafo}
                  </p>
                ))}
              </details>
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
