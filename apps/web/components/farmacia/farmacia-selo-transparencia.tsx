import { fmtDate } from "@transparencia/ui";

export interface FarmaciaSeloTransparenciaProps {
  dataAtualizacao: string | null;
}

export function FarmaciaSeloTransparencia({
  dataAtualizacao,
}: FarmaciaSeloTransparenciaProps) {
  return (
    <p className="flex items-center gap-2 self-start border-line border-y px-3 py-2 text-mute text-xs">
      <span
        className="h-[7px] w-[7px] shrink-0 rounded-full bg-ok"
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
