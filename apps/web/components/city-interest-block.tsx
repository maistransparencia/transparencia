"use client";

import { MapPin } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";
import { CityInterestModal } from "./city-interest-modal";

export interface CityInterestBlockProps {
  totalPortais?: number;
}

export function CityInterestBlock({
  totalPortais = 0,
}: CityInterestBlockProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section
      aria-labelledby="em-breve-titulo"
      className="mx-auto mt-10 w-full max-w-4xl"
    >
      <h2
        id="em-breve-titulo"
        className="mb-3 font-semibold text-subtleText text-xs uppercase tracking-widest"
      >
        Em breve
      </h2>
      <div className="flex flex-col items-start gap-5 rounded-3xl border-2 border-borderLine border-dashed bg-white p-6 sm:flex-row sm:items-center sm:p-7">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-accent">
          <MapPin className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold font-serif text-ink text-xl">
            Sua cidade ainda não está aqui
          </h3>
          <p className="mt-1 text-slate-700 text-sm leading-relaxed">
            Estamos chegando a novos municípios. Diga qual é a sua e avisamos
            por e-mail quando ela entrar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            try {
              posthog.capture("city_interest_cta_clicked", { totalPortais });
            } catch {}
            setIsOpen(true);
          }}
          className="min-h-11 w-full shrink-0 rounded-lg bg-accent px-5 font-semibold text-sm text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 sm:w-auto"
        >
          Quero ser avisado
        </button>
      </div>
      <CityInterestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </section>
  );
}
