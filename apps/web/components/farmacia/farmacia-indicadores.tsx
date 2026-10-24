export interface FarmaciaIndicadorItem {
  codigo: string;
  rotulo: string;
  valor: string;
  nota: string;
  notaAtencao: boolean;
}

export function FarmaciaIndicadores({
  indicadores,
}: {
  indicadores: FarmaciaIndicadorItem[];
}) {
  if (indicadores.length === 0) return null;

  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-3">
      {indicadores.map((indicador) => (
        <div
          key={indicador.codigo}
          className="flex flex-col gap-1 rounded-[10px] border border-borderLine bg-white px-4 py-3.5"
        >
          <dt className="font-medium text-subtleText text-xs">
            {indicador.rotulo}
          </dt>
          <dd className="font-bold font-serif text-[26px] text-ink">
            {indicador.valor}
          </dd>
          <dd
            className={`text-xs ${indicador.notaAtencao ? "text-attention" : "text-subtleText"}`}
          >
            {indicador.nota}
          </dd>
        </div>
      ))}
    </dl>
  );
}
