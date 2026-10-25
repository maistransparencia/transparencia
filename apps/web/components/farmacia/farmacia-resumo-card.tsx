import { ArrowRight, ExternalLink, Pill } from "lucide-react";
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
      className={`flex flex-col gap-4 rounded-2xl border border-[#e7e9ee] bg-white p-4 shadow-sm sm:p-5 ${className}`}
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
      {exemplos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-subtleText">Exemplos:</span>
          <ul className="flex flex-wrap gap-2">
            {exemplos.map((exemplo) => (
              <li key={exemplo.codigoPrincipioAtivo}>
                <Link
                  href={exemplo.href}
                  className="inline-flex min-h-11 items-center rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-ink text-sm transition-colors hover:bg-slate-100 sm:min-h-0"
                >
                  {exemplo.nomePrincipioAtivo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
