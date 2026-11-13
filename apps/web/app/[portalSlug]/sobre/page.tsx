import type { Metadata } from "next";
import Link from "next/link";
import { PageEyebrow } from "@/components/page-eyebrow";
import { createPortalMetadata } from "@/lib/metadata";

export const dynamic = "force-static";

interface SobrePageProps {
  params: Promise<{ portalSlug: string }>;
}

export async function generateMetadata({
  params,
}: SobrePageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Sobre", portalSlug, {
    description:
      "O que é o portal, a quem serve e onde conferir de onde vêm os números.",
    path: "/sobre",
    keywords: ["sobre", "transparência", "controle social"],
  });
}

export default async function SobrePage({ params }: SobrePageProps) {
  const { portalSlug } = await params;
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <PageEyebrow>Transparência</PageEyebrow>
        <h1>Sobre</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          Este portal ajuda o cidadão a entender como o dinheiro público do
          município é arrecadado e gasto, a partir de fontes oficiais.
        </p>
      </div>

      <section className="space-y-3">
        <h2>De onde vêm os números?</h2>
        <p>
          De fontes oficiais e públicas. Veja a lista, o que o portal ainda não
          cobre e o que ele promete em{" "}
          <Link href={`/${portalSlug}/metodologia`}>Metodologia e fontes</Link>.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Quando os dados foram buscados?</h2>
        <p>
          A página{" "}
          <Link href={`/${portalSlug}/como-atualizamos`}>Como atualizamos</Link>{" "}
          mostra o dia em que o portal foi buscar cada fonte.
        </p>
      </section>

      <section className="space-y-3">
        <h2>Encontrou um erro?</h2>
        <p>
          Use "Sugestão ou erro", no rodapé de qualquer página. Informe o que
          viu e, se quiser, seu e-mail.
        </p>
      </section>
    </div>
  );
}
