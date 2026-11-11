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
      <h2 id="em-breve-titulo" className="eyebrow mb-3">
        Em breve
      </h2>
      <div className="border-line bg-page flex flex-col items-start gap-5 rounded-3xl border-2 border-dashed p-6 sm:flex-row sm:items-center sm:p-7">
        <div className="bg-line2 text-brand-text flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3>Sua cidade ainda não está aqui</h3>
          <p className="text-mute mt-1 text-sm leading-relaxed">
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
          className="bg-brand-fill text-onink focus-visible:ring-brand min-h-11 w-full shrink-0 rounded-lg px-5 text-sm font-semibold transition-colors hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
        >
          Quero ser avisado
        </button>
      </div>
      <CityInterestModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </section>
  );
}
