"use client";

import {
  BrandLogo,
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
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { botaoPrimario } from "./botoes-acao";
import { FeedbackModal } from "./feedback-modal";
import { NewsletterModal } from "./newsletter-modal";
import { PushNotificationSettings } from "./push-notification-settings";
import { PwaInstallButton, usePwaInstallAvailability } from "./pwa-installer";
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
  "rounded-sm text-mute2 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2";

export function GlobalFooter({
  portalName = "Município",
  officialPortalUrl,
  lastExtractionDate,
  portalSlug,
  stateUF,
  portais,
}: GlobalFooterProps) {
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const pathname = usePathname();
  const canInstallApp = usePwaInstallAvailability();

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

  const { isSupported: isPushSupported } = usePushNotifications({
    portalSlug: effectivePortalSlug ?? "",
  });
  const hasPushControls = Boolean(effectivePortalSlug) && isPushSupported;
  const hasDeviceColumn = hasPushControls || canInstallApp;

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
      className="text-brand-text hover:text-ink focus-visible:outline-ink inline-flex items-center gap-0.5 rounded-sm font-medium underline underline-offset-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
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
          "footer-surface border-footer-line mt-auto border-t-2",
          activePortal
            ? "pb-[calc(env(safe-area-inset-bottom,0px)+9rem)] md:pb-0"
            : "pb-[calc(env(safe-area-inset-bottom,0px)+2rem)] md:pb-0",
        )}
      >
        <div className="mx-auto max-w-[1120px] px-4 sm:px-6 md:px-10">
          {/* Marca e fonte, neste dispositivo (só com conteúdo) e alertas */}
          <div
            className={cn(
              "grid grid-cols-1 gap-8 py-8 sm:gap-6",
              hasDeviceColumn ? "sm:grid-cols-3" : "sm:grid-cols-2",
            )}
          >
            <div className="min-w-0 space-y-2">
              <p className="text-ink flex items-center gap-2 font-serif text-base leading-tight font-bold">
                <BrandLogo className="h-6 w-6 shrink-0" />
                {env.NEXT_PUBLIC_PROJECT_NAME}
              </p>
              {!isRootPage && effectivePortalName && (
                <p className="text-mute text-xs">
                  {effectivePortalName}
                  {effectiveStateUF && (
                    <span className="text-mute2"> / {effectiveStateUF}</span>
                  )}
                </p>
              )}
              <p className="text-mute2 text-xs leading-relaxed">
                Iniciativa livre e apartidária, sem vínculo com a administração
                municipal. Reúne dados de fontes públicas oficiais para você
                acompanhar o que a prefeitura faz pela cidade.
              </p>
            </div>

            {hasDeviceColumn && (
              <div className="sm:border-line min-w-0 space-y-3 sm:border-l sm:pl-6">
                <p className="text-ink text-xs font-semibold">
                  Neste dispositivo
                </p>
                {effectivePortalSlug && (
                  <PushNotificationSettings portalSlug={effectivePortalSlug} />
                )}
                <PwaInstallButton variant="footer" />
              </div>
            )}

            <div className="sm:border-line min-w-0 space-y-3 sm:border-l sm:pl-6">
              <p className="text-ink text-xs font-semibold">Alertas</p>
              <button
                type="button"
                onClick={() => setIsNewsletterOpen(true)}
                className={`${botaoPrimario} w-full`}
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Receber alertas por e-mail
              </button>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute2 text-xs">Acompanhe o projeto</span>
                <SocialLinks showLabel={false} />
              </div>
            </div>
          </div>

          {/* Barra inferior: procedência dos dados + links legais */}
          <div className="border-line flex flex-col gap-3 border-t py-4 text-xs sm:flex-row sm:items-center sm:justify-between">
            {!isRootPage && (displayExtractionDate || officialLink) ? (
              <p className="text-mute2 flex items-start gap-2 leading-relaxed">
                <span
                  className="bg-ok-fill mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  aria-hidden="true"
                />
                <span>
                  {displayExtractionDate ? (
                    <>
                      Dados extraídos em{" "}
                      <time
                        dateTime={effectiveExtractionDate}
                        className="text-mute font-medium tabular-nums"
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
              <p className="text-mute2 text-xs leading-relaxed">
                Dados públicos auditados segundo a{" "}
                <a
                  href={urlLegislacao("lai")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink underline"
                >
                  Lei de Acesso à Informação (Lei nº 12.527/2011)
                </a>{" "}
                e a{" "}
                <a
                  href={urlLegislacao("lrf")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink underline"
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
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(true)}
                className={`cursor-pointer ${linkClass}`}
              >
                Sugestão ou erro
              </button>
              <Link href="/termos" className={linkClass}>
                Termos de uso
              </Link>
              <Link href="/privacidade" className={linkClass}>
                Privacidade
              </Link>
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

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        portalSlug={effectivePortalSlug}
        municipioNome={effectivePortalName}
      />
    </>
  );
}
