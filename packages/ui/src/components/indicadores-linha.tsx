import type { ReactNode } from "react";

export interface IndicadorLinhaItem {
  codigo: string;
  rotulo: string;
  valor: ReactNode;
  nota?: string | null;
  notaAtencao?: boolean;
  destaque?: boolean;
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
          <dt className="font-medium font-mono text-[11px] text-mute2 uppercase tracking-wider">
            {indicador.rotulo}
          </dt>
          <dd
            className={`font-bold font-sans text-[32px] ${indicador.destaque ? "text-brand" : "text-ink"}`}
          >
            {indicador.valor}
          </dd>
          {indicador.nota && (
            <dd
              className={`text-xs ${indicador.notaAtencao ? "text-warn" : "text-mute2"}`}
            >
              {indicador.nota}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}
