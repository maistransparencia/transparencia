import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { FarmaciaBuscaForm } from "./farmacia-busca-form";

export interface FarmaciaResumoCardProps {
  status: "conforme" | "apagao" | "indisponivel";
  detailUrl: string;
  className?: string;
}

export function FarmaciaResumoCard({
  status,
  detailUrl,
  className = "",
}: FarmaciaResumoCardProps) {
  if (status === "indisponivel") return null;

  if (status === "apagao") {
    return (
      <section
        aria-label="Farmácia SUS"
        className={`flex flex-col gap-2 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
      >
        <p className="flex items-start gap-2 font-semibold text-rose-900 text-sm">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600"
            aria-hidden="true"
          />
          Estoque de medicamentos da Farmácia SUS sem divulgação atualizada.
        </p>
        <Link
          href={detailUrl}
          className="inline-flex min-h-11 items-center gap-1 font-semibold text-rose-900 text-sm underline underline-offset-2"
        >
          <span>Ver detalhes</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    );
  }

  return (
    <section
      aria-label="Farmácia SUS"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <h3 className="mb-3 font-bold text-base text-ink tracking-tight">
        Farmácia SUS: onde tem o seu remédio?
      </h3>
      <FarmaciaBuscaForm action={detailUrl} />
    </section>
  );
}
