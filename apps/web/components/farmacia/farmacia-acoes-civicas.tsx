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
  /** Telemetria das ações; recebe só o tipo, nunca o texto copiado. */
  onAcao?: (acao: "copiado" | "copia_falhou" | "whatsapp") => void;
}

type FeedbackCopia = "idle" | "copiado" | "erro";

const BOTAO_BASE =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border px-4 font-semibold text-sm transition-colors";
const BOTOES_CLASS = {
  alerta: {
    principal: `${BOTAO_BASE} border-danger bg-page text-danger hover:bg-line2`,
    secundario: `${BOTAO_BASE} border-danger bg-page text-danger hover:bg-line2`,
  },
  pedido: {
    principal: `${BOTAO_BASE} flex-1 border-brand bg-brand text-onink hover:opacity-90`,
    secundario: `${BOTAO_BASE} flex-1 border-line bg-page text-ink hover:bg-line2`,
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
  onAcao,
}: FarmaciaAcoesCivicasProps) {
  const [feedback, setFeedback] = useState<FeedbackCopia>("idle");

  const handleCopiar = async () => {
    setFeedback("idle");
    try {
      await navigator.clipboard.writeText(requerimento);
      setFeedback("copiado");
      onAcao?.("copiado");
    } catch {
      setFeedback("erro");
      onAcao?.("copia_falhou");
    }
  };

  const handleWhatsApp = () => {
    onAcao?.("whatsapp");
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
