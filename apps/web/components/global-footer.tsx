"use client";

import { fmtDate } from "@transparencia/ui";
import { ArrowUpRight, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { env } from "@/env";
import { NewsletterModal } from "./newsletter-modal";
import { PwaInstallButton } from "./pwa-installer";
import { SocialLinks } from "./social-links";

export interface GlobalFooterProps {
  portalName?: string;
  officialPortalUrl?: string;
  lastExtractionDate?: string;
  portalSlug?: string;
  stateUF?: string;
}

const linkClass =
  "rounded-sm text-mutedText transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

export function GlobalFooter({
  portalName = "Município",
  officialPortalUrl,
  lastExtractionDate,
  portalSlug = "porciuncula_prefeitura",
  stateUF = "RJ",
}: GlobalFooterProps) {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

  const normalizedUrl = officialPortalUrl
    ? /^https?:\/\//.test(officialPortalUrl)
      ? officialPortalUrl
      : `https://${officialPortalUrl}`
    : null;

  const displayExtractionDate = lastExtractionDate
    ? fmtDate(lastExtractionDate)
    : null;

  const officialLink = normalizedUrl && (
    <a
      href={normalizedUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 rounded-sm font-medium text-blue-600 underline decoration-blue-600/30 underline-offset-2 transition-colors hover:text-blue-800 hover:decoration-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      portal oficial
      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  );

  return (
    <>
      <footer className="mt-auto border-borderLine border-t bg-white/60 pb-20 md:pb-0">
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 md:px-10">
          {/* Bloco principal */}
          <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <div className="max-w-md space-y-2">
              <div className="flex items-baseline gap-x-2">
                <p className="font-bold font-serif text-base text-slate-800 leading-tight">
                  {env.NEXT_PUBLIC_PROJECT_NAME}
                </p>
                <p className="text-slate-600 text-xs">
                  {portalName}
                  <span className="text-mutedText"> / {stateUF}</span>
                </p>
              </div>
              <p className="pt-1 text-mutedText text-xs leading-relaxed">
                Plataforma cívica independente de controle social e auditoria
                fiscal das contas públicas municipais.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:items-end">
              <button
                type="button"
                onClick={() => setIsNewsletterOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 font-medium text-sm text-white transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 active:scale-[0.99] sm:w-auto sm:py-2"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Receber alertas por e-mail
              </button>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-mutedText text-xs">
                  Acompanhe o projeto
                </span>
                <SocialLinks showLabel={false} />
              </div>
            </div>
          </div>

          {/* Barra inferior: procedência dos dados + links legais */}
          <div className="flex flex-col gap-3 border-borderLine border-t py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
            {(displayExtractionDate || officialLink) && (
              <p className="flex items-start gap-2 text-mutedText leading-relaxed">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                <span>
                  {displayExtractionDate ? (
                    <>
                      Dados extraídos em{" "}
                      <time
                        dateTime={lastExtractionDate}
                        className="font-medium text-slate-600 tabular-nums"
                      >
                        {displayExtractionDate}
                      </time>
                      {officialLink && <> do {officialLink}</>}
                    </>
                  ) : (
                    <>Fonte: {officialLink}</>
                  )}
                </span>
              </p>
            )}

            <nav
              aria-label="Links institucionais"
              className="flex flex-wrap items-center gap-x-4 gap-y-2"
            >
              <Link href="/termos" className={linkClass}>
                Termos de uso
              </Link>
              <Link href="/privacidade" className={linkClass}>
                Privacidade
              </Link>
              <PwaInstallButton className={`cursor-pointer ${linkClass}`} />
            </nav>
          </div>
        </div>
      </footer>

      <NewsletterModal
        isOpen={isNewsletterOpen}
        onClose={() => setIsNewsletterOpen(false)}
        portalSlug={portalSlug}
        municipioNome={portalName}
        stateUF={stateUF}
      />
    </>
  );
}
