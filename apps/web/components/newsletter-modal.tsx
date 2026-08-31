"use client";

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";
import posthog from "posthog-js";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface NewsletterModalProps {
  isOpen: boolean;
  onClose: () => void;
  portalSlug?: string;
  municipioNome?: string;
  stateUF?: string;
}

type ModalStatus = "idle" | "loading" | "success" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterModal({
  isOpen,
  onClose,
  portalSlug = "porciuncula_prefeitura",
  municipioNome = "Porciúncula",
  stateUF = "RJ",
}: NewsletterModalProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<ModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [renderTime, setRenderTime] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    if (status === "loading") {
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setStatus("idle");
      setErrorMessage("");
      setHoneypot("");
      setRenderTime(Date.now());

      posthog.capture("newsletter_modal_opened", {
        portal_slug: portalSlug,
      });

      // Autofocus no input após renderizar
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, portalSlug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && status !== "loading") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, status]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      setStatus("error");
      setErrorMessage("Por favor, insira um endereço de e-mail válido.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    posthog.capture("newsletter_subscribe_submitted", {
      portal_slug: portalSlug,
    });

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          portalSlug,
          b_empresa_url: honeypot,
          clientRenderTime: renderTime,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          posthog.capture("newsletter_rate_limited", {
            portal_slug: portalSlug,
          });
        } else {
          posthog.capture("newsletter_subscribe_error", {
            portal_slug: portalSlug,
            error: data.error || "Falha na submissão",
          });
        }
        setStatus("error");
        setErrorMessage(
          data.error ||
            "Ocorreu um erro ao processar sua inscrição. Tente novamente.",
        );
        return;
      }

      setStatus("success");
      posthog.capture("newsletter_subscribe_success", {
        portal_slug: portalSlug,
      });
    } catch (err) {
      const errText =
        err instanceof Error ? err.message : "Erro de conexão ao servidor.";
      setStatus("error");
      setErrorMessage(errText);
      posthog.capture("newsletter_subscribe_error", {
        portal_slug: portalSlug,
        error: errText,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={handleClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        className="relative w-full max-w-md rounded-xl border border-borderLine bg-white p-6 shadow-2xl transition-all"
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={handleClose}
          disabled={status === "loading"}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 rounded-lg p-1.5 text-mutedText transition-colors hover:bg-gray-100 hover:text-ink disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Estado de Sucesso */}
        {status === "success" ? (
          <div className="py-4 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Confirme sua inscrição!
            </h3>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              Enviamos um link de confirmação para <strong>{email}</strong>.
              Acesse seu e-mail e clique no botão para começar a receber resumos
              e alertas de <strong>{municipioNome}</strong>.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-lg bg-[oklch(0.55_0.11_250)] px-4 py-2.5 font-medium text-sm text-white shadow-xs transition-colors hover:bg-[oklch(0.48_0.11_250)]"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header com Badge */}
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-medium text-[11px] text-blue-700">
                {municipioNome} - {stateUF}
              </span>
              <span className="flex items-center gap-1 font-medium text-[11px] text-mutedText">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                LGPD & RFC 8058
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.55_0.11_250)]/10 text-[oklch(0.55_0.11_250)]">
                <Mail className="h-4 w-4" />
              </div>
              <h2
                id="newsletter-modal-title"
                className="font-bold text-base text-gray-900"
              >
                Boletim Cívico Municipal
              </h2>
            </div>

            <p className="mt-2.5 text-gray-600 text-xs leading-relaxed">
              Receba alertas fiscais, resumos de licitações e atualizações dos
              gastos públicos de {municipioNome} direto no seu e-mail. Sem spam.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
              {/* Honeypot invisível para bots */}
              <input
                type="text"
                name="b_empresa_url"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div>
                <label
                  htmlFor="newsletter-email-input"
                  className="mb-1 block font-medium text-gray-700 text-xs"
                >
                  Seu e-mail
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="newsletter-email-input"
                    type="email"
                    required
                    placeholder="seu.email@exemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={status === "loading"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 text-xs placeholder:text-gray-400 focus:border-[oklch(0.55_0.11_250)] focus:outline-hidden focus:ring-1 focus:ring-[oklch(0.55_0.11_250)] disabled:bg-gray-50"
                  />
                </div>
              </div>

              {/* Mensagem de Erro */}
              {status === "error" && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-rose-800 text-xs">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[oklch(0.55_0.11_250)] px-4 py-2.5 font-medium text-white text-xs shadow-xs transition-colors hover:bg-[oklch(0.48_0.11_250)] disabled:opacity-60"
              >
                {status === "loading" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>Receber Alertas Cívicos</span>
                )}
              </button>
            </form>

            <p className="mt-3 text-center text-[10px] text-mutedText">
              Você pode cancelar a inscrição a qualquer momento com 1 clique no
              rodapé das mensagens.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
