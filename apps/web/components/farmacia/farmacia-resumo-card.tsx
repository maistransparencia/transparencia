import { ExternalLinkPill } from "@transparencia/ui";
import { ArrowRight, Pill } from "lucide-react";
import Link from "next/link";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
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
  /** Remédios comuns como atalhos de busca (usado só em `conforme`). */
  exemplos?: FarmaciaExemploCard[];
  className?: string;
}

export interface FarmaciaExemploCard {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  href: string;
}

export function FarmaciaResumoCard({
  status,
  detailUrl,
  requerimento,
  textoWhatsApp,
  exemplos = [],
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
    <section
      aria-label="Farmácia SUS"
      className={`border-ink grid grid-cols-1 gap-x-12 gap-y-4 border-t-2 pt-4 lg:grid-cols-2 ${className}`}
    >
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h3>Farmácia SUS</h3>
          <ExternalLinkPill
            href={FONTES_OFICIAIS.bnafar.url}
            title="Dados de estoque no portal de dados abertos do Ministério da Saúde"
            className="eyebrow px-2.5 py-0.5"
          >
            {FONTES_OFICIAIS.bnafar.nome}
          </ExternalLinkPill>
        </div>
        <p className="text-mute2 mt-1 text-xs">
          Busque o remédio que você precisa.
        </p>
      </div>
      <div className="space-y-3">
        <FarmaciaBuscaForm
          action={detailUrl}
          rotuloBotaoMobile="Buscar no estoque"
        />
        {exemplos.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-mute2 text-xs">Exemplos:</span>
            <ul className="flex flex-wrap gap-x-3 gap-y-1">
              {exemplos.map((exemplo) => (
                <li key={exemplo.codigoPrincipioAtivo}>
                  <Link
                    href={exemplo.href}
                    className="text-brand inline-flex min-h-11 items-center text-xs hover:underline sm:min-h-0"
                  >
                    {exemplo.nomePrincipioAtivo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
