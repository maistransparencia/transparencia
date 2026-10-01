import { permanentRedirect } from "next/navigation";

export default async function CapremRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ portalSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { portalSlug } = await params;
  const sParams = (await searchParams) ?? {};
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(sParams)) {
    if (typeof v === "string") {
      sp.set(k, v);
    } else if (Array.isArray(v)) {
      for (const val of v) {
        sp.append(k, val);
      }
    }
  }
  const qs = sp.toString();
  permanentRedirect(`/${portalSlug}/previdencia${qs ? `?${qs}` : ""}`);
}
