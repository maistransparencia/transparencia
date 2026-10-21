"use client";

import { AlertBox } from "@transparencia/ui";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState } from "react";

export interface FarmaciaSusSentinelaBannerProps {
  leiUrl: string;
  leiOrganicaUrl: string;
  diasDesdePosicaoMaisRecente: number | null;
  requerimento: string;
  textoWhatsApp: string;
}

type FeedbackCopia = "idle" | "copiado" | "erro";

const LINK_LEI_CLASS =
  "inline-flex items-center gap-1 font-semibold underline underline-offset-2";
const BOTAO_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 font-semibold text-rose-900 text-sm transition-colors hover:bg-rose-100";

export function FarmaciaSusSentinelaBanner({
  leiUrl,
  leiOrganicaUrl,
  diasDesdePosicaoMaisRecente,
  requerimento,
  textoWhatsApp,
}: FarmaciaSusSentinelaBannerProps) {
  const [feedback, setFeedback] = useState<FeedbackCopia>("idle");

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(requerimento);
      setFeedback("copiado");
    } catch {
      setFeedback("erro");
    }
  };

  const handleWhatsApp = () => {
    const mensagem = `${textoWhatsApp} ${window.location.href}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

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
        prevê a divulgação quinzenal da disponibilidade de medicamentos.
        Fundamento do requerimento:{" "}
        <a
          href={leiOrganicaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_LEI_CLASS}
        >
          Art. 6º-B da Lei nº 8.080/1990
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
        .
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={handleCopiar} className={BOTAO_CLASS}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          Copiar Requerimento de Fiscalização
        </button>
        <button type="button" onClick={handleWhatsApp} className={BOTAO_CLASS}>
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          Compartilhar no WhatsApp
        </button>
      </div>
      {feedback === "copiado" && (
        <p role="status" className="mt-2 font-medium text-xs">
          Requerimento copiado.
        </p>
      )}
      {feedback === "erro" && (
        <p role="alert" className="mt-2 font-medium text-xs">
          Não foi possível copiar o requerimento. Tente novamente.
        </p>
      )}
    </AlertBox>
  );
}
