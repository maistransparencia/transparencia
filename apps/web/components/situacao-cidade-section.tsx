"use client";

import type { ResumoObrasDTO } from "@transparencia/db";
import { Badge, ShareButton, ThresholdMeter } from "@transparencia/ui";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  MapPin,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { FonteOficial } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";
import {
  type ApoioMinimoModel,
  type BuildSituacaoCidadeParams,
  buildSituacaoCidadeCards,
  ROTULO_SENTIDO,
  type SentidoVariacao,
  type SituacaoCidadeCardModel,
} from "@/lib/situacao-cidade";
import { getTileCoordinates, projectCoordToTilePercent } from "@/lib/tile-calc";
import { CLASSE_ACAO_DESTAQUE } from "./destaque-linha";
import { FarmaciaAcoesCivicas } from "./farmacia/farmacia-acoes-civicas";
import {
  FarmaciaBuscaForm,
  type FarmaciaBuscaFormProps,
} from "./farmacia/farmacia-busca-form";
import type { ObraMiniMapMarker } from "./obras-resumo-card";
import { SectionWithHeader } from "./section-with-header";

export interface SituacaoCidadeSectionProps extends BuildSituacaoCidadeParams {
  farmaciaDetailUrl: string;
  farmaciaRequerimento?: string;
  farmaciaTextoWhatsApp?: string;
  farmaciaExemplos?: {
    codigoPrincipioAtivo: string;
    nomePrincipioAtivo: string;
    href: string;
  }[];
  obrasMarkers?: ObraMiniMapMarker[];
  obrasCenter?: [number, number];
}

const CLASSE_BORDA_POR_TOM = {
  neutro: "",
  atencao: "panel-warn",
} as const;

const CLASSE_LINK_LEI =
  "font-medium underline underline-offset-2 hover:text-ink";

function LinhaApoioMinimo({ apoio }: { apoio: ApoioMinimoModel }) {
  const tom = apoio.estado === "abaixo" ? "warn" : "brand";
  const classeTexto = apoio.estado === "abaixo" ? "text-warn-text" : "text-ink";
  return (
    <div className="border-line space-y-1.5 border-t pt-3 md:first:border-t-0 md:first:pt-0">
      <p className="eyebrow">{apoio.pergunta}</p>
      <p className={`text-sm ${classeTexto}`}>{apoio.texto}</p>
      <ThresholdMeter
        value={apoio.barraPercentual}
        threshold={apoio.tracoMinimoPercentual}
        label={apoio.pergunta}
        valueText={apoio.texto}
        tone={tom}
        className="my-2"
      />
      {apoio.baseLegal && apoio.urlBaseLegal && (
        <a
          href={apoio.urlBaseLegal}
          target="_blank"
          rel="noopener noreferrer"
          className={`caption ${CLASSE_LINK_LEI}`}
        >
          {apoio.baseLegal}
        </a>
      )}
    </div>
  );
}

function MiniMapaObras({
  markers,
  center,
  detailUrl,
}: {
  markers: ObraMiniMapMarker[];
  center: [number, number];
  detailUrl: string;
}) {
  const tileInfo = getTileCoordinates(center[0], center[1], 14);
  if (!tileInfo) return null;
  const pontos = markers
    .filter(
      (marker) =>
        Number.isFinite(marker.latitude) &&
        Number.isFinite(marker.longitude) &&
        marker.latitude !== 0 &&
        marker.longitude !== 0,
    )
    .slice(0, 15)
    .map((marker) => ({
      ...marker,
      ...projectCoordToTilePercent(marker.latitude, marker.longitude, tileInfo),
    }));
  return (
    <Link
      href={detailUrl}
      aria-label="Ver no mapa interativo de obras públicas"
      className="group bg-track relative block h-36 w-full overflow-hidden"
    >
      <Image
        src={tileInfo.url}
        alt="Visão geral cartográfica das obras públicas"
        fill
        sizes="(max-width: 1024px) 100vw, 400px"
        className="mapa-tema-imagem object-cover"
        unoptimized
      />
      <div className="pointer-events-none absolute inset-0">
        {pontos.map((ponto) => (
          <span
            key={ponto.id}
            style={{ left: `${ponto.xPercent}%`, top: `${ponto.yPercent}%` }}
            className="bg-brand-fill ring-page absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          />
        ))}
      </div>
      <span className="bg-page/95 text-ink absolute right-2 bottom-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        Ver no mapa
      </span>
    </Link>
  );
}

function BarraSituacaoObras({ resumo }: { resumo: ResumoObrasDTO }) {
  // Ordem do ciclo da obra: pronta, andando, parada, sem começar.
  const partes = [
    {
      chave: "concluidas",
      rotulo: "Concluídas",
      valor: resumo.concluidas,
      classe: "bg-ok-fill",
    },
    {
      chave: "emExecucao",
      rotulo: "Em andamento",
      valor: resumo.emExecucao,
      classe: "bg-brand-fill",
    },
    {
      chave: "paralisadas",
      rotulo: "Paradas",
      valor: resumo.paralisadas,
      classe: "bg-warn-fill",
    },
    {
      chave: "cadastradas",
      rotulo: "Não iniciadas",
      valor: resumo.cadastradas,
      classe: "bg-faint",
    },
    {
      chave: "canceladas",
      rotulo: "Canceladas",
      valor: resumo.canceladas,
      classe: "bg-mute3",
      // Só aparece quando existe: obra cancelada é exceção, não etapa do ciclo.
      opcional: true,
    },
  ].filter((parte) => !parte.opcional || parte.valor > 0);
  // A barra é a soma das partes desenhadas: nenhum pedaço fica sem status na legenda.
  const total = Math.max(
    partes.reduce((soma, parte) => soma + parte.valor, 0),
    1,
  );
  return (
    <div className="space-y-2">
      <div
        className="bg-track flex h-3 w-full gap-px"
        role="img"
        aria-label={partes.map((p) => `${p.rotulo}: ${p.valor}`).join(", ")}
      >
        {partes
          .filter((parte) => parte.valor > 0)
          .map((parte) => (
            <div
              key={parte.chave}
              className={parte.classe}
              // Proporção pelo flex-grow: o gap-px entre as partes não estoura a largura.
              style={{ flex: `${parte.valor / total} 1 0` }}
            />
          ))}
      </div>
      <ul className="caption flex flex-wrap gap-x-3 gap-y-1">
        {partes.map((parte) => (
          <li key={parte.chave} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 shrink-0 ${parte.classe}`}
              aria-hidden="true"
            />
            {parte.rotulo}: {parte.valor}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExtrasSaude({
  card,
  props,
}: {
  card: SituacaoCidadeCardModel;
  props: SituacaoCidadeSectionProps;
}) {
  if (props.farmaciaStatus === "apagao") {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Não encontramos estoque divulgado nos últimos 15 dias. Isso não quer
          dizer que falta remédio: pode ser que a informação não tenha sido
          publicada. A{" "}
          <a
            href={urlLegislacao("lei14654")}
            target="_blank"
            rel="noopener noreferrer"
            className={CLASSE_LINK_LEI}
          >
            Lei 14.654/2023
          </a>{" "}
          pede divulgação atualizada.
        </p>
        {props.farmaciaRequerimento && props.farmaciaTextoWhatsApp && (
          <FarmaciaAcoesCivicas
            requerimento={props.farmaciaRequerimento}
            textoWhatsApp={props.farmaciaTextoWhatsApp}
            caminhoCompartilhamento={card.detailUrl}
          />
        )}
      </div>
    );
  }
  if (props.farmaciaStatus === "conforme") {
    const propsBusca: FarmaciaBuscaFormProps = {
      action: props.farmaciaDetailUrl,
      rotuloBotaoMobile: "Buscar no estoque",
    };
    return (
      <div className="space-y-2">
        <FarmaciaBuscaForm {...propsBusca} />
        {(props.farmaciaExemplos ?? []).length > 0 && (
          <div className="caption flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-mute2">Remédios comuns:</span>
            {/* biome-ignore lint/a11y/noRedundantRoles: display: contents apaga a semântica de lista no Safari; o role explícito a devolve */}
            <ul role="list" className="contents">
              {(props.farmaciaExemplos ?? []).map((exemplo) => (
                <li key={exemplo.codigoPrincipioAtivo}>
                  <Link
                    href={exemplo.href}
                    className="text-brand-text inline-flex min-h-8 items-center underline underline-offset-2"
                  >
                    {exemplo.nomePrincipioAtivo}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  return null;
}

const ICONE_SENTIDO: Record<SentidoVariacao, typeof ArrowUp> = {
  subiu: ArrowUp,
  caiu: ArrowDown,
};

// Com `!`, como nas outras páginas: o papel `caption` também define a cor.
const CLASSE_COR_SENTIDO: Record<SentidoVariacao, string> = {
  subiu: "text-ok-text!",
  caiu: "text-warn-text!",
};

function Complemento({
  texto,
  sentido,
}: {
  texto: string;
  sentido: SentidoVariacao | null;
}) {
  const Icone = sentido ? ICONE_SENTIDO[sentido] : null;
  // A cor do sentido vale para a seta e para o texto que a acompanha.
  const classeCor = sentido ? CLASSE_COR_SENTIDO[sentido] : "";
  return (
    <span
      className={`caption ml-2 inline-flex items-center gap-0.5 font-sans font-normal whitespace-nowrap ${classeCor}`}
    >
      {Icone && sentido && (
        <>
          <Icone className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{ROTULO_SENTIDO[sentido]}, </span>
        </>
      )}
      {texto}
    </span>
  );
}

function LinhaFontes({
  fontes,
  nota,
}: {
  fontes: FonteOficial[];
  nota: string | null;
}) {
  return (
    <p className="caption mt-1">
      Fonte:{" "}
      {fontes.map((fonte, indice) => (
        <span key={fonte.url}>
          {indice > 0 && " e "}
          <a
            href={fonte.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center ${CLASSE_LINK_LEI}`}
          >
            {fonte.nome}
            <ArrowUpRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </span>
      ))}
      .{nota && ` ${nota}`}
    </p>
  );
}

function SituacaoCard({
  card,
  props,
}: {
  card: SituacaoCidadeCardModel;
  props: SituacaoCidadeSectionProps;
}) {
  const extrasSaude =
    card.area === "saude" ? <ExtrasSaude card={card} props={props} /> : null;
  const extrasObras =
    card.area === "obras" && props.resumoObras ? (
      <>
        <BarraSituacaoObras resumo={props.resumoObras} />
        {props.obrasCenter && (
          <MiniMapaObras
            markers={props.obrasMarkers ?? []}
            center={props.obrasCenter}
            detailUrl={card.detailUrl}
          />
        )}
      </>
    ) : null;
  const temDetalhe = Boolean(extrasSaude || extrasObras || card.apoio);

  // Resposta à esquerda e detalhe (busca, barra, mapa, mínimo) à direita a
  // partir de md, com as ações embaixo da resposta; no celular tudo empilha
  // na ordem de leitura e as ações fecham o card.
  return (
    <article
      aria-label={card.eyebrow}
      className={`panel panel-top ${CLASSE_BORDA_POR_TOM[card.tom]}`}
    >
      <div className="grid gap-x-10 gap-y-5 md:grid-cols-2 md:grid-rows-[auto_1fr]">
        <div className="min-w-0 md:col-start-1 md:row-start-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">{card.eyebrow}</p>
            {card.motivoAtencao && (
              <Badge variant="warning">Merece atenção</Badge>
            )}
          </div>
          <h3 className="mt-1">{card.pergunta}</h3>
          {card.manchete && (
            <p className="stat-value mt-2">
              {card.manchete}
              {card.complemento && (
                <Complemento
                  texto={card.complemento}
                  sentido={card.sentidoComplemento}
                />
              )}
            </p>
          )}
          {card.motivoAtencao && (
            <p className="text-warn-text mt-1 text-sm">{card.motivoAtencao}</p>
          )}
          <LinhaFontes fontes={card.fontes} nota={card.notaOrigem} />
        </div>
        {temDetalhe && (
          <div className="min-w-0 space-y-4 md:col-start-2 md:row-span-2 md:row-start-1">
            {extrasSaude}
            {extrasObras}
            {card.apoio && <LinhaApoioMinimo apoio={card.apoio} />}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:col-start-1 md:row-start-2 md:self-end">
          <Link href={card.detailUrl} className={CLASSE_ACAO_DESTAQUE}>
            <span>Ver detalhes</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <ShareButton
            variant="inline"
            url={card.detailUrl}
            title={card.pergunta}
            onShare={({ method }) => {
              try {
                posthog.capture("situacao_card_compartilhado", {
                  area: card.area,
                  method,
                });
              } catch {
                // Silencia erros de telemetria
              }
            }}
          />
        </div>
      </div>
    </article>
  );
}

export function SituacaoCidadeSection(props: SituacaoCidadeSectionProps) {
  const cards = buildSituacaoCidadeCards(props);
  if (cards.length === 0) return null;
  return (
    <SectionWithHeader id="situacao-cidade" title="Como está a cidade hoje">
      <div className="space-y-8">
        {cards.map((card) => (
          <SituacaoCard key={card.area} card={card} props={props} />
        ))}
      </div>
    </SectionWithHeader>
  );
}
