export interface FarmaciaIndicadorItem {
  codigo: string;
  rotulo: string;
  valor: string;
  nota: string | null;
  notaAtencao: boolean;
}

export function FarmaciaIndicadores({
  indicadores,
}: {
  indicadores: FarmaciaIndicadorItem[];
}) {
  if (indicadores.length === 0) return null;

  return (
    <dl className="flex flex-col divide-y divide-line border-line border-y sm:flex-row sm:divide-x sm:divide-y-0">
      {indicadores.map((indicador) => (
        <div
          key={indicador.codigo}
          className="flex flex-1 flex-col gap-1 py-3.5 sm:px-4 sm:first:pl-0"
        >
          <dt className="font-medium text-mute2 text-xs">{indicador.rotulo}</dt>
          <dd className="font-bold font-serif text-[26px] text-ink">
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
