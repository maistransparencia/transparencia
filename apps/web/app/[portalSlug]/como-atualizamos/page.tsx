import { AlertBox, Badge, SectionHeader } from "@transparencia/ui";
import type { Metadata } from "next";
import { LeiLink } from "@/components/lei-e-fonte";
import { PageEyebrow } from "@/components/page-eyebrow";
import { createPortalMetadata } from "@/lib/metadata";
import { loadComoAtualizamosData } from "./loader";
import { buildComoAtualizamosViewModel } from "./view-model";

export const dynamic = "force-dynamic";

interface ComoAtualizamosPageProps {
  params: Promise<{ portalSlug: string }>;
}

function FonteOficial({
  fonteOficial,
}: {
  fonteOficial: { nome: string; url: string | null } | null;
}) {
  if (!fonteOficial) return null;
  return (
    <p className="caption">
      <strong>Fonte oficial:</strong>{" "}
      {fonteOficial.url ? (
        <LeiLink label={fonteOficial.nome} url={fonteOficial.url} />
      ) : (
        fonteOficial.nome
      )}
    </p>
  );
}

const capitalizeFirstLetter = (texto: string) =>
  texto.charAt(0).toUpperCase() + texto.slice(1);

export async function generateMetadata({
  params,
}: ComoAtualizamosPageProps): Promise<Metadata> {
  const { portalSlug } = await params;
  return createPortalMetadata("Como atualizamos", portalSlug, {
    description:
      "De onde vêm os números do portal e quando fomos buscá-los em cada fonte oficial.",
    path: "/como-atualizamos",
    keywords: ["fontes dos dados", "como atualizamos", "transparência"],
  });
}

export default async function ComoAtualizamosPage({
  params,
}: ComoAtualizamosPageProps) {
  const { portalSlug } = await params;
  const { acompanhadas, semAcompanhamento, avisoTopo } =
    buildComoAtualizamosViewModel(await loadComoAtualizamosData(portalSlug));

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <PageEyebrow>Transparência</PageEyebrow>
        <h1>Como atualizamos</h1>
        <p className="text-mute2 text-sm leading-relaxed">
          De onde vêm os números deste portal e quando fomos buscá-los em cada
          fonte oficial. A data mostra o dia em que o portal verificou a fonte,
          não o dia em que a Prefeitura publicou o dado.
        </p>
      </div>

      {avisoTopo && (
        <AlertBox type="info" title="Fonte sem verificação no prazo">
          {avisoTopo}
        </AlertBox>
      )}

      {acompanhadas.length === 0 && semAcompanhamento.length === 0 && (
        <p className="text-mute2 text-sm" data-testid="como-atualizamos-neutro">
          Ainda não acompanhamos a data de atualização das fontes deste portal.
        </p>
      )}

      {acompanhadas.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Fontes que acompanhamos"
            description="Para estas fontes, o portal registra o dia em que foi buscar os dados."
          />
          <ul
            className="grid gap-x-8 gap-y-6 sm:grid-cols-2"
            data-testid="como-atualizamos-fontes"
          >
            {acompanhadas.map((fonte) => (
              <li
                key={fonte.fonte}
                className="panel panel-top flex flex-col gap-3"
              >
                <div className="space-y-2">
                  <Badge variant={fonte.etiqueta.variante}>
                    {fonte.etiqueta.texto}
                  </Badge>
                  <h3>{capitalizeFirstLetter(fonte.descricao)}</h3>
                  {fonte.aviso && <p className="caption">{fonte.aviso}</p>}
                </div>
                <div className="mt-auto space-y-3">
                  <FonteOficial fonteOficial={fonte.fonteOficial} />
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <dt>Quando buscamos</dt>
                      <dd>{fonte.frequencia}</dd>
                    </div>
                    <div>
                      <dt>Última verificação</dt>
                      <dd className="tabular-nums">
                        {fonte.dataVerificacao ?? "Sem registro"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {semAcompanhamento.length > 0 && (
        <section className="space-y-4">
          <SectionHeader
            title="Fontes sem data acompanhada"
            description="Para estas fontes o portal ainda não registra quando foi buscá-las. Os números valem, mas não dá para dizer até quando estão em dia."
          />
          <ul
            className="border-line border-t"
            data-testid="como-atualizamos-sem-data"
          >
            {semAcompanhamento.map((fonte) => (
              <li
                key={fonte.fonte}
                className="border-line2 flex flex-col gap-1 border-b py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
              >
                <span className="space-y-1">
                  <span className="block">
                    {capitalizeFirstLetter(fonte.descricao)}
                  </span>
                  <FonteOficial fonteOficial={fonte.fonteOficial} />
                </span>
                <span className="caption">Busca {fonte.frequencia}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
