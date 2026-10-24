import { fmtDate } from "@transparencia/ui";

export interface FarmaciaSeloTransparenciaProps {
  dataAtualizacao: string | null;
}

export function FarmaciaSeloTransparencia({
  dataAtualizacao,
}: FarmaciaSeloTransparenciaProps) {
  return (
    <p className="flex items-center gap-2 self-start rounded-lg border border-borderLine bg-white px-3 py-2 text-[11px] text-slate-600 uppercase tracking-[.05em]">
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full bg-success"
        aria-hidden="true"
      />
      <span>
        Estoque oficial
        {dataAtualizacao ? ` · ${fmtDate(dataAtualizacao)}` : ""}
      </span>
    </p>
  );
}
