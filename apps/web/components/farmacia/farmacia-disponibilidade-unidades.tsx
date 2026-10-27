import { fmtNumber } from "@transparencia/ui";

export interface FarmaciaDisponibilidadeUnidadesProps {
  unidadesComRegistro: number;
  totalUnidadesAtivas: number;
}

/** Quadradinhos por unidade ativa: os preenchidos informaram estoque do remédio. */
export function FarmaciaDisponibilidadeUnidades({
  unidadesComRegistro,
  totalUnidadesAtivas,
}: FarmaciaDisponibilidadeUnidadesProps) {
  return (
    <>
      <span className="flex gap-[3px]" aria-hidden="true">
        {Array.from({ length: totalUnidadesAtivas }, (_, indice) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: quadradinhos posicionais, sem identidade própria
            key={indice}
            className={`h-2 w-2 rounded-sm ${indice < unidadesComRegistro ? "bg-brand" : "bg-line"}`}
          />
        ))}
      </span>
      <span className="text-[11px] text-mute tabular-nums">
        {fmtNumber(unidadesComRegistro)} de {fmtNumber(totalUnidadesAtivas)}{" "}
        unidades
      </span>
    </>
  );
}
