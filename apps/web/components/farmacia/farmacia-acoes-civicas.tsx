"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

export interface FarmaciaAcoesCivicasProps {
  requerimento: string;
  textoWhatsApp: string;
  /** Caminho compartilhado no WhatsApp; padrão: caminho da página atual. */
  caminhoCompartilhamento?: string;
}

type FeedbackCopia = "idle" | "copiado" | "erro";

const BOTAO_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-300 bg-white px-4 font-semibold text-rose-900 text-sm transition-colors hover:bg-rose-100";

export function FarmaciaAcoesCivicas({
  requerimento,
  textoWhatsApp,
  caminhoCompartilhamento,
}: FarmaciaAcoesCivicasProps) {
  const [feedback, setFeedback] = useState<FeedbackCopia>("idle");

  const handleCopiar = async () => {
    setFeedback("idle");
    try {
      await navigator.clipboard.writeText(requerimento);
      setFeedback("copiado");
    } catch {
      setFeedback("erro");
    }
  };

  const handleWhatsApp = () => {
    const caminho = caminhoCompartilhamento ?? window.location.pathname;
    const mensagem = `${textoWhatsApp} ${window.location.origin}${caminho}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
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
    </div>
  );
}
