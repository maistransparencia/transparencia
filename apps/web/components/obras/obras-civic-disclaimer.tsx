"use client";

import { Check, Copy, ExternalLink, MessageSquare } from "lucide-react";
import { useRef, useState } from "react";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

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
      className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-sky-50/40 p-6 shadow-xs sm:p-8"
    >
      <div className="gap-6 space-y-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sky-900 text-xs uppercase tracking-wider">
              Controle Social & Transparência Pública
            </span>
          </div>

          <h2
            id="titulo-disclaimer-obrasgov"
            className="font-bold font-serif text-slate-900 text-xl sm:text-2xl"
          >
            Notou obras sem contrato ou licitação vinculados?
          </h2>

          <p className="text-slate-600 text-sm leading-relaxed">
            As intervenções desta página são obtidas diretamente do cadastro
            oficial no{" "}
            <a
              href={FONTES_OFICIAIS.obrasgov.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-sky-800 hover:text-sky-950 hover:underline"
            >
              <span>ObrasGov.br</span>
              <ExternalLink className="inline h-3.5 w-3.5" aria-hidden="true" />
            </a>
            . O vínculo com contratos e licitações municipais, bem como valores
            declarados, dependem do preenchimento e da atualização constante por
            parte dos gestores do Poder Executivo no sistema federal.
          </p>

          <p className="text-slate-600 text-sm leading-relaxed">
            Se alguma obra estiver sem vinculação ou com informações
            desatualizadas, você pode exercer sua cidadania cobrando as
            autoridades municipais e os vereadores para que solicitem a devida
            regularização no ObrasGov.br, em conformidade com a{" "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-800 hover:underline"
            >
              <span>Lei nº 12.527/2011 (LAI)</span>
              <ExternalLink className="inline h-3 w-3" aria-hidden="true" />
            </a>{" "}
            e a{" "}
            <a
              href="https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-medium text-sky-800 hover:underline"
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
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
              copied
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-900 text-white shadow-xs hover:bg-slate-800"
            }`}
            aria-label="Copiar mensagem para cobrar vereador ou autoridade"
          >
            {copied ? (
              <>
                <Check
                  className="h-4 w-4 text-emerald-100"
                  aria-hidden="true"
                />
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
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 text-sm hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          >
            <MessageSquare
              className="h-4 w-4 text-slate-500"
              aria-hidden="true"
            />
            <span>Conhecer o ObrasGov.br</span>
            <ExternalLink
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      {copied && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 text-xs"
        >
          Texto formal copiado com sucesso! Você pode colar em um e-mail,
          mensagem de WhatsApp ou canal de ouvidoria para enviar ao seu vereador
          ou à Câmara Municipal.
        </div>
      )}
    </section>
  );
}
