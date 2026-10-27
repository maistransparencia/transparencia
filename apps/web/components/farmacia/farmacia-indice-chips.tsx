"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export interface FarmaciaIndiceChipItem {
  codigo: string;
  rotulo: string;
  href: string | null;
  ativo: boolean;
}

export interface FarmaciaIndiceChipsProps {
  chips: FarmaciaIndiceChipItem[];
}

function chipClasse(chip: FarmaciaIndiceChipItem): string {
  const base =
    "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full px-3 font-bold text-[17px] tracking-tight md:h-8 md:min-w-6 md:px-1 md:text-sm";
  const largura = chip.codigo === "todas" ? " px-4 md:px-2" : "";
  if (chip.ativo) return `${base}${largura} bg-ink text-white`;
  if (!chip.href) return `${base}${largura} text-slate-300`;
  return `${base}${largura} text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`;
}

const CLASSE_SETA =
  "absolute top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-borderLine bg-white text-ink shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent md:hidden";

/** Fração da largura visível percorrida a cada toque numa seta. */
const FRACAO_ROLAGEM_SETA = 0.7;

/**
 * Faixa de letras. No celular rola na horizontal, com setas para as letras
 * escondidas, e traz a letra ativa para o centro. No desktop as letras são
 * compactas para caber de uma vez e as setas ficam ocultas.
 */
export function FarmaciaIndiceChips({ chips }: FarmaciaIndiceChipsProps) {
  const faixaRef = useRef<HTMLDivElement>(null);
  const [escondidas, setEscondidas] = useState({ antes: false, depois: false });

  const atualizarSetas = useCallback(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const antes = faixa.scrollLeft > 1;
    const depois = faixa.scrollLeft + faixa.clientWidth < faixa.scrollWidth - 1;
    setEscondidas((atual) =>
      atual.antes === antes && atual.depois === depois
        ? atual
        : { antes, depois },
    );
  }, []);

  const codigoAtivo = chips.find((chip) => chip.ativo)?.codigo;

  // biome-ignore lint/correctness/useExhaustiveDependencies: recentra só quando a letra ativa muda
  useEffect(() => {
    const faixa = faixaRef.current;
    const ativo = faixa?.querySelector<HTMLElement>('[aria-current="true"]');
    if (faixa && ativo) {
      faixa.scrollLeft =
        ativo.offsetLeft - (faixa.clientWidth - ativo.offsetWidth) / 2;
    }
    atualizarSetas();
  }, [codigoAtivo, atualizarSetas]);

  useEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(atualizarSetas);
    observador.observe(faixa);
    return () => observador.disconnect();
  }, [atualizarSetas]);

  const rolar = (direcao: -1 | 1) => {
    const faixa = faixaRef.current;
    faixa?.scrollBy({
      left: direcao * faixa.clientWidth * FRACAO_ROLAGEM_SETA,
    });
  };

  return (
    <div className="relative">
      {escondidas.antes && (
        <button
          type="button"
          aria-label="Ver letras anteriores"
          onClick={() => rolar(-1)}
          className={`${CLASSE_SETA} left-0`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      <div
        ref={faixaRef}
        onScroll={atualizarSetas}
        className="relative overflow-x-auto scroll-smooth [scrollbar-width:none] motion-reduce:scroll-auto [&::-webkit-scrollbar]:hidden"
      >
        <nav
          aria-label="Índice alfabético"
          className="flex w-max min-w-full justify-between gap-0.5"
        >
          {chips.map((chip) =>
            chip.href && !chip.ativo ? (
              <Link
                key={chip.codigo}
                href={chip.href}
                scroll={false}
                className={chipClasse(chip)}
              >
                {chip.rotulo}
              </Link>
            ) : (
              <span
                key={chip.codigo}
                className={chipClasse(chip)}
                aria-current={chip.ativo ? "true" : undefined}
                aria-disabled={chip.ativo ? undefined : "true"}
              >
                {chip.rotulo}
              </span>
            ),
          )}
        </nav>
      </div>
      {escondidas.depois && (
        <button
          type="button"
          aria-label="Ver próximas letras"
          onClick={() => rolar(1)}
          className={`${CLASSE_SETA} right-0`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
