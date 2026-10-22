"use client";

import { ArrowRight, GraduationCap } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";
import {
  CLASSE_ACAO_DESTAQUE,
  DestaqueLinha,
  type DestaqueTom,
} from "./destaque-linha";

export type EducacaoResumoTom = "destaque" | "atencao" | "neutro";

export interface EducacaoResumoCardData {
  ano: number;
  notaIdebTexto: string;
  enfaseTom: EducacaoResumoTom;
  enfaseTitulo: string | null;
  evolucaoTexto: string | null;
  evolucaoTom: EducacaoResumoTom;
  notaAnteriorTexto: string | null;
  notaAnteriorValorTexto?: string | null;
  metaTexto: string | null;
  metaTom: EducacaoResumoTom;
  rankingTexto: string | null;
  rankingVariacaoTexto: string | null;
  rankingVariacaoTom: EducacaoResumoTom;
  exercicioDespesa: number;
  despesaLiquidadaEducacaoTexto: string | null;
  despesaLiquidadaEducacaoCompleta: string | null;
}

export interface EducacaoResumoCardProps {
  resumo?: EducacaoResumoCardData | null;
  detailUrl: string;
  className?: string;
}

const TOM_DESTAQUE_POR_TOM_EDUCACAO: Record<EducacaoResumoTom, DestaqueTom> = {
  destaque: "positivo",
  atencao: "atencao",
  neutro: "neutro",
};

function trackCta(detailUrl: string, ano: number) {
  try {
    posthog.capture("educacao_card_cta_clicked", { detailUrl, ano });
    posthog.capture("funnel_home_to_internal_page", {
      from: "educacao_resumo_card_footer",
      to: detailUrl,
    });
  } catch {
    // Silencia erros de telemetria
  }
}

/** A linha só existe quando há nota do IDEB para mostrar. */
export function temEducacaoDestaque(
  resumo?: EducacaoResumoCardData | null,
): resumo is EducacaoResumoCardData {
  return Boolean(resumo) && resumo?.notaIdebTexto !== "—";
}

/** Linha compacta da seção "Em destaque". Sem IDEB, a linha não aparece. */
export function EducacaoResumoCard({
  resumo,
  detailUrl,
  className = "",
}: EducacaoResumoCardProps) {
  if (!temEducacaoDestaque(resumo)) return null;

  const evolucao = resumo.notaAnteriorValorTexto
    ? `${resumo.notaAnteriorValorTexto} → ${resumo.notaIdebTexto}`
    : null;

  return (
    <DestaqueLinha
      ariaLabel="Educação"
      icone={GraduationCap}
      titulo={
        resumo.enfaseTom === "atencao" ? "Educação" : "Conquista da Educação"
      }
      badgeTexto={`IDEB ${resumo.ano}`}
      tom={TOM_DESTAQUE_POR_TOM_EDUCACAO[resumo.enfaseTom]}
      contexto={
        resumo.enfaseTitulo
          ? `${resumo.enfaseTitulo}. Fonte: INEP.`
          : `Nota do IDEB ${resumo.ano} nos anos iniciais da rede municipal: ${resumo.notaIdebTexto}. Fonte: INEP.`
      }
      className={className}
      dado={
        evolucao ? (
          <p
            data-testid="educacao-evolucao"
            className="font-bold font-serif text-ink text-xl leading-none tracking-tight"
          >
            <span className="sr-only">
              IDEB de {resumo.notaAnteriorValorTexto} para{" "}
              {resumo.notaIdebTexto}
            </span>
            <span aria-hidden="true">{evolucao}</span>
          </p>
        ) : (
          <p className="font-bold font-serif text-ink text-xl leading-none tracking-tight">
            {resumo.notaIdebTexto}
          </p>
        )
      }
      acao={
        <Link
          href={detailUrl}
          onClick={() => trackCta(detailUrl, resumo.ano)}
          className={CLASSE_ACAO_DESTAQUE}
        >
          <span>Ver Educação</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      }
    />
  );
}
