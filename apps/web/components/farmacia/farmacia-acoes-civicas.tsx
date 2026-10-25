"use client";

import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";

export interface FarmaciaAcoesCivicasProps {
  requerimento: string;
  textoWhatsApp: string;
  /** Caminho compartilhado no WhatsApp; padrão: caminho da página atual. */
  caminhoCompartilhamento?: string;
  rotuloCopiar?: string;
  rotuloWhatsApp?: string;
  mensagemCopiado?: string;
  mensagemErro?: string;
  /** `pedido`: botão principal preenchido e secundário neutro (modal de pedido). */
  variante?: "alerta" | "pedido";
}

type FeedbackCopia = "idle" | "copiado" | "erro";

const BOTAO_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 font-semibold text-sm transition-colors";
const BOTOES_CLASS = {
  alerta: {
    principal: `${BOTAO_BASE} border-rose-300 bg-white text-rose-900 hover:bg-rose-100`,
    secundario: `${BOTAO_BASE} border-rose-300 bg-white text-rose-900 hover:bg-rose-100`,
  },
  pedido: {
    principal: `${BOTAO_BASE} flex-1 border-accent bg-accent text-white hover:opacity-90`,
    secundario: `${BOTAO_BASE} flex-1 border-borderLine bg-white text-ink hover:bg-slate-50`,
  },
} as const;

export function FarmaciaAcoesCivicas({
  requerimento,
  textoWhatsApp,
  caminhoCompartilhamento,
  rotuloCopiar = "Copiar Requerimento de Fiscalização",
  rotuloWhatsApp = "Compartilhar no WhatsApp",
  mensagemCopiado = "Requerimento copiado.",
  mensagemErro = "Não foi possível copiar o requerimento. Tente novamente.",
  variante = "alerta",
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
        <button
          type="button"
          onClick={handleCopiar}
          className={BOTOES_CLASS[variante].principal}
        >
          <Copy className="h-4 w-4" aria-hidden="true" />
          {rotuloCopiar}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className={BOTOES_CLASS[variante].secundario}
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {rotuloWhatsApp}
        </button>
      </div>
      {feedback === "copiado" && (
        <p role="status" className="mt-2 font-medium text-xs">
          {mensagemCopiado}
        </p>
      )}
      {feedback === "erro" && (
        <p role="alert" className="mt-2 font-medium text-xs">
          {mensagemErro}
        </p>
      )}
    </div>
  );
}
