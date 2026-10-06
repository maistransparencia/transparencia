"use client";

import {
  cn,
  fmtDate,
  type PortalOption,
  resolvePortalSlug,
} from "@transparencia/ui";
import { ArrowUpRight, Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  portais?: PortalOption[];
}

const linkClass =
  "rounded-sm text-mutedText transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40";

export function GlobalFooter({
  portalName = "Município",
  officialPortalUrl,
  lastExtractionDate,
  portalSlug = "porciuncula_prefeitura",
  stateUF = "RJ",
  portais,
}: GlobalFooterProps) {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const pathname = usePathname();

  const segments = (pathname || "").split("/").filter(Boolean);
  const isRootPage = !pathname || pathname === "/";

  const activePortal = (() => {
    if (isRootPage) {
      return undefined;
    }
    if (segments.length > 0) {
      const first = segments[0];
      return portais?.find(
        (p) =>
          p.portalSlug === first || p.portalSlug === resolvePortalSlug(first),
      );
    }
    return undefined;
  })();

  const effectivePortalName =
    activePortal?.displayName || (isRootPage ? undefined : portalName);
  const effectivePortalUrl =
    activePortal?.portalUrl || (isRootPage ? undefined : officialPortalUrl);
  const effectivePortalSlug =
    activePortal?.portalSlug || (isRootPage ? undefined : portalSlug);
  const effectiveStateUF =
    activePortal?.uf || (isRootPage ? undefined : stateUF);
  const effectiveExtractionDate =
    activePortal?.dataExtracao || (isRootPage ? undefined : lastExtractionDate);

  const normalizedUrl = effectivePortalUrl
    ? /^https?:\/\//.test(effectivePortalUrl)
      ? effectivePortalUrl
      : `https://${effectivePortalUrl}`
    : null;

  const displayExtractionDate = effectiveExtractionDate
    ? fmtDate(effectiveExtractionDate)
    : null;

  const officialLink = !isRootPage && normalizedUrl && (
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
      <footer
        className={cn(
          "mt-auto border-borderLine border-t bg-white/60",
          activePortal
            ? "pb-[calc(env(safe-area-inset-bottom,0px)+9rem)] md:pb-0"
            : "pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] md:pb-0",
        )}
      >
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 md:px-10">
          {/* Bloco principal */}
          <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
            <div className="max-w-md space-y-2">
              <div className="flex items-baseline gap-x-2">
                <p className="font-bold font-serif text-base text-slate-800 leading-tight">
                  {env.NEXT_PUBLIC_PROJECT_NAME}
                </p>
                {!isRootPage && effectivePortalName && (
                  <p className="text-slate-600 text-xs">
                    {effectivePortalName}
                    {effectiveStateUF && (
                      <span className="text-mutedText">
                        {" "}
                        / {effectiveStateUF}
                      </span>
                    )}
                  </p>
                )}
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
            {!isRootPage && (displayExtractionDate || officialLink) ? (
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
                        dateTime={effectiveExtractionDate}
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
            ) : (
              <p className="text-mutedText text-xs leading-relaxed">
                Dados públicos auditados segundo a{" "}
                <a
                  href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  Lei de Acesso à Informação (Lei nº 12.527/2011)
                </a>{" "}
                e a{" "}
                <a
                  href="https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp101.htm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-ink"
                >
                  Lei de Responsabilidade Fiscal (LC nº 101/2000)
                </a>
                .
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
        portalSlug={effectivePortalSlug}
        municipioNome={effectivePortalName}
        stateUF={effectiveStateUF}
      />
    </>
  );
}
