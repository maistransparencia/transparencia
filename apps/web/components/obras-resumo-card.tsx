"use client";

import type { ResumoObrasDTO } from "@transparencia/db";
import { fmtCompact, fmtNumber } from "@transparencia/ui";
import { ArrowRight, HardHat } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import {
  CLASSE_ACAO_DESTAQUE,
  DestaqueLinha,
  type DestaqueTom,
} from "./destaque-linha";

export interface ObrasResumoCardProps {
  resumo?: ResumoObrasDTO | null;
  detailUrl: string;
  className?: string;
}

interface ApresentacaoObras {
  badgeTexto: string;
  tom: DestaqueTom;
  contexto: string;
  dado: string | null;
}

function apresentarObras(resumo: ResumoObrasDTO): ApresentacaoObras {
  if (resumo.totalObras <= 0) {
    return {
      badgeTexto: "Sem obras registradas",
      tom: "neutro",
      contexto:
        "Nenhuma obra pública registrada no ObrasGov.br para o período.",
      dado: null,
    };
  }
  if (resumo.paralisadas > 0) {
    return {
      badgeTexto: "Alerta",
      tom: "alerta",
      contexto:
        "Obras públicas que estão paradas e ainda não foram concluídas.",
      dado: `${fmtNumber(resumo.paralisadas)} ${resumo.paralisadas === 1 ? "obra" : "obras"} · ${fmtCompact(resumo.valorParalisadas)} ${resumo.paralisadas === 1 ? "parado" : "parados"}`,
    };
  }
  return {
    badgeTexto: "Em dia",
    tom: "positivo",
    contexto: "Nenhuma obra pública parada entre as registradas no município.",
    dado: `${fmtNumber(resumo.totalObras)} ${resumo.totalObras === 1 ? "obra registrada" : "obras registradas"}`,
  };
}

function trackCta(detailUrl: string, totalObras: number) {
  try {
    posthog.capture("obras_card_cta_clicked", { detailUrl, totalObras });
    posthog.capture("funnel_home_to_internal_page", {
      from: "obras_resumo_card",
      to: detailUrl,
    });
  } catch {
    // Silencia erros de telemetria
  }
}

/** Linha compacta da seção "Em destaque". Sem resumo, a linha não aparece. */
export function ObrasResumoCard({
  resumo,
  detailUrl,
  className = "",
}: ObrasResumoCardProps) {
  if (!resumo) return null;

  const { badgeTexto, tom, contexto, dado } = apresentarObras(resumo);
  const emAlerta = tom === "alerta";

  return (
    <DestaqueLinha
      ariaLabel="Obras públicas"
      icone={HardHat}
      titulo={emAlerta ? "Obras paralisadas" : "Obras públicas"}
      badgeTexto={badgeTexto}
      tom={tom}
      contexto={contexto}
      className={className}
      dado={
        dado ? (
          <p className="font-bold font-serif text-ink text-lg leading-tight tracking-tight">
            {dado}
          </p>
        ) : undefined
      }
      acao={
        <Link
          href={detailUrl}
          onClick={() => trackCta(detailUrl, resumo.totalObras)}
          className={CLASSE_ACAO_DESTAQUE}
        >
          <span>{emAlerta ? "Ver mapa" : "Ver obras"}</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    />
  );
}
