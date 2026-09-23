import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { SocialLinks } from "./social-links";

export interface GlobalFooterProps {
  portalName?: string;
  officialPortalUrl?: string;
}

export function GlobalFooter({
  portalName = "Município",
  officialPortalUrl,
}: GlobalFooterProps) {
  const normalizedUrl = (() => {
    if (!officialPortalUrl) return null;
    if (
      officialPortalUrl.startsWith("http://") ||
      officialPortalUrl.startsWith("https://")
    ) {
      return officialPortalUrl;
    }
    return `https://${officialPortalUrl}`;
  })();

  return (
    <footer className="mt-auto border-borderLine border-t bg-white/60 px-4 pt-6 pb-20 sm:px-6 md:px-10 md:pb-6">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="font-bold font-serif text-slate-800 text-xs">
            MaisTransparencia — {portalName}
          </p>
          <p className="text-[11px] text-mutedText">
            Plataforma cívica independente de controle social e auditoria fiscal
            das contas públicas municipais.
          </p>
          <nav aria-label="Links institucionais" className="flex gap-3 pt-0.5">
            <Link
              href="/termos"
              className="text-[11px] text-mutedText hover:underline"
            >
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="text-[11px] text-mutedText hover:underline"
            >
              Política de Privacidade
            </Link>
          </nav>
          {normalizedUrl && (
            <a
              href={normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[11px] text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Acessar portal oficial da prefeitura</span>
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <span className="font-medium text-[11px] text-mutedText">
            Acompanhe o projeto
          </span>
          <SocialLinks showLabel />
        </div>
      </div>
    </footer>
  );
}
