"use client";

import type { PortalConfig } from "@transparencia/db";
import { ArrowRight, Search } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect, useMemo, useState } from "react";

interface MunicipalLandingClientProps {
  portais: PortalConfig[];
}

function MunicipalLandingContent({ portais }: MunicipalLandingClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const skipRedirect =
          searchParams?.get("select") === "true" ||
          searchParams?.get("mudar") === "true";

        if (skipRedirect) return;

        const preferred = window.localStorage.getItem("preferred_portal");
        const legacyMarker =
          window.localStorage.getItem("last_seen_extraction") ||
          window.localStorage.getItem("pwa_installed");

        const targetSlug =
          preferred && portais.some((p) => p.portalSlug === preferred)
            ? preferred
            : legacyMarker
              ? "porciuncula_prefeitura"
              : null;

        if (targetSlug) {
          // biome-ignore lint/suspicious/noDocumentCookie: cookie de preferencia do portal
          document.cookie = `preferred_portal=${targetSlug}; path=/; max-age=31536000; SameSite=Lax`;
          try {
            window.localStorage.setItem("preferred_portal", targetSlug);
          } catch {}

          setIsRedirecting(true);
          window.location.replace(`/${targetSlug}`);
        }
      }
    } catch {
      // Fallback gracioso se acesso ao storage estiver restrito
    }
  }, [searchParams, portais]);

  const handleSelectPortal = (slug: string) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("preferred_portal", slug);
        // biome-ignore lint/suspicious/noDocumentCookie: cookie de preferencia do portal
        document.cookie = `preferred_portal=${slug}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}

    try {
      posthog.capture("portal_selected_landing", {
        portal_slug: slug,
      });
    } catch {}

    router.push(`/${slug}`);
  };

  const filteredPortais = useMemo(() => {
    if (!searchQuery.trim() || portais.length < 5) {
      return portais;
    }
    const cleanQuery = searchQuery
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    return portais.filter((portal) => {
      const name = portal.displayName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const slug = portal.portalSlug.toLowerCase();
      const city = (portal.cidadeClean || "").toLowerCase();

      return (
        name.includes(cleanQuery) ||
        slug.includes(cleanQuery) ||
        city.includes(cleanQuery)
      );
    });
  }, [portais, searchQuery]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="text-center">
          <p className="animate-pulse font-medium text-sm text-subtleText">
            Redirecionando para o seu município de preferência...
          </p>
        </div>
      </div>
    );
  }

  const showSearch = portais.length >= 5;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center py-8 sm:py-14">
      {/* Brand Header */}
      <header className="mb-8 text-center">
        <div className="mb-5 flex items-center justify-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl shadow-xs">
            {/* biome-ignore lint/performance/noImgElement: favicon svg brand */}
            <img
              src="/favicon.svg"
              alt="MaisTransparencia"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-left">
            <span className="block font-bold text-ink text-xl leading-none sm:text-2xl">
              MaisTransparencia
            </span>
            <span className="mt-1 block font-semibold text-[10px] text-subtleText uppercase tracking-widest sm:text-xs">
              MONITORAMENTO CÍVICO INDEPENDENTE
            </span>
          </div>
        </div>

        <h1 className="mt-4 font-bold font-serif text-4xl text-ink tracking-tight sm:text-5xl">
          Selecione o Município
        </h1>
      </header>

      {/* Campo de Busca (apenas a partir de 5 cidades) */}
      {showSearch && (
        <div className="relative mx-auto mb-8 w-full max-w-xl">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-4 h-4 w-4 text-subtleText" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar município"
              aria-label="Buscar município"
              className="w-full rounded-2xl border border-borderLine bg-white py-3 pr-20 pl-11 text-ink text-sm shadow-xs transition-colors placeholder:text-subtleText focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
            <span className="pointer-events-none absolute right-4 font-medium text-subtleText text-xs">
              {filteredPortais.length} de {portais.length}
            </span>
          </div>
        </div>
      )}

      {/* Grid de Municípios */}
      <section
        aria-label="Municípios disponíveis"
        className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2"
      >
        {filteredPortais.map((portal) => {
          const cityName = portal.displayName.replace(/^Prefeitura de\s+/i, "");
          const brasaoSrc = portal.brasaoAsset.startsWith("/")
            ? portal.brasaoAsset
            : `/${portal.brasaoAsset}`;

          const tags = [
            "Orçamento",
            "Compras",
            "Contratos",
            portal.previdencia?.habilitado && portal.previdencia?.sigla
              ? `Previdência (${portal.previdencia.sigla})`
              : null,
          ].filter(Boolean) as string[];

          return (
            <button
              key={portal.portalSlug}
              type="button"
              onClick={() => handleSelectPortal(portal.portalSlug)}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-borderLine bg-cardBg text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-canvas p-2.5 shadow-2xs">
                    {/* biome-ignore lint/performance/noImgElement: brasao asset */}
                    <Image
                      src={brasaoSrc}
                      alt={`Brasão oficial de ${cityName}`}
                      className="h-full w-full object-contain"
                      width={64}
                      height={64}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold font-serif text-2xl text-ink tracking-tight transition-colors group-hover:text-accent">
                      {cityName}
                    </h2>
                    <p className="mt-0.5 text-subtleText text-xs">
                      {portal.uf} • Prefeitura Municipal
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-slate-100/90 px-3 py-1 font-medium text-slate-600 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-slate-100 border-t bg-cardBg px-6 py-4 sm:px-7">
                <span className="font-semibold text-accent text-sm">
                  Acessar portal
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white shadow-2xs transition-transform group-hover:scale-105">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Estado vazio quando busca não tem resultados */}
      {showSearch && filteredPortais.length === 0 && (
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-borderLine border-dashed p-8 text-center">
          <p className="text-sm text-subtleText">
            Nenhum município encontrado para &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}

export function MunicipalLandingClient(props: MunicipalLandingClientProps) {
  return (
    <Suspense fallback={null}>
      <MunicipalLandingContent {...props} />
    </Suspense>
  );
}
