"use client";

import { ModalDialog } from "@transparencia/ui";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { ESTADOS_BRASILEIROS } from "../lib/estados-brasileiros";

export interface CityInterestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FieldName = "cidade" | "uf" | "email" | "consentimento";
type FieldErrors = Partial<Record<FieldName, string>>;
type SubmitStatus = "idle" | "loading" | "success";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FIELD_MESSAGES: Record<FieldName, string> = {
  cidade: "Informe o nome da sua cidade.",
  uf: "Escolha o estado da sua cidade.",
  email: "Confira o e-mail: falta o final, como .com.br.",
  consentimento: "Marque a caixa para concordar com o aviso por e-mail.",
};

const INPUT_CLASS =
  "min-h-11 w-full rounded-lg border border-borderLine bg-white px-3 text-base text-ink placeholder:text-subtleText focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 aria-[invalid=true]:border-rose-600 sm:text-sm";

function validate(values: {
  cidade: string;
  uf: string;
  email: string;
  consentimento: boolean;
}): FieldErrors {
  return {
    ...(values.cidade.trim().length < 2
      ? { cidade: FIELD_MESSAGES.cidade }
      : {}),
    ...(values.uf ? {} : { uf: FIELD_MESSAGES.uf }),
    ...(EMAIL_REGEX.test(values.email.trim())
      ? {}
      : { email: FIELD_MESSAGES.email }),
    ...(values.consentimento
      ? {}
      : { consentimento: FIELD_MESSAGES.consentimento }),
  };
}

function errorTypeFor(status: number): string {
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  return "validation";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-rose-700 text-xs">
      {message}
    </p>
  );
}

export function CityInterestModal({ isOpen, onClose }: CityInterestModalProps) {
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [email, setEmail] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [renderTime, setRenderTime] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [savedCity, setSavedCity] = useState({ cidade: "", uf: "" });
  const hasInteractedRef = useRef(false);

  // Eventos de analytics: nunca enviar e-mail nem o texto da cidade (apenas UF).
  const track = (eventName: string, properties?: Record<string, unknown>) => {
    try {
      posthog.capture(eventName, properties);
    } catch {}
  };

  const markInteracted = () => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    track("city_interest_form_started");
  };

  const handleClose = () => {
    track("city_interest_modal_closed", {
      state: status === "success" ? "success" : "form",
      hadInteraction: hasInteractedRef.current,
    });
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    setCidade("");
    setUf("");
    setEmail("");
    setConsentimento(false);
    setHoneypot("");
    setErrors({});
    setFormError("");
    setStatus("idle");
    setRenderTime(Date.now());
    hasInteractedRef.current = false;
    try {
      posthog.capture("city_interest_modal_opened");
    } catch {}
  }, [isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;

    const found = validate({ cidade, uf, email, consentimento });
    setErrors(found);
    setFormError("");
    if (Object.keys(found).length > 0) {
      track("city_interest_validation_failed", {
        fields: Object.keys(found),
      });
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/city-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cidade: cidade.trim(),
          uf,
          email: email.trim(),
          consentimento,
          b_empresa_url: honeypot,
          clientRenderTime: renderTime,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStatus("idle");
        track("city_interest_submit_failed", {
          status: res.status,
          errorType: errorTypeFor(res.status),
        });
        setErrors((data.fieldErrors as FieldErrors | undefined) ?? {});
        setFormError(
          data.error || "Não foi possível registrar o pedido. Tente novamente.",
        );
        return;
      }

      setSavedCity({ cidade: cidade.trim(), uf });
      setStatus("success");
      track("city_interest_submitted", { uf });
    } catch {
      setStatus("idle");
      track("city_interest_submit_failed", {
        status: 0,
        errorType: "network_error",
      });
      setFormError("Erro de conexão. Tente novamente.");
    }
  };

  const describedBy = (field: FieldName) =>
    errors[field] ? `city-interest-${field}-error` : undefined;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Avise-me quando minha cidade chegar"
      maxWidth="md"
      showShareButton={false}
    >
      {status === "success" ? (
        <div role="status" className="py-2 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="font-semibold text-ink text-lg">
            Pronto, avisaremos você
          </h3>
          <p className="mt-2 text-slate-700 text-sm leading-relaxed">
            Anotamos {savedCity.cidade} ({savedCity.uf}). Quando ela entrar no
            portal, você recebe um e-mail.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-6 min-h-11 w-full rounded-lg bg-accent px-4 font-semibold text-sm text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Voltar para a lista de cidades
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
              htmlFor="city-interest-cidade"
              className="mb-1 block font-medium text-ink text-sm"
            >
              Cidade
            </label>
            <input
              id="city-interest-cidade"
              type="text"
              autoComplete="address-level2"
              value={cidade}
              onChange={(e) => {
                markInteracted();
                setCidade(e.target.value);
              }}
              aria-invalid={errors.cidade ? true : undefined}
              aria-describedby={describedBy("cidade")}
              className={INPUT_CLASS}
            />
            <FieldError
              id="city-interest-cidade-error"
              message={errors.cidade}
            />
          </div>

          <div>
            <label
              htmlFor="city-interest-uf"
              className="mb-1 block font-medium text-ink text-sm"
            >
              Estado
            </label>
            <select
              id="city-interest-uf"
              autoComplete="address-level1"
              value={uf}
              onChange={(e) => {
                markInteracted();
                setUf(e.target.value);
              }}
              aria-invalid={errors.uf ? true : undefined}
              aria-describedby={describedBy("uf")}
              className={INPUT_CLASS}
            >
              <option value="">Selecione o estado</option>
              {ESTADOS_BRASILEIROS.map((estado) => (
                <option key={estado.uf} value={estado.uf}>
                  {estado.nome} ({estado.uf})
                </option>
              ))}
            </select>
            <FieldError id="city-interest-uf-error" message={errors.uf} />
          </div>

          <div>
            <label
              htmlFor="city-interest-email"
              className="mb-1 block font-medium text-ink text-sm"
            >
              E-mail
            </label>
            <input
              id="city-interest-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => {
                markInteracted();
                setEmail(e.target.value);
              }}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={describedBy("email")}
              className={INPUT_CLASS}
            />
            <FieldError id="city-interest-email-error" message={errors.email} />
          </div>

          <div>
            <div className="flex items-start gap-3">
              <input
                id="city-interest-consentimento"
                type="checkbox"
                checked={consentimento}
                onChange={(e) => {
                  markInteracted();
                  setConsentimento(e.target.checked);
                }}
                aria-invalid={errors.consentimento ? true : undefined}
                aria-describedby={describedBy("consentimento")}
                className="mt-0.5 h-5 w-5 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              />
              <label
                htmlFor="city-interest-consentimento"
                className="min-h-6 text-slate-700 text-sm leading-snug"
              >
                Concordo em receber este aviso por e-mail. Meus dados são usados
                só para isso, conforme a{" "}
                <Link
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline underline-offset-2"
                >
                  Política de Privacidade
                </Link>
              </label>
            </div>
            <FieldError
              id="city-interest-consentimento-error"
              message={errors.consentimento}
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-rose-800 text-sm"
            >
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={status === "loading"}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 font-semibold text-sm text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {status === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Enviando...</span>
              </>
            ) : (
              <span>Quero ser avisado</span>
            )}
          </button>
        </form>
      )}
    </ModalDialog>
  );
}
