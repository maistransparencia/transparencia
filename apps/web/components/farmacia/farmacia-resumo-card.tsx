import { ArrowRight, Pill } from "lucide-react";
import Link from "next/link";
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
    <DestaqueLinha
      ariaLabel="Farmácia SUS"
      icone={Pill}
      titulo="Farmácia SUS"
      badgeTexto="Em conformidade"
      tom="positivo"
      contexto={
        <>
          Onde tem o seu remédio?{" "}
          <Link
            href={detailUrl}
            className="font-medium underline underline-offset-2 hover:text-ink"
          >
            Busque no estoque
          </Link>
          .
        </>
      }
      className={className}
      dado={<FarmaciaBuscaForm action={detailUrl} className="sm:w-96" />}
    />
  );
}
