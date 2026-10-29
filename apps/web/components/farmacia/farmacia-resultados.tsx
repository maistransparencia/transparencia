"use client";

import { fmtNumber, SegmentedButton } from "@transparencia/ui";
import dynamic from "next/dynamic";
import { useState } from "react";
import type { FarmaciaMapaMarcador } from "./farmacia-mapa";
import {
  PedidoEsclarecimento,
  type PedidoEsclarecimentoItem,
} from "./farmacia-sentinelas";

const FarmaciaMapa = dynamic(
  () => import("./farmacia-mapa").then((modulo) => modulo.FarmaciaMapa),
  { ssr: false },
);

/** Grupo de filtros com `aria-pressed`: sem o papel `tab` padrão da variante. */
const SEM_PAPEL_DE_ABA = {
  role: undefined,
  "aria-selected": undefined,
} as const;

export interface FarmaciaResultadoUnidade {
  numero: number;
  idUnidade: string;
  nomeUnidade: string;
  enderecoUnidade: string | null;
  telefoneUnidade: string | null;
  telefoneHref: string | null;
  totalQuantidadeEstoque: number;
  medicamentos: { nomeMedicamento: string; quantidadeEstoque: number }[];
}

export interface FarmaciaResultadoRemedio {
  nomeMedicamento: string;
  totalQuantidadeEstoque: number;
  totalUnidadesComEstoque: number;
  unidades: {
    numero: number;
    idUnidade: string;
    nomeUnidade: string;
    quantidadeEstoque: number;
    percentualBarra: number;
  }[];
}

export interface FarmaciaRemedioSemLoteValido {
  nomeMedicamento: string;
  href: string;
  rotulo: string;
  pedido: PedidoEsclarecimentoItem["pedido"];
}

export interface FarmaciaResultadosProps {
  busca: string;
  resumo: string;
  unidades: FarmaciaResultadoUnidade[];
  remedios: FarmaciaResultadoRemedio[];
  semLoteValido?: FarmaciaRemedioSemLoteValido[];
  marcadores: FarmaciaMapaMarcador[];
}

type ModoVisualizacao = "unidade" | "remedio";

const MODOS: { codigo: ModoVisualizacao; rotulo: string }[] = [
  { codigo: "unidade", rotulo: "Por unidade" },
  { codigo: "remedio", rotulo: "Por remédio" },
];

function RemediosSemLoteValido({
  remedios,
}: {
  remedios: FarmaciaRemedioSemLoteValido[];
}) {
  if (remedios.length === 0) return null;
  return (
    <ul className="flex flex-col">
      {remedios.map((remedio) => (
        <li
          key={remedio.nomeMedicamento}
          className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 border-line border-b px-4 py-3"
        >
          <span className="font-semibold text-ink text-sm">
            {remedio.nomeMedicamento}
          </span>
          <span className="flex flex-col items-end gap-0.5">
            <span className="text-[11px] text-warn">{remedio.rotulo}</span>
            <PedidoEsclarecimento
              item={{
                codigoPrincipioAtivo: remedio.nomeMedicamento,
                nomePrincipioAtivo: remedio.nomeMedicamento,
                href: remedio.href,
                pedido: remedio.pedido,
                rotuloSituacao: remedio.rotulo.toLowerCase(),
              }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function rolarAteUnidade(idUnidade: string) {
  const alvo = document.querySelector<HTMLElement>(
    `[data-unidade-id="${CSS.escape(idUnidade)}"]`,
  );
  if (!alvo) return;
  window.scrollTo({
    top: alvo.getBoundingClientRect().top + window.scrollY - 24,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
  });
}

function NumeroUnidade({
  numero,
  tamanho,
}: {
  numero: number;
  tamanho: "h-6 w-6 text-xs" | "h-[22px] w-[22px] text-[11px]";
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-onink tabular-nums ${tamanho}`}
      aria-hidden="true"
    >
      {numero}
    </span>
  );
}

export function FarmaciaResultados({
  busca,
  resumo,
  unidades,
  remedios,
  semLoteValido = [],
  marcadores,
}: FarmaciaResultadosProps) {
  const [modo, setModo] = useState<ModoVisualizacao>("unidade");
  const [idDestacado, setIdDestacado] = useState<string | null>(null);

  if (unidades.length === 0) {
    return (
      <section
        id="resultados"
        aria-labelledby="farmacia-resultados-titulo"
        className="flex scroll-mt-20 flex-col gap-5 border-ink border-t-2 pt-7 lg:scroll-mt-4"
      >
        <h2
          id="farmacia-resultados-titulo"
          className="font-bold font-serif text-2xl text-ink"
        >
          Onde encontrar “{busca}”
        </h2>
        <RemediosSemLoteValido remedios={semLoteValido} />
        {semLoteValido.length === 0 && (
          <div className="flex flex-col gap-1.5 border-line border-y px-4 py-8">
            <p className="font-semibold text-base text-ink">
              “{busca}” não aparece na lista de estoque
            </p>
            <p className="text-mute text-sm">
              Ele não está na última lista de estoque divulgada. Isso não quer
              dizer que acabou: a Prefeitura também pode não distribuir esse
              remédio. Confira se o nome está certo ou tente pelo nome da
              substância.
            </p>
          </div>
        )}
      </section>
    );
  }

  const classeLinha = (id: string) =>
    `transition-colors ${id === idDestacado ? "bg-line2" : ""}`;
  const destacar = (id: string) => ({
    onMouseEnter: () => setIdDestacado(id),
    onMouseLeave: () => setIdDestacado(null),
    onFocus: () => setIdDestacado(id),
    onBlur: () => setIdDestacado(null),
  });

  return (
    <section
      id="resultados"
      aria-labelledby="farmacia-resultados-titulo"
      className="flex scroll-mt-20 flex-col gap-5 border-ink border-t-2 pt-7 lg:scroll-mt-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="farmacia-resultados-titulo"
            className="font-bold font-serif text-2xl text-ink"
          >
            Onde encontrar “{busca}”
          </h2>
          <p className="text-[13px] text-mute2">{resumo}</p>
        </div>
        <fieldset
          aria-label="Forma de visualização"
          className="m-0 flex gap-4 border-0 p-0"
        >
          {MODOS.map((item) => (
            <SegmentedButton
              key={item.codigo}
              variant="tabs"
              active={modo === item.codigo}
              {...SEM_PAPEL_DE_ABA}
              aria-pressed={modo === item.codigo}
              onClick={() => setModo(item.codigo)}
              className="px-0"
            >
              {item.rotulo}
            </SegmentedButton>
          ))}
        </fieldset>
      </div>

      <RemediosSemLoteValido remedios={semLoteValido} />

      <div className="flex flex-col-reverse gap-5 lg:flex-row">
        <ul className="flex min-w-0 flex-1 flex-col divide-y divide-line border-line border-y">
          {modo === "unidade" &&
            unidades.map((unidade) => (
              <li
                key={unidade.idUnidade}
                data-unidade-id={unidade.idUnidade}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: card focável para destacar a unidade no mapa
                tabIndex={0}
                {...destacar(unidade.idUnidade)}
                className={`flex flex-col gap-3 px-2 py-[18px] ${classeLinha(unidade.idUnidade)}`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <NumeroUnidade
                      numero={unidade.numero}
                      tamanho="h-6 w-6 text-xs"
                    />
                    <h3 className="min-w-0 flex-1 font-sans font-semibold text-base text-ink">
                      {unidade.nomeUnidade}
                    </h3>
                    <span className="shrink-0 text-mute text-xs tabular-nums">
                      {fmtNumber(unidade.totalQuantidadeEstoque)} em estoque
                    </span>
                  </div>
                  {(unidade.enderecoUnidade || unidade.telefoneUnidade) && (
                    <p className="ml-9 text-[13px] text-mute2">
                      {unidade.enderecoUnidade}
                      {unidade.enderecoUnidade && unidade.telefoneUnidade
                        ? " · "
                        : ""}
                      {unidade.telefoneUnidade && unidade.telefoneHref && (
                        <a
                          href={unidade.telefoneHref}
                          className="underline hover:text-ink"
                        >
                          {unidade.telefoneUnidade}
                        </a>
                      )}
                    </p>
                  )}
                </div>
                <ul className="ml-9">
                  {unidade.medicamentos.map((medicamento, indice) => (
                    <li
                      // biome-ignore lint/suspicious/noArrayIndexKey: lista estática; o nome pode repetir na mesma unidade
                      key={`${medicamento.nomeMedicamento}-${indice}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 border-line border-t py-[9px]"
                    >
                      <span className="font-semibold text-ink text-sm">
                        {medicamento.nomeMedicamento}
                      </span>
                      <span className="text-right font-semibold text-sm tabular-nums">
                        {fmtNumber(medicamento.quantidadeEstoque)}{" "}
                        <span className="font-normal text-mute2 text-xs">
                          em estoque
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          {modo === "remedio" &&
            remedios.map((remedio) => (
              <li
                key={remedio.nomeMedicamento}
                className="flex flex-col gap-2 px-2 py-[18px]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <h3 className="font-sans font-semibold text-base text-ink">
                    {remedio.nomeMedicamento}
                  </h3>
                  <span className="text-mute text-xs tabular-nums">
                    {fmtNumber(remedio.totalQuantidadeEstoque)} em estoque ·{" "}
                    {fmtNumber(remedio.totalUnidadesComEstoque)}{" "}
                    {remedio.totalUnidadesComEstoque === 1
                      ? "unidade"
                      : "unidades"}
                  </span>
                </div>
                <ul>
                  {remedio.unidades.map((item) => (
                    <li
                      key={item.idUnidade}
                      data-unidade-id={item.idUnidade}
                      // biome-ignore lint/a11y/noNoninteractiveTabindex: linha focável para destacar a unidade no mapa
                      tabIndex={0}
                      {...destacar(item.idUnidade)}
                      className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-x-3 border-line border-t py-2 focus-visible:outline-2 focus-visible:outline-brand ${item.idUnidade === idDestacado ? "bg-line2" : ""}`}
                    >
                      <NumeroUnidade
                        numero={item.numero}
                        tamanho="h-[22px] w-[22px] text-[11px]"
                      />
                      <div className="min-w-0 space-y-1">
                        <p className="text-ink text-sm">{item.nomeUnidade}</p>
                        <div
                          className="h-1 overflow-hidden rounded-sm bg-line2"
                          aria-hidden="true"
                        >
                          <div
                            className="h-full rounded-sm bg-brand"
                            style={{ width: `${item.percentualBarra}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-right font-semibold text-sm tabular-nums">
                        {fmtNumber(item.quantidadeEstoque)}{" "}
                        <span className="font-normal text-mute2 text-xs">
                          em estoque
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
        {marcadores.length > 0 && (
          <aside className="lg:sticky lg:top-4 lg:w-[340px] lg:shrink-0 lg:self-start">
            <div className="isolate h-60 overflow-hidden border-line border-y bg-line2 lg:h-[520px]">
              <FarmaciaMapa
                marcadores={marcadores}
                idDestacado={idDestacado}
                onDestacar={setIdDestacado}
                onSelecionar={rolarAteUnidade}
              />
            </div>
            <p className="mt-2 flex items-center gap-2 text-mute2 text-xs">
              <span
                className="h-2.5 w-2.5 rounded-full bg-brand"
                aria-hidden="true"
              />
              Tem o remédio
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}
