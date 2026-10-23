import { ArrowRight, Pill } from "lucide-react";
import Link from "next/link";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { CLASSE_ACAO_DESTAQUE, DestaqueLinha } from "../destaque-linha";
import { FarmaciaAcoesCivicas } from "./farmacia-acoes-civicas";
import { FarmaciaBuscaForm } from "./farmacia-busca-form";

const LINK_LEI_CLASS =
  "font-medium underline underline-offset-2 hover:text-ink";

export interface FarmaciaResumoCardProps {
  status: "conforme" | "apagao" | "indisponivel";
  detailUrl: string;
  /** Texto do requerimento de fiscalização (usado só em `apagao`). */
  requerimento?: string;
  /** Texto de compartilhamento no WhatsApp (usado só em `apagao`). */
  textoWhatsApp?: string;
  className?: string;
}

export function FarmaciaResumoCard({
  status,
  detailUrl,
  requerimento,
  textoWhatsApp,
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
        contexto={
          <>
            Não encontramos estoque divulgado nos últimos 15 dias. Isso não quer
            dizer que falta remédio: pode ser que a informação não tenha sido
            publicada. A{" "}
            <a
              href={urlLegislacao("lei14654")}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_LEI_CLASS}
            >
              Lei 14.654/2023
            </a>{" "}
            pede divulgação atualizada.
          </>
        }
        className={className}
        acao={
          <div className="flex flex-col gap-2 sm:items-end">
            <Link href={detailUrl} className={CLASSE_ACAO_DESTAQUE}>
              <span>Ver detalhes</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {requerimento && textoWhatsApp && (
              <FarmaciaAcoesCivicas
                requerimento={requerimento}
                textoWhatsApp={textoWhatsApp}
                caminhoCompartilhamento={detailUrl}
              />
            )}
          </div>
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
