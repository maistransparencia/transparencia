import { fmtDate } from "@transparencia/ui";

export interface FarmaciaSeloTransparenciaProps {
  dataAtualizacao: string | null;
}

export function FarmaciaSeloTransparencia({
  dataAtualizacao,
}: FarmaciaSeloTransparenciaProps) {
  return (
    <p className="flex items-center gap-2 self-start rounded-lg border border-borderLine bg-white px-3 py-2 text-slate-600 text-xs">
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full bg-success"
        aria-hidden="true"
      />
      <span>
        {dataAtualizacao
          ? `Lista de estoque atualizada em ${fmtDate(dataAtualizacao)}`
          : "Lista de estoque do Ministério da Saúde"}
      </span>
    </p>
  );
}
