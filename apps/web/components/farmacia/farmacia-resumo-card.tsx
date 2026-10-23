import { ArrowRight, ExternalLink, Pill } from "lucide-react";
import Link from "next/link";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { CLASSE_ACAO_DESTAQUE, DestaqueLinha } from "../destaque-linha";
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
      <DestaqueLinha
        ariaLabel="Farmácia SUS"
        icone={Pill}
        titulo="Farmácia SUS"
        badgeTexto="Sem informação de estoque"
        tom="atencao"
        contexto="O estoque de medicamentos está sem divulgação atualizada, como exige a Lei 14.654/2023."
        className={className}
        acao={
          <Link href={detailUrl} className={CLASSE_ACAO_DESTAQUE}>
            <span>Ver detalhes</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
    );
  }

  return (
    <section
      aria-label="Farmácia SUS"
      className={`flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="">
        <div className="flex w-full items-center justify-between gap-1">
          <h3 className="font-bold font-serif text-ink text-lg">
            Farmácia SUS
          </h3>
          <a
            href={FONTES_OFICIAIS.bnafar.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Dados de estoque no portal de dados abertos do Ministério da Saúde"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink sm:self-auto"
          >
            <span>{FONTES_OFICIAIS.bnafar.nome}</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </div>
        <p className="col-span-2 text-sm text-subtleText sm:col-span-1 sm:col-start-2">
          Busque o remédio que você precisa.
        </p>
      </div>
      <FarmaciaBuscaForm
        action={detailUrl}
        rotuloBotaoMobile="Buscar no estoque"
      />
    </section>
  );
}
