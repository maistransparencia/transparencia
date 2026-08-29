import type {
  OpacidadeContabilMetricsDTO,
  OpacidadeCredorDTO,
  OpacidadeMetricasExercicioDTO,
} from "@transparencia/db";
import { fmtCompact, fmtCurrency, fmtPercent } from "@transparencia/ui";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Layers,
  ShieldCheck,
} from "lucide-react";

export interface TermometroOpacidadeFiscalProps {
  data: OpacidadeContabilMetricsDTO | null;
  className?: string;
}

function getRiscoConfig(
  classificacao: OpacidadeMetricasExercicioDTO["classificacaoRisco"],
) {
  if (classificacao === "critico") {
    return {
      label: "Concentração Elevada em .99",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      barClass: "bg-amber-600",
      textColor: "text-amber-800",
      statusText: "Uso Elevado",
      icon: AlertTriangle,
    };
  }
  if (classificacao === "atencao") {
    return {
      label: "Uso Moderado de .99",
      badgeClass: "bg-yellow-50 text-yellow-800 border-yellow-200",
      barClass: "bg-yellow-500",
      textColor: "text-yellow-800",
      statusText: "Uso Moderado",
      icon: AlertTriangle,
    };
  }
  return {
    label: "Uso Residual Esperado",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    barClass: "bg-emerald-500",
    textColor: "text-emerald-700",
    statusText: "Uso Residual Esperado",
    icon: ShieldCheck,
  };
}

function formatCategoriaSensivel(
  cat: OpacidadeCredorDTO["categoriaPredominante"],
): string {
  if (cat === "locacao_maquinas_veiculos")
    return "Locação de Máquinas & Frotas";
  if (cat === "eventos_festas") return "Eventos & Festividades";
  if (cat === "combustivel_frota") return "Combustíveis & Abastecimento";
  if (cat === "obras_infraestrutura") return "Obras & Infraestrutura";
  if (cat === "locacao_imoveis") return "Locação de Imóveis";
  if (cat === "diarias_viagens") return "Diárias & Viagens";
  return "Subitem Genérico (.99)";
}

export function TermometroOpacidadeFiscal({
  data,
  className = "",
}: TermometroOpacidadeFiscalProps) {
  if (!data?.exercicioAtual) return null;

  const { exercicioAtual, limiares, topCredores, basesLegais } = data;
  const risco = getRiscoConfig(exercicioAtual.classificacaoRisco);
  const StatusIcon = risco.icon;

  const baseLegalPrincipal = basesLegais.find(
    (b) => b.chave.includes("especificacao") || b.baseLegal.includes("4.320"),
  ) ??
    basesLegais[0] ?? {
      baseLegal: "Lei 4.320/64 Arts. 5º e 15",
      urlBaseLegal: "http://www.planalto.gov.br/ccivil_03/leis/l4320.htm",
    };

  const taxaExibida = Math.min(
    100,
    Math.max(0, exercicioAtual.taxaValorOpacidadePct),
  );

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all ${className}`}
      data-testid="termometro-opacidade-fiscal"
    >
      {/* Cabeçalho do Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-700 text-xs">
              <Layers className="h-3.5 w-3.5 text-slate-500" />
              Classificação Orçamentária
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-xs ${risco.badgeClass}`}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {risco.label}
            </span>
          </div>
          <h2 className="font-bold text-lg text-slate-900">
            Monitoramento de Gastos Genéricos (Subitens .99)
          </h2>
        </div>

        {/* Link Referência Normativa */}
        {baseLegalPrincipal.urlBaseLegal && (
          <a
            href={baseLegalPrincipal.urlBaseLegal}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-600 text-xs hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 sm:self-center"
          >
            <span>Referência: {baseLegalPrincipal.baseLegal}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
          </a>
        )}
      </div>

      {/* Descrição Didática e Cidadã */}
      <p className="mt-3 text-slate-600 text-sm leading-relaxed">
        Acompanhamento da proporção de despesas municipais registradas sob
        subitens genéricos de apoio (como{" "}
        <em>&ldquo;Outros Serviços de Terceiros - PJ&rdquo;</em> e{" "}
        <em>&ldquo;Outros Materiais&rdquo;</em>). A Lei Federal nº 4.320/64
        (Arts. 5º e 15) recomenda que as despesas sejam devidamente
        especificadas; as faixas de {limiares.limiteAtencaoPct}% e{" "}
        {limiares.limiteCriticoPct}% são parâmetros metodológicos do portal para
        acompanhamento estatístico da concentração desses gastos.
      </p>

      {/* Termômetro Visual com Legendas Alinhadas com os Marcadores */}
      <div className="mt-6 space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Taxa de Uso de Subitens Genéricos:{" "}
            <span className={`font-bold text-base ${risco.textColor}`}>
              {fmtPercent(exercicioAtual.taxaValorOpacidadePct)}
            </span>
          </span>
          <span className="text-slate-500">
            Parâmetros do Portal: até {limiares.limiteAtencaoPct}% esperado ·
            acima de {limiares.limiteCriticoPct}% elevado
          </span>
        </div>

        {/* Barra de Progresso com Marcadores */}
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full transition-all duration-500 ${risco.barClass}`}
            style={{ width: `${taxaExibida}%` }}
          />
          {/* Marcador de 15% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-400/80"
            style={{ left: `${limiares.limiteAtencaoPct}%` }}
            title={`Limite de Atenção (${limiares.limiteAtencaoPct}%)`}
          />
          {/* Marcador de 30% */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-600/80"
            style={{ left: `${limiares.limiteCriticoPct}%` }}
            title={`Limite Elevado (${limiares.limiteCriticoPct}%)`}
          />
        </div>

        {/* Legendas com Posicionamento Absoluto Exato e Responsivo */}
        <div className="relative h-4 text-[11px] text-slate-500">
          <span className="absolute left-0">
            <span className="hidden sm:inline">0% (Mínimo)</span>
            <span className="sm:hidden">0%</span>
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-medium text-amber-700"
            style={{ left: `${limiares.limiteAtencaoPct}%` }}
          >
            <span className="hidden sm:inline">
              Atenção ({limiares.limiteAtencaoPct}%)
            </span>
            <span className="sm:hidden">{limiares.limiteAtencaoPct}%</span>
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap font-medium text-rose-700"
            style={{ left: `${limiares.limiteCriticoPct}%` }}
          >
            <span className="hidden sm:inline">
              Elevado (&gt;{limiares.limiteCriticoPct}%)
            </span>
            <span className="sm:hidden">&gt;{limiares.limiteCriticoPct}%</span>
          </span>
          <span className="absolute right-0">100%</span>
        </div>
      </div>

      {/* Grid de 4 Indicadores Informativos */}
      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <span className="block text-slate-500 text-xs">
            Total Pago em .99
          </span>
          <span className="mt-1 block font-bold text-lg text-slate-900">
            {fmtCompact(exercicioAtual.pagoResidual99)}
          </span>
          <span className="text-[11px] text-slate-500">
            de {fmtCompact(exercicioAtual.totalPago)} pagos no ano
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <span className="block text-slate-500 text-xs">Empenhos em .99</span>
          <span className="mt-1 block font-bold text-lg text-slate-900">
            {exercicioAtual.empenhosResidual99}
          </span>
          <span className="text-[11px] text-slate-500">
            {fmtPercent(exercicioAtual.taxaEmpenhosOpacidadePct)} dos atos de
            empenho
          </span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-none">
          <span className="block font-medium text-amber-900 text-xs">
            Gastos com Categoria Identificada
          </span>
          <span className="mt-1 block font-bold text-amber-900 text-lg">
            {fmtCompact(exercicioAtual.pagoDesvioSensivel99)}
          </span>
          <span className="text-[11px] text-amber-700">
            {fmtPercent(exercicioAtual.taxaDesvioSensivelPct)} do .99 com objeto
            mapeado
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <span className="block text-slate-500 text-xs">
            Faixa de Concentração
          </span>
          <span className={`mt-1 block font-bold text-base ${risco.textColor}`}>
            {risco.statusText}
          </span>
          <span className="text-[11px] text-slate-500">
            Parâmetro do Portal (Lei 4.320/64)
          </span>
        </div>
      </div>

      {/* Gaveta de Maiores Fornecedores em Subitens .99 */}
      {topCredores.length > 0 && (
        <details className="group mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all">
          <summary className="flex cursor-pointer select-none items-center justify-between font-semibold text-slate-800 text-sm">
            <span className="flex items-center gap-2">
              <span>
                Maiores Fornecedores em Subitens Genéricos (.99) (Top{" "}
                {topCredores.length})
              </span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 font-normal text-slate-700 text-xs">
                Detalhamento por Fornecedor
              </span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
          </summary>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-slate-700 text-xs">
              <thead className="border-slate-200 border-b bg-slate-100/70 font-semibold text-slate-600">
                <tr>
                  <th className="px-3 py-2.5">#</th>
                  <th className="px-3 py-2.5">Fornecedor / CNPJ</th>
                  <th className="px-3 py-2.5">Total Pago (.99)</th>
                  <th className="px-3 py-2.5">
                    Classificação Sugerida pelo Objeto
                  </th>
                  <th className="px-3 py-2.5">Descrição do Objeto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70">
                {topCredores.map((credor) => {
                  const hasCategoriaSugerida =
                    credor.categoriaPredominante !==
                      "sem_classificacao_especifica" &&
                    credor.pagoDesvioSensivel > 0;

                  return (
                    <tr
                      key={credor.credorCodigo + credor.ranking}
                      className="hover:bg-slate-100/50"
                    >
                      <td className="px-3 py-2.5 font-semibold text-slate-500">
                        #{credor.ranking}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-900">
                          {credor.credorNome}
                        </div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {credor.credorCodigo}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-900">
                        {fmtCurrency(credor.totalPago)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {hasCategoriaSugerida ? (
                          <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 font-medium text-[11px] text-amber-900">
                            {formatCategoriaSensivel(
                              credor.categoriaPredominante,
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] text-slate-600">
                            Sem categoria específica
                          </span>
                        )}
                      </td>
                      <td
                        className="max-w-xs truncate px-3 py-2.5 text-[11px] text-slate-600"
                        title={credor.amostraObjeto}
                      >
                        {credor.amostraObjeto}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
