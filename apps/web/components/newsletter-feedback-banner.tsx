"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import type React from "react";

interface BannerConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

function getBannerConfig(status: string): BannerConfig | null {
  if (status === "confirmed") {
    return {
      icon: CheckCircle2,
      title: "Inscrição confirmada com sucesso!",
      description:
        "Você agora receberá resumos periódicos e alertas cívicos sobre as contas públicas.",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      textColor: "text-emerald-950",
    };
  }

  if (status === "unsubscribed") {
    return {
      icon: Info,
      title: "Inscrição cancelada com sucesso.",
      description: "Você não receberá mais os informativos por e-mail.",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-900",
    };
  }

  if (
    status === "invalid_token" ||
    status === "missing_token" ||
    status === "error"
  ) {
    return {
      icon: AlertCircle,
      title: "Não foi possível validar a solicitação.",
      description:
        "O link pode ter expirado ou ser inválido. Por favor, tente se inscrever novamente.",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-200",
      textColor: "text-rose-950",
    };
  }

  return null;
}

export function NewsletterFeedbackBanner() {
  const [newsletterStatus, setNewsletterStatus] = useQueryState(
    "newsletter",
    parseAsString.withOptions({ shallow: true }),
  );

  if (!newsletterStatus) {
    return null;
  }

  const config = getBannerConfig(newsletterStatus);
  if (!config) {
    return null;
  }

  const Icon = config.icon;

  const handleDismiss = () => {
    setNewsletterStatus(null);
  };

  return (
    <div
      role="alert"
      className={`flex items-center justify-between border-b px-4 py-2.5 text-xs shadow-xs ${config.bgColor} ${config.borderColor} ${config.textColor}`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0" />
        <div>
          <span className="font-semibold">{config.title}</span>{" "}
          <span className="opacity-90">{config.description}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Fechar notificação"
        className="ml-3 rounded p-1 opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
