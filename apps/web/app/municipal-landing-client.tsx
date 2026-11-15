"use client";

import { BProgress } from "@bprogress/core";
import type { PortalConfig } from "@transparencia/db";
import { ArrowRight, Landmark, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CityInterestBlock } from "../components/city-interest-block";

interface MunicipalLandingClientProps {
  portais: PortalConfig[];
}

function MunicipalLandingContent({ portais }: MunicipalLandingClientProps) {
  const router = useRouter();
  const pathname = usePathname();
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

        const targetSlug = (() => {
          if (preferred) {
            return portais.some((p) => p.portalSlug === preferred)
              ? preferred
              : null;
          }
          if (legacyMarker && portais.length === 1) {
            return portais[0].portalSlug;
          }
          return null;
        })();

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

    const targetUrl = `/${slug}`;
    if (pathname === targetUrl) {
      return;
    }

    BProgress.start();
    router.push(targetUrl);
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
          <p className="text-mute animate-pulse text-sm font-medium">
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
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg shadow-xs">
            {/* biome-ignore lint/performance/noImgElement: favicon svg brand */}
            <img
              src="/favicon.svg"
              alt="MaisTransparencia"
              className="h-full w-full object-contain"
            />
          </div>
          <div className="text-left">
            <span className="text-ink block text-xl leading-none font-bold sm:text-2xl">
              MaisTransparencia
            </span>
            <span className="text-mute mt-1 block text-[10px] font-semibold tracking-widest uppercase sm:text-xs">
              MONITORAMENTO CÍVICO INDEPENDENTE
            </span>
          </div>
        </div>

        <h1 className="mt-4">Selecione o Município</h1>
      </header>

      {/* Campo de Busca (apenas a partir de 5 cidades) */}
      {showSearch && (
        <div className="relative mx-auto mb-8 w-full max-w-xl">
          <div className="relative flex items-center">
            <Search className="text-mute pointer-events-none absolute left-4 h-4 w-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar município"
              aria-label="Buscar município"
              className="border-line bg-page text-ink placeholder:text-mute focus:border-brand focus:ring-brand/20 w-full rounded-lg border py-3 pr-20 pl-11 text-sm shadow-xs transition-colors focus:ring-2 focus:outline-none"
            />
            <span className="text-mute pointer-events-none absolute right-4 text-xs font-medium">
              {filteredPortais.length} de {portais.length}
            </span>
          </div>
        </div>
      )}

      {portais.length > 0 && (
        <h2 className="eyebrow mx-auto mb-3 w-full max-w-4xl">
          Já disponíveis
        </h2>
      )}

      {/* Grid de Municípios */}
      <section
        aria-label="Municípios disponíveis"
        className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2"
      >
        {filteredPortais.map((portal) => {
          const cityName = portal.displayName.replace(
            /^Prefeitura (Municipal )?de\s+/i,
            "",
          );
          const brasaoSrc = (() => {
            const asset = portal.brasaoAsset?.trim();
            if (!asset) return null;
            return asset.startsWith("/") ? asset : `/${asset}`;
          })();

          const tags = [
            "Orçamento",
            "Compras",
            "Contratos",
            portal.previdencia?.habilitado && portal.previdencia?.sigla
              ? `Previdência (${portal.previdencia.sigla})`
              : null,
          ].filter(Boolean) as string[];

          return (
            <Link
              key={portal.portalSlug}
              href={`/${portal.portalSlug}`}
              onClick={() => handleSelectPortal(portal.portalSlug)}
              className="group border-line bg-page hover:border-brand focus:ring-brand relative flex flex-col justify-between overflow-hidden rounded-3xl border text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus:ring-2 focus:ring-offset-2 focus:outline-none"
            >
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="border-line2 bg-page flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border p-2.5 shadow-2xs">
                    {brasaoSrc ? (
                      <Image
                        src={brasaoSrc}
                        alt={`Brasão oficial de ${cityName}`}
                        className="h-full w-full object-contain"
                        width={64}
                        height={64}
                      />
                    ) : (
                      <Landmark
                        aria-hidden="true"
                        strokeWidth={1.6}
                        className="text-mute h-8 w-8"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="group-hover:text-brand-text truncate transition-colors">
                      {cityName}
                    </h2>
                    <p className="text-mute mt-0.5 text-xs">
                      {portal.uf} • Prefeitura Municipal
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-line2/90 text-mute rounded-lg px-3 py-1 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-line2 bg-page flex items-center justify-between border-t px-6 py-4 sm:px-7">
                <span className="text-brand-text text-sm font-semibold">
                  Acessar portal
                </span>
                <div className="bg-brand-fill text-onink flex h-8 w-8 items-center justify-center rounded-full shadow-2xs transition-transform group-hover:scale-105">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Estado vazio quando busca não tem resultados */}
      {showSearch && filteredPortais.length === 0 && (
        <div className="border-line mx-auto w-full max-w-xl rounded-lg border border-dashed p-8 text-center">
          <p className="text-mute text-sm">
            Nenhum município encontrado para &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      )}

      <CityInterestBlock totalPortais={portais.length} />
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
