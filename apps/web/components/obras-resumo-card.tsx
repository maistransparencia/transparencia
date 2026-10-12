import type { ResumoObrasDTO } from "@transparencia/db";
import { fmtCompact, fmtNumber } from "@transparencia/ui";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";

const OBRASGOV_PANEL_URL =
  "https://dd-publico.serpro.gov.br/extensions/painel/ObrasgovbrIntervencao.html";

export interface ObrasResumoCardProps {
  resumo?: ResumoObrasDTO | null;
  detailUrl: string;
  className?: string;
}

export function ObrasResumoCard({
  resumo,
  detailUrl,
  className = "",
}: ObrasResumoCardProps) {
  if (!resumo || resumo.totalObras <= 0) {
    return (
      <section
        aria-label="Obras Públicas e Investimentos Urbanos"
        className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-base text-ink tracking-tight">
              Obras Públicas e Investimentos Urbanos
            </h3>
            <p className="text-subtleText text-xs">
              Painel oficial de intervenções urbanas (ObrasGov.br)
            </p>
          </div>
          <a
            href={OBRASGOV_PANEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink sm:self-auto"
            title="Painel de Obras Públicas do Governo Federal"
          >
            <span>ObrasGov.br</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-[#e7e9ee] border-dashed bg-slate-50/50 p-6 text-center">
          <AlertCircle className="mb-2 h-6 w-6 text-subtleText/60" />
          <p className="font-medium text-ink text-sm">
            Nenhuma obra ou intervenção pública registrada no ObrasGov.br para o
            período.
          </p>
          <div className="mt-3">
            <Link
              href={detailUrl}
              className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
            >
              <span>Ver mapa e detalhes das obras</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const {
    totalObras,
    emExecucao,
    paralisadas,
    concluidas,
    cadastradas,
    valorTotalInvestimento,
    valorEmExecucao,
    valorParalisadas,
    valorConcluidas,
    valorCadastradas,
  } = resumo;

  const totalCategoriasValor =
    valorEmExecucao + valorConcluidas + valorCadastradas + valorParalisadas;
  const isDistribuicaoPorValor = totalCategoriasValor > 0;

  const { pctEmExecucao, pctConcluidas, pctCadastradas, pctParalisadas } =
    (() => {
      if (totalCategoriasValor > 0) {
        const baseValor =
          valorTotalInvestimento > 0
            ? valorTotalInvestimento
            : totalCategoriasValor;
        return {
          pctEmExecucao: Math.min(
            Math.max((valorEmExecucao / baseValor) * 100, 0),
            100,
          ),
          pctConcluidas: Math.min(
            Math.max((valorConcluidas / baseValor) * 100, 0),
            100,
          ),
          pctCadastradas: Math.min(
            Math.max((valorCadastradas / baseValor) * 100, 0),
            100,
          ),
          pctParalisadas: Math.min(
            Math.max((valorParalisadas / baseValor) * 100, 0),
            100,
          ),
        };
      }
      if (totalObras > 0) {
        return {
          pctEmExecucao: Math.min(
            Math.max((emExecucao / totalObras) * 100, 0),
            100,
          ),
          pctConcluidas: Math.min(
            Math.max((concluidas / totalObras) * 100, 0),
            100,
          ),
          pctCadastradas: Math.min(
            Math.max((cadastradas / totalObras) * 100, 0),
            100,
          ),
          pctParalisadas: Math.min(
            Math.max((paralisadas / totalObras) * 100, 0),
            100,
          ),
        };
      }
      return {
        pctEmExecucao: 0,
        pctConcluidas: 0,
        pctCadastradas: 0,
        pctParalisadas: 0,
      };
    })();

  const labelPrefixo = isDistribuicaoPorValor
    ? "Distribuição do investimento"
    : "Distribuição das obras";
  const ariaLabel = `${labelPrefixo}: ${Math.round(pctEmExecucao)}% em execução, ${Math.round(pctConcluidas)}% concluídas, ${Math.round(pctCadastradas)}% não iniciadas, ${Math.round(pctParalisadas)}% paralisadas`;

  return (
    <section
      aria-label="Obras Públicas e Investimentos Urbanos"
      className={`rounded-2xl border border-[#e7e9ee] bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-bold text-base text-ink tracking-tight">
            Obras Públicas e Investimentos Urbanos
          </h3>
          <p className="text-subtleText text-xs">
            Painel oficial de intervenções urbanas (ObrasGov.br)
          </p>
        </div>

        <a
          href={OBRASGOV_PANEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-[#e7e9ee] bg-slate-50 px-3 py-1 font-medium text-subtleText text-xs transition-colors hover:bg-slate-100 hover:text-ink sm:self-auto"
          title="Painel de Obras Públicas do Governo Federal"
        >
          <span>ObrasGov.br</span>
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* Métricas Principais Consolidadas */}
      <div className="mt-5 grid grid-cols-1 items-end gap-4 md:grid-cols-[auto_1fr] md:gap-8">
        <div>
          <span className="font-medium text-subtleText text-xs uppercase tracking-wider">
            Total de Investimento Previsto
          </span>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-bold font-serif text-3xl text-ink tracking-tight">
              {fmtCompact(valorTotalInvestimento)}
            </p>
            <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-medium text-slate-700 text-xs">
              {fmtNumber(totalObras)} {totalObras === 1 ? "obra" : "obras"}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          {/* Barra Proporcional Empilhada */}
          <div
            className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={Math.round(pctConcluidas)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ariaLabel}
          >
            {pctEmExecucao > 0 && (
              <div
                className="bg-blue-500 transition-all duration-300"
                style={{ width: `${pctEmExecucao}%` }}
              />
            )}
            {pctConcluidas > 0 && (
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${pctConcluidas}%` }}
              />
            )}
            {pctCadastradas > 0 && (
              <div
                className="bg-slate-400 transition-all duration-300"
                style={{ width: `${pctCadastradas}%` }}
              />
            )}
            {pctParalisadas > 0 && (
              <div
                className="bg-rose-500 transition-all duration-300"
                style={{ width: `${pctParalisadas}%` }}
              />
            )}
          </div>

          {/* Legendas com Contadores e Montantes */}
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                <span className="text-subtleText">Em execução:</span>
              </div>
              <span className="ml-4 font-semibold text-ink">
                {fmtNumber(emExecucao)} ({fmtCompact(valorEmExecucao)})
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span className="text-subtleText">Concluídas:</span>
              </div>
              <span className="ml-4 font-semibold text-ink">
                {fmtNumber(concluidas)} ({fmtCompact(valorConcluidas)})
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
                <span className="text-subtleText">Não iniciadas:</span>
              </div>
              <span className="ml-4 font-semibold text-ink">
                {fmtNumber(cadastradas)} ({fmtCompact(valorCadastradas)})
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
                <span className="text-subtleText">Paralisadas:</span>
              </div>
              <span className="ml-4 font-semibold text-ink">
                {fmtNumber(paralisadas)} ({fmtCompact(valorParalisadas)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de Obras Paralisadas */}
      {paralisadas > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-rose-950 text-xs">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div className="leading-relaxed">
            <span className="font-semibold text-rose-900">
              Atenção: {paralisadas}{" "}
              {paralisadas === 1
                ? "obra pública paralisada"
                : "obras públicas paralisadas"}
              .
            </span>{" "}
            Montante de <strong>{fmtCompact(valorParalisadas)}</strong> em
            recursos de investimento paralisados no município.
          </div>
        </div>
      )}

      {/* Rodapé com Nota e CTA para o Mapa */}
      <div className="mt-5 flex flex-col gap-3 border-[#e7e9ee] border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5 text-subtleText text-xs">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span>
            Painel consolidado de intervenções e investimentos públicos via
            ObrasGov.br.
          </span>
        </div>

        <Link
          href={detailUrl}
          className="inline-flex items-center gap-1 font-semibold text-accent text-xs hover:underline"
        >
          <span>Ver mapa e detalhes das obras</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
