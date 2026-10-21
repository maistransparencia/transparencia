import { fmtDate } from "@transparencia/ui";
import { CheckCircle } from "lucide-react";

export interface FarmaciaSeloTransparenciaProps {
  dataAtualizacao: string | null;
}

export function FarmaciaSeloTransparencia({
  dataAtualizacao,
}: FarmaciaSeloTransparenciaProps) {
  return (
    <p className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800 text-sm">
      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Estoque Transparente
        {dataAtualizacao ? ` — Atualizado em ${fmtDate(dataAtualizacao)}` : ""}
      </span>
    </p>
  );
}
