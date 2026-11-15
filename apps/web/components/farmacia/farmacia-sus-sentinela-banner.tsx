"use client";

import { AlertBox } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import { FarmaciaAcoesCivicas } from "./farmacia-acoes-civicas";

export interface FarmaciaSusSentinelaBannerProps {
  leiUrl: string;
  leiOrganicaUrl: string;
  diasDesdePosicaoMaisRecente: number | null;
  requerimento: string;
  textoWhatsApp: string;
}

const LINK_LEI_CLASS =
  "inline-flex items-center gap-1 font-semibold underline underline-offset-2";
export function FarmaciaSusSentinelaBanner({
  leiUrl,
  leiOrganicaUrl,
  diasDesdePosicaoMaisRecente,
  requerimento,
  textoWhatsApp,
}: FarmaciaSusSentinelaBannerProps) {
  const descricao =
    diasDesdePosicaoMaisRecente != null
      ? `A última posição de estoque de medicamentos divulgada tem ${diasDesdePosicaoMaisRecente} dias.`
      : "Não há divulgação recente da posição de estoque de medicamentos.";

  return (
    <AlertBox
      type="danger"
      title="Estoque de medicamentos sem divulgação atualizada"
    >
      <p>
        {descricao} A{" "}
        <a
          href={leiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_LEI_CLASS}
        >
          Lei nº 14.654/2023
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>{" "}
        prevê a atualização quinzenal dos estoques de medicamentos nas páginas
        do gestor do SUS. Fundamento do requerimento:{" "}
        <a
          href={leiOrganicaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_LEI_CLASS}
        >
          Art. 6º-A da Lei nº 8.080/1990
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        .
      </p>
      <div className="mt-3">
        <FarmaciaAcoesCivicas
          requerimento={requerimento}
          textoWhatsApp={textoWhatsApp}
        />
      </div>
    </AlertBox>
  );
}
