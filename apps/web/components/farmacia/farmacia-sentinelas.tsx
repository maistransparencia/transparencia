"use client";

import {
  fmtDate,
  fmtNumber,
  ModalDialog,
  SegmentedButton,
} from "@transparencia/ui";
import { ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import { useId, useRef, useState } from "react";
import { urlLegislacao } from "@/lib/constants/legislacao";
import { FarmaciaAcoesCivicas } from "./farmacia-acoes-civicas";
import { FarmaciaDisponibilidadeUnidades } from "./farmacia-disponibilidade-unidades";

export interface FarmaciaSentinelaItem {
  codigoPrincipioAtivo: string;
  nomePrincipioAtivo: string;
  codigoCategoria: string;
  rotuloCategoria: string;
  status:
    | "no_estoque"
    | "somente_vencido"
    | "somente_combinacao"
    | "sem_registro";
  /** Rótulo do estado sem lote válido; nulo nos demais. */
  rotuloSituacao?: string | null;
  unidadesComRegistro: number;
  unidadesSomenteCombinacao: number;
  /** Aviso de substância relacionada com lote válido; só quando o essencial não está no estoque. */
  avisoRelacionado?: string | null;
  href: string;
  /** Pedido de esclarecimento; só existe para essencial sem registro de estoque. */
  pedido?: {
    texto: string;
    textoWhatsApp: string;
    dataEstoque: string | null;
    rotuloMunicipio: string;
  } | null;
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

function rotuloDoStatus(item: FarmaciaSentinelaItem): string {
  if (item.status === "somente_vencido" && item.rotuloSituacao) {
    return item.rotuloSituacao;
  }
  if (item.status === "somente_combinacao") return "só em combinação";
  return "não aparece no estoque";
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
      <FarmaciaDisponibilidadeUnidades
        unidadesComRegistro={item.unidadesComRegistro}
        totalUnidadesAtivas={totalUnidadesAtivas}
      />
    );
  }
  return (
    <>
      <span className="text-warn-text text-[11px]">{rotuloDoStatus(item)}</span>
      {item.avisoRelacionado && (
        <span className="caption whitespace-nowrap">
          {item.avisoRelacionado}
        </span>
      )}
    </>
  );
}

/** Telemetria do pedido: nunca enviar o texto do pedido, só o tipo de interação. */
function registrarPedido(
  evento: string,
  propriedades: Record<string, unknown>,
) {
  try {
    posthog.capture(`farmacia_pedido_${evento}`, propriedades);
  } catch {}
}

function PedidoEsclarecimentoConteudo({
  pedido,
  caminhoCompartilhamento,
  codigoPrincipioAtivo,
  aoEditar,
}: {
  pedido: NonNullable<FarmaciaSentinelaItem["pedido"]>;
  caminhoCompartilhamento: string;
  codigoPrincipioAtivo: string;
  aoEditar: () => void;
}) {
  const [texto, setTexto] = useState(pedido.texto);
  const idTexto = useId();
  const editado = texto !== pedido.texto;

  return (
    <div className="space-y-4">
      <div className="text-mute space-y-2 text-sm leading-relaxed">
        <p>
          O texto abaixo já está pronto e pode ser editado. Inclua seu nome e um
          contato: a lei pede a identificação de quem faz o pedido. Copie e
          envie pelo canal oficial de acesso à informação da Prefeitura, ou
          compartilhe pelo WhatsApp.
        </p>
        <p>
          Não aparecer na lista não quer dizer que o remédio acabou. Pode ser
          que a unidade não tenha informado.
        </p>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={idTexto} className="text-ink text-sm font-semibold">
            Texto do pedido
          </label>
          <span className="numeric text-mute3 text-left text-xs tabular-nums">
            {fmtNumber(texto.length)} caracteres
          </span>
        </div>
        <textarea
          id={idTexto}
          value={texto}
          onChange={(evento) => {
            setTexto(evento.target.value);
            aoEditar();
          }}
          rows={9}
          className="border-line bg-line2 text-ink w-full resize-y rounded-md border p-3 text-[14px] leading-[1.6]"
        />
        <p className="text-mute2 text-xs">
          Base legal:{" "}
          {LEIS_DO_PEDIDO.map((lei, indice) => (
            <span key={lei.codigo}>
              {indice > 0 && " · "}
              <a
                href={urlLegislacao(lei.codigo)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  registrarPedido("lei_clicada", {
                    codigo_principio_ativo: codigoPrincipioAtivo,
                    lei: lei.codigo,
                  })
                }
                className="text-brand inline-flex cursor-pointer items-center gap-1 underline"
              >
                {lei.rotulo}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </span>
          ))}
        </p>
      </div>
      <FarmaciaAcoesCivicas
        requerimento={texto}
        textoWhatsApp={pedido.textoWhatsApp}
        caminhoCompartilhamento={caminhoCompartilhamento}
        rotuloCopiar="Copiar pedido"
        rotuloWhatsApp="Compartilhar no WhatsApp"
        mensagemCopiado="Pedido copiado."
        mensagemErro="Não foi possível copiar o pedido. Tente novamente."
        variante="pedido"
        onAcao={(acao) =>
          registrarPedido(acao, {
            codigo_principio_ativo: codigoPrincipioAtivo,
            editado,
          })
        }
      />
      <p className="border-line text-mute2 border-t pt-3 text-xs">
        Pela Lei de Acesso à Informação, quando não responde na hora, o órgão
        tem até 20 dias. Pode prorrogar por mais 10 dias, com justificativa.
      </p>
    </div>
  );
}

export type PedidoEsclarecimentoItem = Pick<
  FarmaciaSentinelaItem,
  "codigoPrincipioAtivo" | "nomePrincipioAtivo" | "href" | "pedido"
> & { rotuloSituacao?: string | null };

export function PedidoEsclarecimento({
  item,
}: {
  item: PedidoEsclarecimentoItem;
}) {
  const [aberto, setAberto] = useState(false);
  const editouRef = useRef(false);
  if (!item.pedido) return null;

  const abrir = () => {
    editouRef.current = false;
    setAberto(true);
    registrarPedido("aberto", {
      codigo_principio_ativo: item.codigoPrincipioAtivo,
    });
  };
  const fechar = () => {
    setAberto(false);
    registrarPedido("fechado", {
      codigo_principio_ativo: item.codigoPrincipioAtivo,
      editado: editouRef.current,
    });
  };
  const aoEditar = () => {
    if (editouRef.current) return;
    editouRef.current = true;
    registrarPedido("editado", {
      codigo_principio_ativo: item.codigoPrincipioAtivo,
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label={`Pedir esclarecimento sobre ${item.nomePrincipioAtivo}`}
        onClick={abrir}
        className="text-brand inline-flex cursor-pointer items-center gap-1 py-1 text-xs font-semibold hover:underline"
      >
        Pedir esclarecimento
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
      <ModalDialog
        isOpen={aberto}
        onClose={fechar}
        title="Pedir esclarecimento"
        subtitle={`${item.nomePrincipioAtivo} · ${item.rotuloSituacao ?? `não aparece no estoque${item.pedido.dataEstoque ? ` de ${fmtDate(item.pedido.dataEstoque)}` : ""}`}`}
        subtitleClassName="line-clamp-2"
        badge={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {item.pedido.rotuloMunicipio && (
              <span className="bg-banbg text-banfg rounded-md px-2.5 py-1 font-semibold">
                {item.pedido.rotuloMunicipio}
              </span>
            )}
            <span className="text-mute2">Lei de Acesso à Informação</span>
          </span>
        }
        maxWidth="2xl"
        showShareButton={false}
      >
        <PedidoEsclarecimentoConteudo
          pedido={item.pedido}
          caminhoCompartilhamento={item.href}
          codigoPrincipioAtivo={item.codigoPrincipioAtivo}
          aoEditar={aoEditar}
        />
      </ModalDialog>
    </>
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
      className="border-ink flex flex-col gap-5 border-t-2 pt-7"
      aria-labelledby="farmacia-sentinelas-titulo"
    >
      <div className="space-y-1">
        <h2 id="farmacia-sentinelas-titulo">Remédios essenciais</h2>
        <p className="text-mute2 text-[13px]">
          Em quantas das {fmtNumber(totalUnidadesAtivas)} unidades cada remédio
          da lista nacional aparece no estoque. Clique para buscar.
        </p>
      </div>

      <details className="group border-line border-y px-1 py-3">
        <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-2 text-[13px] font-semibold select-none [&::-webkit-details-marker]:hidden">
          <span>Como ler esta lista</span>
          <ChevronDown className="text-mute2 h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <p className="text-mute mt-2.5 text-[13px] leading-[1.65]">
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
        <SegmentedButton
          active={categoria === null}
          size="md"
          onClick={() => setCategoria(null)}
        >
          Todos
        </SegmentedButton>
        {categorias.map((item) => (
          <SegmentedButton
            key={item.codigo}
            active={categoria === item.codigo}
            size="md"
            onClick={() => setCategoria(item.codigo)}
          >
            {item.rotulo}
          </SegmentedButton>
        ))}
      </fieldset>

      <ul className="border-line grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-6 border-t">
        {visiveis.map((item) => (
          <li key={item.codigoPrincipioAtivo} className="border-line border-b">
            {item.pedido ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3">
                <Link
                  href={item.href}
                  className="hover:bg-line2 min-w-0 text-left"
                >
                  <span className="text-ink block text-sm font-semibold">
                    {item.nomePrincipioAtivo}
                  </span>
                  <span className="text-mute2 block text-xs">
                    {item.rotuloCategoria}
                  </span>
                </Link>
                <span className="flex flex-col items-end gap-0.5">
                  <RotuloDisponibilidade
                    item={item}
                    totalUnidadesAtivas={totalUnidadesAtivas}
                  />
                  <PedidoEsclarecimento item={item} />
                </span>
              </div>
            ) : (
              <Link
                href={item.href}
                className="hover:bg-line2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 text-left"
              >
                <span className="min-w-0">
                  <span className="text-ink block text-sm font-semibold">
                    {item.nomePrincipioAtivo}
                  </span>
                  <span className="text-mute2 block text-xs">
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
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
