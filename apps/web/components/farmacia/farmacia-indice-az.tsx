import Link from "next/link";
import { FarmaciaDisponibilidadeUnidades } from "./farmacia-disponibilidade-unidades";
import {
  type FarmaciaIndiceChipItem,
  FarmaciaIndiceChips,
} from "./farmacia-indice-chips";
import { PedidoEsclarecimento } from "./farmacia-sentinelas";

export interface FarmaciaIndiceMedicamento {
  nomeMedicamento: string;
  unidadesComEstoque: number;
  /** Nulo quando o remédio só tem lote vencido: deixa de ser link. */
  href: string | null;
  semLoteValido: {
    rotulo: string;
    caminhoCompartilhamento: string;
    pedido: { texto: string; textoWhatsApp: string };
  } | null;
}

export interface FarmaciaIndiceGrupo {
  letra: string;
  rotuloLetra: string;
  rotuloTotal: string;
  medicamentos: FarmaciaIndiceMedicamento[];
  hrefTodos: string;
  rotuloTodos: string;
}

export interface FarmaciaIndiceViewModel {
  chips: FarmaciaIndiceChipItem[];
  /** "busca" mantém só os chips: a lista do índice cede lugar aos resultados. */
  modo: "resumo" | "letra" | "busca";
  letraSelecionada: string | null;
  rotuloLetraSelecionada: string | null;
  totalUnidades: number;
  grupos: FarmaciaIndiceGrupo[];
  rotuloTotalLetra: string;
  rotuloProgresso: string;
  hrefMais: string | null;
  rotuloMais: string;
  hrefResumo: string;
}

export interface FarmaciaIndiceAzProps {
  indice: FarmaciaIndiceViewModel;
  idSecao: string;
}

const CLASSE_LINK_ACAO =
  "inline-flex min-h-11 items-center font-semibold text-accent text-sm underline underline-offset-4";

function LinhaSemLoteValido({
  medicamento,
  semLoteValido,
}: {
  medicamento: FarmaciaIndiceMedicamento;
  semLoteValido: NonNullable<FarmaciaIndiceMedicamento["semLoteValido"]>;
}) {
  return (
    <div className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-3 text-left">
      <span className="block min-w-0 font-semibold text-ink text-sm">
        {medicamento.nomeMedicamento}
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <span className="text-[11px] text-attention">
          {semLoteValido.rotulo}
        </span>
        <PedidoEsclarecimento
          item={{
            codigoPrincipioAtivo: medicamento.nomeMedicamento,
            nomePrincipioAtivo: medicamento.nomeMedicamento,
            href: semLoteValido.caminhoCompartilhamento,
            pedido: semLoteValido.pedido,
            rotuloSituacao: semLoteValido.rotulo.toLowerCase(),
          }}
        />
      </span>
    </div>
  );
}

function LinhaMedicamento({
  medicamento,
  totalUnidades,
}: {
  medicamento: FarmaciaIndiceMedicamento;
  totalUnidades: number;
}) {
  if (medicamento.semLoteValido) {
    return (
      <li className="border-slate-100 border-b">
        <LinhaSemLoteValido
          medicamento={medicamento}
          semLoteValido={medicamento.semLoteValido}
        />
      </li>
    );
  }
  return (
    <li className="border-slate-100 border-b">
      <Link
        href={medicamento.href ?? "#"}
        className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 py-3 text-left hover:bg-[#f7f8fa]"
      >
        <span className="block min-w-0 font-semibold text-ink text-sm">
          {medicamento.nomeMedicamento}
        </span>
        <span className="flex flex-col items-end gap-1">
          <FarmaciaDisponibilidadeUnidades
            unidadesComRegistro={medicamento.unidadesComEstoque}
            totalUnidadesAtivas={totalUnidades}
          />
        </span>
      </Link>
    </li>
  );
}

function GrupoLetra({
  grupo,
  totalUnidades,
}: {
  grupo: FarmaciaIndiceGrupo;
  totalUnidades: number;
}) {
  return (
    <section
      aria-label={`Remédios com ${grupo.rotuloLetra}`}
      className="flex min-w-0 flex-col rounded-xl border border-borderLine bg-white px-4 pb-1"
    >
      <div className="flex items-baseline justify-between gap-2 border-ink border-b-2 pt-3 pb-2">
        <h3 className="font-bold text-2xl text-ink leading-none">
          {grupo.rotuloLetra}
        </h3>
        <span className="text-subtleText text-xs">{grupo.rotuloTotal}</span>
      </div>
      <ul>
        {grupo.medicamentos.map((medicamento) => (
          <LinhaMedicamento
            key={medicamento.nomeMedicamento}
            medicamento={medicamento}
            totalUnidades={totalUnidades}
          />
        ))}
      </ul>
      <Link href={grupo.hrefTodos} className={`mt-auto ${CLASSE_LINK_ACAO}`}>
        {grupo.rotuloTodos}
      </Link>
    </section>
  );
}

function Corpo({ indice }: { indice: FarmaciaIndiceViewModel }) {
  if (indice.modo === "busca") return null;

  if (indice.modo === "letra" && indice.grupos.length === 0) {
    return (
      <div className="rounded-xl border border-borderLine bg-white p-6 text-center text-sm text-subtleText">
        <p className="font-semibold text-ink">
          Nenhum remédio começa com {indice.rotuloLetraSelecionada}.
        </p>
        <p>
          Escolha outra letra ou{" "}
          <Link
            href={indice.hrefResumo}
            className="font-semibold text-accent underline"
          >
            Limpar filtros
          </Link>
          .
        </p>
      </div>
    );
  }

  const [letra] = indice.grupos;
  return (
    <div className="space-y-4">
      {indice.modo === "letra" && letra ? (
        <>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold text-ink text-sm">
              Remédios com {letra.rotuloLetra}
            </h3>
            <span className="text-subtleText text-xs">
              {indice.rotuloTotalLetra}
            </span>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-x-6 rounded-xl border border-borderLine bg-white px-5 py-1">
            {letra.medicamentos.map((medicamento) => (
              <LinhaMedicamento
                key={medicamento.nomeMedicamento}
                medicamento={medicamento}
                totalUnidades={indice.totalUnidades}
              />
            ))}
          </ul>
        </>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
          {indice.grupos.map((grupo) => (
            <GrupoLetra
              key={grupo.letra}
              grupo={grupo}
              totalUnidades={indice.totalUnidades}
            />
          ))}
        </div>
      )}
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p className="text-subtleText text-xs tabular-nums" role="status">
          {indice.rotuloProgresso}
        </p>
        <div className="flex w-full flex-col items-center gap-1 sm:w-auto sm:flex-row sm:gap-5">
          {indice.hrefMais && (
            <Link
              href={indice.hrefMais}
              scroll={false}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-ink bg-white px-6 font-semibold text-ink text-sm hover:bg-slate-50 sm:w-auto"
            >
              {indice.rotuloMais}
            </Link>
          )}
          {indice.modo === "letra" && (
            <Link href={indice.hrefResumo} className={CLASSE_LINK_ACAO}>
              Voltar para A–Z
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function FarmaciaIndiceAz({ indice, idSecao }: FarmaciaIndiceAzProps) {
  return (
    <section
      id={idSecao}
      aria-labelledby={`${idSecao}-titulo`}
      className="flex scroll-mt-4 flex-col gap-4"
    >
      <div className="space-y-1">
        <h2
          id={`${idSecao}-titulo`}
          className="font-bold font-serif text-2xl text-ink"
        >
          Procurar por letra
        </h2>
        <p className="text-[13px] text-subtleText">
          Escolha a inicial do remédio. Os quadradinhos mostram em quantas
          unidades ele consta na lista de estoque.
        </p>
      </div>
      <FarmaciaIndiceChips chips={indice.chips} />
      <Corpo indice={indice} />
    </section>
  );
}
