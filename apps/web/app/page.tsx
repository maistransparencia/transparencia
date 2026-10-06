import { getAllPortais } from "@transparencia/db";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { version } from "../package.json";
import { MunicipalLandingClient } from "./municipal-landing-client";

const getCachedAllPortais = unstable_cache(
  () => getAllPortais(),
  [`all-portais-v${version}`],
  { revalidate: 86400, tags: ["all-portais", "portal-data"] },
);

interface RootPageProps {
  searchParams?: Promise<{ select?: string; mudar?: string }>;
}

export default async function RootPage({ searchParams }: RootPageProps) {
  const [cookieStore, resolvedParams, portais] = await Promise.all([
    cookies(),
    searchParams
      ? searchParams
      : Promise.resolve({} as { select?: string; mudar?: string }),
    getCachedAllPortais(),
  ]);

  const skipRedirect =
    resolvedParams?.select === "true" || resolvedParams?.mudar === "true";
  const preferred = cookieStore.get("preferred_portal")?.value;

  if (
    !skipRedirect &&
    preferred &&
    portais.some((p) => p.portalSlug === preferred)
  ) {
    redirect(`/${preferred}`);
  }

  return <MunicipalLandingClient portais={portais} />;
}
