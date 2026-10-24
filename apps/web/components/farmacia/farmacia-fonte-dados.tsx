import { fmtDate } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface FarmaciaFonteDadosProps {
  dataAtualizacao: string | null;
  leiUrl: string;
}

export function FarmaciaFonteDados({
  dataAtualizacao,
  leiUrl,
}: FarmaciaFonteDadosProps) {
  return (
    <section
      className="flex flex-col gap-3 border-ink border-t-2 pt-7"
      aria-labelledby="farmacia-fonte-titulo"
    >
      <h2
        id="farmacia-fonte-titulo"
        className="font-bold font-serif text-2xl text-ink"
      >
        Fonte dos dados
      </h2>
      <p className="text-slate-600 text-sm leading-relaxed">
        Os dados vêm da lista de estoque que cada unidade de saúde envia ao
        Ministério da Saúde e que fica no portal de dados abertos
        (BNAFAR/Hórus). Este portal mostra a lista mais recente enviada. Se um
        remédio não aparece, isso não prova que faltou: a unidade pode não ter
        informado.
      </p>
      {dataAtualizacao && (
        <p className="text-slate-600 text-sm">
          Lista mais recente: {fmtDate(dataAtualizacao)}.
        </p>
      )}
      <ul className="flex flex-col gap-1 text-sm">
        <li>
          <a
            href={FONTES_OFICIAIS.bnafar.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            BNAFAR/Hórus — dados abertos do Ministério da Saúde
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </li>
        <li>
          <a
            href={leiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Lei 14.654/2023, que exige a divulgação
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </li>
      </ul>
    </section>
  );
}
