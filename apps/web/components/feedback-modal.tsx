"use client";

import { ModalDialog } from "@transparencia/ui";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import posthog from "posthog-js";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export type FeedbackType = "erro_tecnico" | "inconsistencia_dados" | "sugestao";

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalSlug?: string;
  municipioNome?: string;
}

type ModalStatus = "idle" | "loading" | "success" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEEDBACK_OPTIONS: Array<{
  id: FeedbackType;
  label: string;
  description: string;
}> = [
  {
    id: "erro_tecnico",
    label: "Falha na página",
    description: "Botão que não funciona, tela travada ou erro visual.",
  },
  {
    id: "inconsistencia_dados",
    label: "Divergência de dados",
    description: "Valor ou dado fiscal diferente da fonte oficial.",
  },
  {
    id: "sugestao",
    label: "Sugestão",
    description: "Ideia de melhoria, nova visualização ou filtro.",
  },
];

export function FeedbackModal({
  isOpen,
  onClose,
  portalSlug,
  municipioNome,
}: FeedbackModalProps) {
  const [type, setType] = useState<FeedbackType>("erro_tecnico");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClose = () => {
    if (status === "loading") {
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setType("erro_tecnico");
      setMessage("");
      setEmail("");
      setHoneypot("");
      setStatus("idle");
      setErrorMessage("");

      try {
        posthog.capture("feedback_modal_opened", {
          portal_slug: portalSlug ?? null,
          url: typeof window !== "undefined" ? window.location.href : "",
          pathname:
            typeof window !== "undefined" ? window.location.pathname : "",
        });
      } catch {
        // Ignora erros de bloqueio de telemetria
      }

      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, portalSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Anti-spam honeypot
    if (honeypot) {
      setStatus("success");
      return;
    }

    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length < 10) {
      setStatus("error");
      setErrorMessage(
        "Por favor, descreva o relato com pelo menos 10 caracteres para podermos analisar.",
      );
      return;
    }

    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      setStatus("error");
      setErrorMessage(
        "O endereço de e-mail informado parece inválido. Corrija ou deixe em branco.",
      );
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const phWithRecording = posthog as unknown as {
        sessionRecording?: { isRecording?: () => boolean };
      };
      const hasSessionRecording = Boolean(
        phWithRecording.sessionRecording?.isRecording?.() ?? false,
      );

      posthog.capture("feedback_submitted", {
        type,
        message: trimmedMessage,
        email: trimmedEmail || null,
        portal_slug: portalSlug ?? null,
        url: typeof window !== "undefined" ? window.location.href : "",
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        has_session_recording: hasSessionRecording,
        timestamp: new Date().toISOString(),
      });

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage(
        "Não foi possível enviar o relato no momento. Por favor, tente novamente mais tarde.",
      );
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Sugestão ou erro"
      subtitle={
        municipioNome
          ? `Ajude a aprimorar a transparência em ${municipioNome}`
          : "Ajude a manter as informações fiscais e a plataforma íntegras"
      }
      subtitleClassName="whitespace-normal leading-relaxed"
      showShareButton={false}
      maxWidth="md"
    >
      {status === "success" ? (
        <div className="py-4 text-center">
          <div className="bg-ok-fill/10 text-ok-text mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3>Relato enviado com sucesso!</h3>
          <p className="text-mute mt-2 text-sm leading-relaxed">
            Agradecemos sua colaboração cidadã. Seu relato foi registrado junto
            aos dados técnicos da página e será analisado pela nossa equipe.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="bg-ink text-onink hover:bg-ink/90 focus-visible:ring-mute3 w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot anti-spam invisível */}
          <input
            type="text"
            name="site_url"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="sr-only"
            aria-hidden="true"
          />

          {/* Tipo de Relato */}
          <div>
            <span
              id="feedback-type-label"
              className="text-ink block text-xs font-medium tracking-wide uppercase"
            >
              Tipo de relato
            </span>
            <div
              role="radiogroup"
              aria-labelledby="feedback-type-label"
              className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              {FEEDBACK_OPTIONS.map((option) => {
                const isSelected = type === option.id;
                return (
                  <label
                    key={option.id}
                    className={`focus-within:ring-focus-ring/40 flex cursor-pointer flex-col rounded-lg border p-2.5 text-left transition-all focus-within:ring-2 ${
                      isSelected
                        ? "border-brand bg-brand/10 text-ink shadow-xs"
                        : "border-line bg-page text-mute hover:border-line hover:bg-line2"
                    }`}
                  >
                    <input
                      type="radio"
                      name="feedback_type"
                      value={option.id}
                      checked={isSelected}
                      onChange={() => setType(option.id)}
                      className="sr-only"
                    />
                    <span className="text-xs leading-snug font-medium">
                      {option.label}
                    </span>
                    <span className="text-mute2 mt-0.5 text-[11px] leading-tight">
                      {option.description}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Mensagem / Descrição */}
          <div>
            <label
              htmlFor="feedback-message"
              className="text-ink block text-xs font-medium tracking-wide uppercase"
            >
              Descrição do problema ou sugestão{" "}
              <span className="text-danger-text">*</span>
            </label>
            <textarea
              id="feedback-message"
              ref={textareaRef}
              rows={4}
              required
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva o que você estava fazendo, o que observou ou qual dado parece incorreto..."
              className="border-line bg-page text-ink placeholder:text-mute2 focus:border-brand focus:ring-focus-ring/20 mt-1.5 w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
            <div className="text-mute2 mt-1 flex items-center justify-between text-[11px]">
              <span>Mínimo de 10 caracteres</span>
              <span>{message.length}/2000</span>
            </div>
          </div>

          {/* E-mail opcional */}
          <div>
            <label
              htmlFor="feedback-email"
              className="text-ink block text-xs font-medium tracking-wide uppercase"
            >
              Seu e-mail{" "}
              <span className="text-mute2 font-normal lowercase">
                (opcional, caso queira retorno)
              </span>
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemplo@email.com"
              className="border-line bg-page text-ink placeholder:text-mute2 focus:border-brand focus:ring-focus-ring/20 mt-1.5 w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:ring-2 focus:outline-none"
            />
          </div>

          {/* Mensagem de Erro Inline */}
          {errorMessage && (
            <div
              role="alert"
              className="border-danger-fill/30 bg-danger-fill/10 text-danger-text flex items-start gap-2 rounded-lg border p-3 text-xs leading-relaxed"
            >
              <AlertCircle className="text-danger-text mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Nota de Contexto e Privacidade */}
          <p className="text-mute2 text-[11px] leading-relaxed">
            Para facilitar a investigação técnica, informações sobre a página
            atual e a sessão de navegação são enviadas com segurança ao PostHog.
          </p>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={status === "loading"}
              className="border-line text-mute hover:bg-line2 focus-visible:ring-mute3 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={status === "loading"}
              className="bg-ink text-onink hover:bg-ink/90 focus-visible:ring-mute3 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Enviar relato</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </ModalDialog>
  );
}
