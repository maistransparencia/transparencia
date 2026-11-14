import { getPortalSlugs } from "@transparencia/db";
import { SectionHeader } from "@transparencia/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeiLink } from "@/components/lei-e-fonte";
import { PageEyebrow } from "@/components/page-eyebrow";
import { createPortalMetadata } from "@/lib/metadata";
import { loadMetodologiaData } from "./loader";
import { buildMetodologiaViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface MetodologiaPageProps {
  params: Promise<{ portalSlug: string }>;
}

const capitalizeFirstLetter = (texto: string) =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export async function generateMetadata({
  params,
}: MetodologiaPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Metodologia e fontes", portalSlug, {
    description:
      "De onde vêm os números do portal, o que ele ainda não cobre e o que promete.",
    path: "/metodologia",
    keywords: ["metodologia", "fontes dos dados", "transparência"],
  });
}

export default async function MetodologiaPage({
  params,
}: MetodologiaPageProps) {
  const { portalSlug } = await params;
  if (!(await getPortalSlugs()).includes(portalSlug)) notFound();
  const { fontes, cobertura, lacunas, divergencias } =
    buildMetodologiaViewModel(await loadMetodologiaData(portalSlug));

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <PageEyebrow>Transparência</PageEyebrow>
        <h1>Metodologia e fontes</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          De onde vêm os números, o que este portal ainda não cobre e o que ele
          promete.
        </p>
      </div>

      <section className="space-y-4">
        <SectionHeader
          title="De onde vêm os números?"
          description="Os números vêm de fontes oficiais e públicas, listadas abaixo."
        />
        {fontes.length === 0 ? (
          <p className="text-mute2 text-sm">Fontes ainda não disponíveis.</p>
        ) : (
          <ul className="border-line border-t" data-testid="metodologia-fontes">
            {fontes.map((fonte) => (
              <li
                key={fonte.fonte}
                className="border-line2 space-y-1 border-b py-3"
              >
                <span className="block">
                  {capitalizeFirstLetter(fonte.descricao)}
                </span>
                {fonte.fonteOficial && (
                  <p className="caption">
                    <strong>Fonte oficial:</strong>{" "}
                    {fonte.fonteOficial.url ? (
                      <LeiLink
                        label={fonte.fonteOficial.nome}
                        url={fonte.fonteOficial.url}
                      />
                    ) : (
                      fonte.fonteOficial.nome
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-mute2 text-sm" data-testid="metodologia-cobertura">
          {cobertura}{" "}
          <Link href={`/${portalSlug}/como-atualizamos`}>
            Ver quando buscamos cada fonte
          </Link>
          .
        </p>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="O que o portal ainda não cobre?"
          description="Limites que o cidadão precisa conhecer para ler os números."
        />
        {lacunas.length === 0 ? (
          <p className="text-mute2 text-sm">
            Nenhuma lacuna conhecida no momento.
          </p>
        ) : (
          <ul className="space-y-3" data-testid="metodologia-lacunas">
            {lacunas.map((lacuna) => (
              <li key={lacuna.codigo}>{lacuna.textoCidadao}</li>
            ))}
          </ul>
        )}
      </section>

      {divergencias.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Onde o número pode diferir de outra publicação oficial?"
            description="Casos em que o valor mostrado aqui pode não bater com outro documento público."
          />
          <ul className="space-y-3" data-testid="metodologia-divergencias">
            {divergencias.map((divergencia) => (
              <li key={divergencia.codigo}>{divergencia.textoCidadao}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <SectionHeader
          title="O que o portal promete?"
          description="Compromissos que dá para conferir no código aberto."
        />
        <ul className="space-y-3" data-testid="metodologia-promessas">
          <li>
            O texto e o e-mail que você escreve em "Sugestão ou erro" não vão
            para a ferramenta que mede o uso do site.
          </li>
          <li>
            "Sugestão ou erro" guarda seu relato com a página em que você
            estava. Não é um processo formal de resposta.
          </li>
        </ul>
      </section>
    </div>
  );
}
