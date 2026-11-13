"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const PORTAL_SLUG_PATTERN = /^[a-z0-9_]+$/;

function readLastPortalSlug(): string | null {
  try {
    const cookie = document.cookie
      .split("; ")
      .find((item) => item.startsWith("preferred_portal="));
    const slug =
      cookie?.split("=")[1] ?? window.localStorage.getItem("preferred_portal");
    return slug && PORTAL_SLUG_PATTERN.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

/**
 * Links das páginas por município para páginas globais (termos, privacidade).
 * Usam o município do último contexto; sem ele, levam à lista de portais.
 */
export function PortalPagesLinks() {
  const [portalSlug, setPortalSlug] = useState<string | null>(null);

  useEffect(() => {
    setPortalSlug(readLastPortalSlug());
  }, []);

  const base = portalSlug ? `/${portalSlug}` : null;
  return (
    <p className="text-mute2 text-sm" data-testid="portal-pages-links">
      Veja também{" "}
      {base ? (
        <>
          <Link href={`${base}/metodologia`}>Metodologia e fontes</Link> e{" "}
          <Link href={`${base}/sobre`}>Sobre</Link>.
        </>
      ) : (
        <>
          a Metodologia e fontes e o Sobre do seu município:{" "}
          <Link href="/?mudar=true">escolha um município</Link>.
        </>
      )}
    </p>
  );
}
