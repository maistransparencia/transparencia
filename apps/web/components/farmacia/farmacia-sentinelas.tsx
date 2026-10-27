"use client";

import { fmtNumber, ModalDialog } from "@transparencia/ui";
import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react";
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
      <FarmaciaDisponibilidadeUnidades
        unidadesComRegistro={item.unidadesComRegistro}
        totalUnidadesAtivas={totalUnidadesAtivas}
      />
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
      <div className="space-y-2 text-slate-600 text-sm leading-relaxed">
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
          <label htmlFor={idTexto} className="font-semibold text-ink text-sm">
            Texto do pedido
          </label>
          <span className="text-slate-400 text-xs tabular-nums">
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
          className="w-full resize-y rounded-xl border border-borderLine bg-slate-50 p-3 text-[14px] text-slate-700 leading-[1.6]"
        />
        <p className="text-subtleText text-xs">
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
                className="inline-flex cursor-pointer items-center gap-1 text-accent underline"
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
      <p className="border-slate-200/80 border-t pt-3 text-slate-500 text-xs">
        Pela Lei de Acesso à Informação, quando não responde na hora, o órgão
        tem até 20 dias. Pode prorrogar por mais 10 dias, com justificativa.
      </p>
    </div>
  );
}

function PedidoEsclarecimento({ item }: { item: FarmaciaSentinelaItem }) {
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
        className="inline-flex cursor-pointer items-center gap-1 py-1 font-semibold text-accent text-xs hover:underline"
      >
        Pedir esclarecimento
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
      <ModalDialog
        isOpen={aberto}
        onClose={fechar}
        title="Pedir esclarecimento"
        subtitle={`${item.nomePrincipioAtivo} · não aparece no estoque`}
        subtitleClassName="line-clamp-2"
        badge={
          <span className="inline-flex items-center gap-1 text-slate-500 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Lei de Acesso à Informação
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
          <li
            key={item.codigoPrincipioAtivo}
            className="border-slate-100 border-b"
          >
            {item.pedido ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3">
                <Link
                  href={item.href}
                  className="min-w-0 text-left hover:bg-[#f7f8fa]"
                >
                  <span className="block font-semibold text-ink text-sm">
                    {item.nomePrincipioAtivo}
                  </span>
                  <span className="block text-subtleText text-xs">
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
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 text-left hover:bg-[#f7f8fa]"
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
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
