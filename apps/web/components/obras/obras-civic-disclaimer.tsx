"use client";

import { Check, Copy, ExternalLink, MessageSquare } from "lucide-react";
import { useRef, useState } from "react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface ObrasCivicDisclaimerProps {
  municipioNome?: string;
  municipioUf?: string;
}

export function buildTextoReivindicacao(
  municipioNome?: string,
  municipioUf?: string,
): string {
  const localizacao = municipioNome
    ? `${municipioNome}${municipioUf ? `/${municipioUf}` : ""}`
    : "nosso município";

  return `Prezado(a) Vereador(a) / Gabinete Parlamentar,

Como cidadão(ã) e eleitor(a) de ${localizacao}, estive acompanhando as obras públicas pelo portal de transparência municipal e observei que algumas intervenções urbanas cadastradas no sistema federal ObrasGov.br não possuem a vinculação completa com seus respectivos contratos, licitações ou medições fiscais.

Solicito sua atenção e fiscalização parlamentar junto ao Poder Executivo Municipal para que o órgão responsável atualize e regularize o cadastro dessas obras no ObrasGov.br, garantindo total transparência, controle social e conformidade com a Lei de Acesso à Informação (Lei nº 12.527/2011) e com a Nova Lei de Licitações (Lei nº 14.133/2021).

Contamos com o seu zelo e representatividade pelos recursos públicos de ${localizacao}.

Atenciosamente,
Cidadão(ã) e Eleitor(a) de ${localizacao}`;
}

export function ObrasCivicDisclaimer({
  municipioNome,
  municipioUf,
}: ObrasCivicDisclaimerProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textoCobrança = buildTextoReivindicacao(municipioNome, municipioUf);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(textoCobrança);
        setCopied(true);
        if (copyTimeoutRef.current) {
          clearTimeout(copyTimeoutRef.current);
        }
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2500);
      }
    } catch {
      // Fallback gracioso caso clipboard API esteja indisponível
    }
  };

  return (
    <section
      aria-labelledby="titulo-disclaimer-obrasgov"
      className="border-line border-y py-6"
    >
      <div className="gap-6 space-y-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow">
              Controle Social & Transparência Pública
            </span>
          </div>

          <h2 id="titulo-disclaimer-obrasgov">
            Notou obras sem contrato ou licitação vinculados?
          </h2>

          <p className="text-mute">
            As intervenções desta página são obtidas diretamente do cadastro
            oficial no{" "}
            <a
              href={FONTES_OFICIAIS.obrasgov.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              <span>ObrasGov.br</span>
              <ExternalLink className="inline h-3.5 w-3.5" aria-hidden="true" />
            </a>
            . O vínculo com contratos e licitações municipais, bem como valores
            declarados, dependem do preenchimento e da atualização constante por
            parte dos gestores do Poder Executivo no sistema federal.
          </p>

          <p className="text-mute">
            Se alguma obra estiver sem vinculação ou com informações
            desatualizadas, você pode exercer sua cidadania cobrando as
            autoridades municipais e os vereadores para que solicitem a devida
            regularização no ObrasGov.br, em conformidade com a{" "}
            <a
              href={urlLegislacao("lai")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              <span>Lei nº 12.527/2011 (LAI)</span>
              <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
            </a>{" "}
            e a{" "}
            <a
              href={urlLegislacao("lei14133")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5"
            >
              <span>Lei nº 14.133/2021</span>
              <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
            </a>
            .
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm focus:outline-hidden focus:ring-2 focus:ring-focus-ring focus:ring-offset-2 ${
              copied ? "bg-ok-text text-onink" : "bg-ink text-onink"
            }`}
            aria-label="Copiar mensagem para cobrar vereador ou autoridade"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Mensagem copiada!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                <span>Copiar texto para vereador</span>
              </>
            )}
          </button>

          <a
            href={FONTES_OFICIAIS.obrasgov.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-line bg-page px-4 py-2 text-mute text-sm no-underline hover:bg-line2 hover:text-ink focus:outline-hidden focus:ring-2 focus:ring-focus-ring"
          >
            <MessageSquare className="h-4 w-4 text-mute2" aria-hidden="true" />
            <span>Conhecer o ObrasGov.br</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-mute2"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 border-ok-fill border-l-[3px] bg-ok-fill/15 px-3 py-2 text-ink text-xs"
        >
          Texto formal copiado com sucesso! Você pode colar em um e-mail,
          mensagem de WhatsApp ou canal de ouvidoria para enviar ao seu vereador
          ou à Câmara Municipal.
        </div>
      )}
    </section>
  );
}
