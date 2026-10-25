"use client";

import { fmtNumber } from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { FarmaciaAcoesCivicas } from "./farmacia-acoes-civicas";

export interface FarmaciaSentinelaItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  codigoCategoria: string;
  rotuloCategoria: string;
  status: "no_estoque" | "somente_combinacao" | "sem_registro";
  unidadesComRegistro: number;
  unidadesSomenteCombinacao: number;
  href: string;
  /** Pedido de esclarecimento; só existe para essencial sem registro de estoque. */
  pedido?: { texto: string; textoWhatsApp: string } | null;
}

const LEIS_DO_PEDIDO = [
  { codigo: "lai", rotulo: "Lei de Acesso à Informação" },
  { codigo: "lei8080", rotulo: "Lei nº 8.080/1990" },
  { codigo: "lei14654", rotulo: "Lei nº 14.654/2023" },
] as const;

export interface FarmaciaSentinelasProps {
  essenciais: FarmaciaSentinelaItem[];
  categorias: { codigo: string; rotulo: string }[];
  totalUnidadesAtivas: number;
}

function chipClasse(ativo: boolean): string {
  return `rounded-full border px-3 py-[5px] text-[13px] ${ativo ? "border-ink bg-ink text-white" : "border-borderLine bg-white text-ink"}`;
}

function RotuloDisponibilidade({
  item,
  totalUnidadesAtivas,
}: {
  item: FarmaciaSentinelaItem;
  totalUnidadesAtivas: number;
}) {
  if (item.status === "no_estoque") {
    return (
      <>
        <span className="flex gap-[3px]" aria-hidden="true">
          {Array.from({ length: totalUnidadesAtivas }, (_, indice) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: quadradinhos posicionais, sem identidade própria
              key={indice}
              className={`h-2 w-2 rounded-[2px] ${indice < item.unidadesComRegistro ? "bg-accent" : "bg-slate-200"}`}
            />
          ))}
        </span>
        <span className="text-[11px] text-slate-600 tabular-nums">
          {fmtNumber(item.unidadesComRegistro)} de{" "}
          {fmtNumber(totalUnidadesAtivas)} unidades
        </span>
      </>
    );
  }
  return (
    <span className="text-[11px] text-attention">
      {item.status === "somente_combinacao"
        ? "só em combinação"
        : "não aparece no estoque"}
    </span>
  );
}

function PedidoEsclarecimento({ item }: { item: FarmaciaSentinelaItem }) {
  const [aberto, setAberto] = useState(false);
  if (!item.pedido) return null;
  const idPainel = `pedido-${item.codigoPrincipioAtivo}`;

  return (
    <div className="border-slate-100 border-b pb-3">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={`${aberto ? "Fechar pedido" : "Pedir esclarecimento"} sobre ${item.nomePrincipioAtivo}`}
        onClick={() => setAberto((atual) => !atual)}
        className="inline-flex min-h-11 items-center font-semibold text-[13px] text-ink underline"
      >
        {aberto ? "Fechar pedido" : "Pedir esclarecimento"}
      </button>
      {aberto && (
        <div id={idPainel} className="mt-2 space-y-3">
          <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-[13px] text-slate-700 leading-[1.6]">
            {item.pedido.texto}
          </p>
          <p className="text-subtleText text-xs">
            Base legal:{" "}
            {LEIS_DO_PEDIDO.map((lei, indice) => (
              <span key={lei.codigo}>
                {indice > 0 && " · "}
                <a
                  href={urlLegislacao(lei.codigo)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  {lei.rotulo}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </span>
            ))}
          </p>
          <FarmaciaAcoesCivicas
            requerimento={item.pedido.texto}
            textoWhatsApp={item.pedido.textoWhatsApp}
            caminhoCompartilhamento={item.href}
            rotuloCopiar="Copiar pedido"
            rotuloWhatsApp="Compartilhar no WhatsApp"
            mensagemCopiado="Pedido copiado."
            mensagemErro="Não foi possível copiar o pedido. Tente novamente."
          />
        </div>
      )}
    </div>
  );
}

export function FarmaciaSentinelas({
  essenciais,
  categorias,
  totalUnidadesAtivas,
}: FarmaciaSentinelasProps) {
  const [categoria, setCategoria] = useState<string | null>(null);

  if (essenciais.length === 0 || totalUnidadesAtivas === 0) return null;

  const visiveis = categoria
    ? essenciais.filter((item) => item.codigoCategoria === categoria)
    : essenciais;

  return (
    <section
      className="flex flex-col gap-5 border-ink border-t-2 pt-7"
      aria-labelledby="farmacia-sentinelas-titulo"
    >
      <div className="space-y-1">
        <h2
          id="farmacia-sentinelas-titulo"
          className="font-bold font-serif text-2xl text-ink"
        >
          Remédios essenciais
        </h2>
        <p className="text-[13px] text-subtleText">
          Em quantas das {fmtNumber(totalUnidadesAtivas)} unidades cada remédio
          da lista nacional aparece no estoque. Clique para buscar.
        </p>
      </div>

      <details className="rounded-[10px] border border-borderLine bg-white px-4 py-3">
        <summary className="cursor-pointer font-semibold text-[13px] text-ink">
          Como ler esta lista
        </summary>
        <p className="mt-2.5 text-[13px] text-slate-600 leading-[1.65]">
          Remédios que o Ministério da Saúde considera essenciais, segundo a
          lista nacional (
          <a
            href={urlLegislacao("rename2024")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            RENAME, edição 2024
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
          ). Os dados oficiais só listam remédios que têm estoque. Se um remédio
          aparece como “não aparece na lista de estoque”, ele não consta na
          última lista divulgada. Isso não prova que acabou: a prefeitura também
          pode não ter escolhido distribuir esse remédio. Remédios misturados em
          um só comprimido (ex.: valsartana + hidroclorotiazida) não contam como
          o remédio sozinho.
        </p>
      </details>

      <fieldset
        aria-label="Filtrar por categoria"
        className="m-0 flex flex-wrap gap-2 border-0 p-0"
      >
        <button
          type="button"
          aria-pressed={categoria === null}
          onClick={() => setCategoria(null)}
          className={chipClasse(categoria === null)}
        >
          Todos
        </button>
        {categorias.map((item) => (
          <button
            key={item.codigo}
            type="button"
            aria-pressed={categoria === item.codigo}
            onClick={() => setCategoria(item.codigo)}
            className={chipClasse(categoria === item.codigo)}
          >
            {item.rotulo}
          </button>
        ))}
      </fieldset>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-6 rounded-xl border border-borderLine bg-white px-5 py-1">
        {visiveis.map((item) => (
          <li key={item.codigoPrincipioAtivo}>
            <Link
              href={item.href}
              className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 ${item.pedido ? "" : "border-slate-100 border-b"} text-left hover:bg-[#f7f8fa]`}
            >
              <span className="min-w-0">
                <span className="block font-semibold text-ink text-sm">
                  {item.nomePrincipioAtivo}
                </span>
                <span className="block text-subtleText text-xs">
                  {item.rotuloCategoria}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <RotuloDisponibilidade
                  item={item}
                  totalUnidadesAtivas={totalUnidadesAtivas}
                />
              </span>
            </Link>
            <PedidoEsclarecimento item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
