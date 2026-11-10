"use client";

import type { ResumoObrasDTO } from "@transparencia/db";
import { ArrowRight, MapPin, Share2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { urlLegislacao } from "@/lib/constants/legislacao";
import {
  type ApoioMinimoModel,
  type BuildSituacaoCidadeParams,
  buildSituacaoCidadeCards,
  CLASSE_GRADE_POR_QUANTIDADE,
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

function compartilhar(card: SituacaoCidadeCardModel) {
  try {
    posthog.capture("situacao_card_compartilhado", { area: card.area });
  } catch {
    // Silencia erros de telemetria
  }
  const mensagem = `${card.textoCompartilhar} ${window.location.origin}${window.location.pathname}`;
  window.open(
    `https://wa.me/?text=${encodeURIComponent(mensagem)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function LinhaApoioMinimo({ apoio }: { apoio: ApoioMinimoModel }) {
  const classeBarra =
    apoio.estado === "abaixo" ? "bg-warn-fill" : "bg-brand-fill";
  const classeTexto = apoio.estado === "abaixo" ? "text-warn-text" : "text-ink";
  return (
    <div className="mt-4 space-y-1.5 border-line border-t pt-3">
      <p className="eyebrow">{apoio.pergunta}</p>
      <p className={`text-sm ${classeTexto}`}>{apoio.texto}</p>
      <div
        className="relative h-1.5 w-full bg-track"
        role="img"
        aria-label={apoio.texto}
      >
        <div
          className={`h-full ${classeBarra}`}
          style={{ width: `${apoio.barraPercentual}%` }}
        />
        <span
          className="absolute -top-0.5 h-2.5 w-0.5 bg-ink"
          style={{ left: `${apoio.tracoMinimoPercentual}%` }}
          aria-hidden="true"
        />
      </div>
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
      className="group relative mt-4 block h-28 w-full overflow-hidden bg-track"
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
            className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-fill ring-2 ring-page"
          />
        ))}
      </div>
      <span className="absolute right-2 bottom-2 inline-flex items-center gap-1 bg-page/95 px-2 py-1 font-medium text-ink text-xs">
        <MapPin className="h-3 w-3" aria-hidden="true" />
        Ver no mapa
      </span>
    </Link>
  );
}

function BarraSituacaoObras({ resumo }: { resumo: ResumoObrasDTO }) {
  const total = Math.max(resumo.totalObras, 1);
  const partes = [
    {
      chave: "emExecucao",
      rotulo: "Em andamento",
      valor: resumo.emExecucao,
      classe: "bg-brand-fill",
    },
    {
      chave: "concluidas",
      rotulo: "Concluídas",
      valor: resumo.concluidas,
      classe: "bg-ok-fill",
    },
    {
      chave: "cadastradas",
      rotulo: "Não iniciadas",
      valor: resumo.cadastradas,
      classe: "bg-mute3",
    },
    {
      chave: "paralisadas",
      rotulo: "Paradas",
      valor: resumo.paralisadas,
      classe: "bg-warn-fill",
    },
  ];
  return (
    <div className="mt-4 space-y-2">
      <div
        className="flex h-1.5 w-full overflow-hidden bg-track"
        role="img"
        aria-label={partes.map((p) => `${p.rotulo}: ${p.valor}`).join(", ")}
      >
        {partes
          .filter((parte) => parte.valor > 0)
          .map((parte) => (
            <div
              key={parte.chave}
              className={parte.classe}
              style={{ width: `${(parte.valor / total) * 100}%` }}
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
      <div className="mt-4 space-y-3">
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
      <div className="mt-4 space-y-2">
        <FarmaciaBuscaForm {...propsBusca} />
        {(props.farmaciaExemplos ?? []).length > 0 && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {(props.farmaciaExemplos ?? []).map((exemplo) => (
              <li key={exemplo.codigoPrincipioAtivo}>
                <Link
                  href={exemplo.href}
                  className="caption inline-flex min-h-11 items-center text-brand hover:underline sm:min-h-0"
                >
                  {exemplo.nomePrincipioAtivo}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return null;
}

function SituacaoCard({
  card,
  props,
}: {
  card: SituacaoCidadeCardModel;
  props: SituacaoCidadeSectionProps;
}) {
  return (
    <article
      aria-label={card.eyebrow}
      className={`panel panel-top flex h-full flex-col ${CLASSE_BORDA_POR_TOM[card.tom]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow">{card.eyebrow}</p>
        {card.motivoAtencao && (
          <span className="border border-warn-text/40 bg-warn-fill/10 px-2 py-0.5 font-semibold text-warn-text text-xs">
            Merece atenção
          </span>
        )}
      </div>
      <h3 className="mt-1">{card.pergunta}</h3>
      {card.manchete && (
        <p className="stat-value mt-2">
          {card.manchete}
          {card.complemento && (
            <span className="caption ml-2 font-normal font-sans">
              {card.complemento}
            </span>
          )}
        </p>
      )}
      {card.motivoAtencao && (
        <p className="mt-1 text-sm text-warn-text">{card.motivoAtencao}</p>
      )}
      <p className="caption mt-1">{card.notaOrigem}</p>
      {card.area === "saude" && <ExtrasSaude card={card} props={props} />}
      {card.area === "obras" && props.resumoObras && (
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
      )}
      {card.apoio && <LinhaApoioMinimo apoio={card.apoio} />}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        <Link href={card.detailUrl} className={CLASSE_ACAO_DESTAQUE}>
          <span>Ver detalhes</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => compartilhar(card)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border border-line px-3 font-semibold text-sm hover:bg-line2"
        >
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartilhar
        </button>
      </div>
    </article>
  );
}

export function SituacaoCidadeSection(props: SituacaoCidadeSectionProps) {
  const cards = buildSituacaoCidadeCards(props);
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="situacao-cidade-titulo" className="space-y-6">
      <h2 id="situacao-cidade-titulo">Como está a cidade hoje</h2>
      <div
        className={`grid items-stretch gap-6 ${CLASSE_GRADE_POR_QUANTIDADE[cards.length]}`}
      >
        {cards.map((card) => (
          <SituacaoCard key={card.area} card={card} props={props} />
        ))}
      </div>
    </section>
  );
}
