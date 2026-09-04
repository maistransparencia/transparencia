import type {
  OpacidadeContabilMetricsDTO,
  OpacidadeCredorDTO,
  OpacidadeMetricasExercicioDTO,
} from "@transparencia/db";
import {
  fmtCompact,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
} from "@transparencia/ui";
import {
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { ShowYourWorkButton } from "./show-your-work-button";

export interface TermometroOpacidadeFiscalProps {
  data: OpacidadeContabilMetricsDTO | null;
  portalSlug?: string;
  entidades?: string;
  className?: string;
}

function getRiscoConfig(
  classificacao: OpacidadeMetricasExercicioDTO["classificacaoRisco"],
) {
  if (classificacao === "critico") {
    return {
      label: "Uso Elevado de .99",
      badgeClass: "bg-rose-50 text-rose-800 border-rose-200",
      barClass: "bg-rose-500",
      textColor: "text-rose-800",
      statusText: "Elevado",
      icon: AlertTriangle,
    };
  }
  if (classificacao === "atencao") {
    return {
      label: "Atenção (.99)",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
      barClass: "bg-amber-500",
      textColor: "text-amber-800",
      statusText: "Atenção",
      icon: AlertTriangle,
    };
  }
  return {
    label: "Uso Esperado de .99",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    barClass: "bg-emerald-500",
    textColor: "text-emerald-700",
    statusText: "Esperado",
    icon: ShieldCheck,
  };
}

function formatCategoriaSensivel(
  cat: OpacidadeCredorDTO["categoriaPredominante"],
): string {
  if (cat === "consorcios_publicos") return "Consórcios de Saúde";
  if (cat === "limpeza_residuos") return "Limpeza Urbana & Resíduos";
  if (cat === "plantoes_medicos") return "Plantões Médicos";
  if (cat === "bloqueios_sentencas") return "Bloqueios & Sentenças";
  if (cat === "terceirizacao_mao_obra") return "Mão de Obra Terceirizada";
  if (cat === "previdencia") return "Previdência";
  if (cat === "consultoria_tecnica") return "Consultoria Técnica";
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
  portalSlug,
  entidades,
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
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-medium text-slate-700 text-xs">
              <Layers className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              Classificação Orçamentária
            </span>
            <span
              className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-semibold text-xs ${risco.badgeClass}`}
            >
              <StatusIcon className="h-3.5 w-3.5 shrink-0" />
              {risco.label}
            </span>
          </div>
          <h2 className="font-bold text-lg text-slate-900">
            Monitoramento de Gastos Genéricos (Subitens .99)
          </h2>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {/* Link Referência Normativa */}
          {baseLegalPrincipal.urlBaseLegal && (
            <a
              href={baseLegalPrincipal.urlBaseLegal}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-slate-600 text-xs hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
            >
              <span>Referência: {baseLegalPrincipal.baseLegal}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </a>
          )}

          {/* Botão sutil de 3 pontos para Show Your Work */}
          <ShowYourWorkButton
            portalSlug={portalSlug || data.portalSlug}
            ano={exercicioAtual.ano}
            tipo="opacidade_99"
            entidades={entidades}
            tituloContexto="Gastos Genéricos (.99)"
          />
        </div>
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
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <div>
            <span className="block text-slate-500 text-xs">
              Total Pago em .99
            </span>
            <span className="mt-1 block font-bold text-lg text-slate-900">
              {fmtCompact(exercicioAtual.pagoResidual99)}
            </span>
          </div>
          <span className="mt-2 text-[11px] text-slate-500">
            {fmtPercent(exercicioAtual.taxaValorOpacidadePct)} de{" "}
            {fmtCompact(exercicioAtual.totalPago)} pagos
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <div>
            <span className="block text-slate-500 text-xs">
              Empenhos em .99
            </span>
            <span className="mt-1 block font-bold text-lg text-slate-900">
              {fmtNumber(exercicioAtual.empenhosResidual99)}
            </span>
          </div>
          <span className="mt-2 text-[11px] text-slate-500">
            {fmtPercent(exercicioAtual.taxaEmpenhosOpacidadePct)} de{" "}
            {fmtNumber(exercicioAtual.totalEmpenhos)} atos
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-none">
          <div>
            <span className="block font-medium text-amber-900 text-xs">
              Genéricos com Objeto Mapeado
            </span>
            <span className="mt-1 block font-bold text-amber-900 text-lg">
              {fmtCompact(exercicioAtual.pagoDesvioSensivel99)}
            </span>
          </div>
          <span className="mt-2 text-[11px] text-amber-700">
            {fmtPercent(exercicioAtual.taxaDesvioSensivelPct)} de{" "}
            {fmtCompact(exercicioAtual.pagoResidual99)} em .99
          </span>
        </div>

        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-none">
          <div>
            <span className="block text-slate-500 text-xs">
              Faixa de Concentração
            </span>
            <span
              className={`mt-1 block font-bold text-base ${risco.textColor}`}
            >
              {risco.statusText}
            </span>
          </div>
          <span className="mt-2 text-[11px] text-slate-500">
            Parâmetro Metodológico
          </span>
        </div>
      </div>

      {/* Quebra por Elemento Pai de Despesas (.99) */}
      {data.elementosResidual99 &&
        data.elementosResidual99.length > 0 &&
        (() => {
          const elemPrincipal = data.elementosResidual99[0];
          const top5Elementos = data.elementosResidual99.slice(0, 5);
          const demaisElementos = data.elementosResidual99.slice(5);

          return (
            <div className="mt-6 space-y-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">
                    Concentração por Elemento Pai (Subitens .99)
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Distribuição dos {fmtCompact(exercicioAtual.pagoResidual99)}{" "}
                    pagos em .99 entre as naturezas orçamentárias
                  </p>
                </div>
                <span className="font-medium text-[11px] text-slate-400">
                  Top {top5Elementos.length} de{" "}
                  {data.elementosResidual99.length} naturezas
                </span>
              </div>

              {/* Callout Narrativo do Achado Principal */}
              {elemPrincipal && elemPrincipal.percentualDoResidual99 >= 30 && (
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-amber-950 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px]">
                      💡
                    </span>
                    <p className="leading-relaxed">
                      <strong className="font-bold text-amber-900">
                        Achado de Concentração:
                      </strong>{" "}
                      <span>
                        {elemPrincipal.percentualDoResidual99 >= 50
                          ? "Mais da metade"
                          : `Cerca de ${fmtPercent(elemPrincipal.percentualDoResidual99)}`}{" "}
                        ({fmtPercent(elemPrincipal.percentualDoResidual99)}) de
                        todos os gastos sob subitens genéricos está concentrada
                        no código{" "}
                        <strong className="font-mono font-semibold text-amber-900">
                          {elemPrincipal.elementoCodigo}.99 (
                          {elemPrincipal.elementoDescricao})
                        </strong>
                        , somando{" "}
                        <strong className="font-semibold text-amber-900">
                          {fmtCompact(elemPrincipal.totalPago)}
                        </strong>
                        . É nesta rubrica que reside a maior oportunidade de
                        especificação contábil pelo município.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Lista dos Top 5 Elementos */}
              <div className="space-y-2.5 pt-1">
                {top5Elementos.map((elem) => (
                  <div key={elem.elementoCodigo} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex min-w-0 items-center gap-2 pr-2">
                        <span className="shrink-0 font-bold font-mono text-[11px] text-slate-700">
                          {elem.elementoCodigo}.99
                        </span>
                        <span
                          className="truncate font-medium text-slate-800"
                          title={elem.elementoDescricao}
                        >
                          {elem.elementoDescricao}
                        </span>
                        {elem.tipoResidual === "estrutural" ? (
                          <span
                            className="inline-flex shrink-0 items-center rounded bg-sky-100 px-1.5 py-0.5 font-medium text-[10px] text-sky-800"
                            title="Despesa compulsória por obrigação legal ou ordem judicial"
                          >
                            Estrutural
                          </span>
                        ) : (
                          <span
                            className="inline-flex shrink-0 items-center rounded bg-amber-100/80 px-1.5 py-0.5 font-medium text-[10px] text-amber-900"
                            title="Despesa passível de detalhamento específico no plano de contas"
                          >
                            Evitável
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-right">
                        <span className="font-bold text-slate-900">
                          {fmtCompact(elem.totalPago)}
                        </span>
                        <span className="w-12 text-right font-medium text-[11px] text-slate-500">
                          {fmtPercent(elem.percentualDoResidual99)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          elem.tipoResidual === "estrutural"
                            ? "bg-sky-600"
                            : "bg-slate-700"
                        }`}
                        style={{
                          width: `${Math.max(0, Math.min(100, elem.percentualDoResidual99))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Expansão das demais naturezas identificadas */}
              {demaisElementos.length > 0 && (
                <details className="group/demais mt-2 rounded-lg border border-slate-200/70 bg-white/70 p-3 transition-all">
                  <summary className="flex cursor-pointer select-none items-center justify-between font-medium text-slate-700 text-xs hover:text-slate-900">
                    <span>
                      Ver todas as {data.elementosResidual99.length} naturezas
                      residuais
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open/demais:rotate-180" />
                  </summary>
                  <div className="mt-3 space-y-2.5 border-slate-100 border-t pt-2.5">
                    {demaisElementos.map((elem) => (
                      <div key={elem.elementoCodigo} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex min-w-0 items-center gap-2 pr-2">
                            <span className="shrink-0 font-bold font-mono text-[11px] text-slate-700">
                              {elem.elementoCodigo}.99
                            </span>
                            <span
                              className="truncate font-medium text-slate-800"
                              title={elem.elementoDescricao}
                            >
                              {elem.elementoDescricao}
                            </span>
                            {elem.tipoResidual === "estrutural" ? (
                              <span
                                className="inline-flex shrink-0 items-center rounded bg-sky-100 px-1.5 py-0.5 font-medium text-[10px] text-sky-800"
                                title="Despesa compulsória por obrigação legal ou ordem judicial"
                              >
                                Estrutural
                              </span>
                            ) : (
                              <span
                                className="inline-flex shrink-0 items-center rounded bg-amber-100/80 px-1.5 py-0.5 font-medium text-[10px] text-amber-900"
                                title="Despesa passível de detalhamento específico no plano de contas"
                              >
                                Evitável
                              </span>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-2 text-right">
                            <span className="font-bold text-slate-900">
                              {fmtCompact(elem.totalPago)}
                            </span>
                            <span className="w-12 text-right font-medium text-[11px] text-slate-500">
                              {fmtPercent(elem.percentualDoResidual99)}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              elem.tipoResidual === "estrutural"
                                ? "bg-sky-600"
                                : "bg-slate-700"
                            }`}
                            style={{
                              width: `${Math.max(0, Math.min(100, elem.percentualDoResidual99))}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Nota Metodológica Didática */}
              <p className="border-slate-200/70 border-t pt-2.5 text-[11px] text-slate-500 leading-relaxed">
                <strong className="font-semibold text-slate-700">
                  Nota Metodológica:
                </strong>{" "}
                Despesas compulsórias por ordem judicial (como Sentenças{" "}
                <em>91.99</em>) ou encargos legais (como Contribuições Patronais{" "}
                <em>13.99</em>) são classificadas como{" "}
                <strong>Estruturais</strong> por determinação do plano de contas
                da STN. Já contratações de serviços (<em>39.99/36.99</em>) e
                materiais (<em>30.99</em>) são consideradas{" "}
                <strong>Evitáveis</strong>, pois contam com rubricas específicas
                na legislação orçamentária para discriminação do objeto.
              </p>
            </div>
          );
        })()}

      {/* Série Histórica de Exercícios Anteriores Fechados */}
      {(() => {
        const historicoAnterior = data.historico.filter(
          (h) => h.ano < exercicioAtual.ano,
        );
        if (historicoAnterior.length === 0) return null;

        return (
          <details className="group mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all">
            <summary className="flex cursor-pointer select-none items-start justify-between gap-2 font-semibold text-slate-800 text-sm sm:items-center">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span>
                  Evolução Histórica de Opacidade (Exercícios Anteriores
                  Fechados)
                </span>
                <span className="inline-flex w-fit shrink-0 whitespace-nowrap rounded-full bg-slate-200 px-2.5 py-0.5 font-normal text-slate-700 text-xs">
                  {historicoAnterior.length === 1
                    ? historicoAnterior[0]?.ano
                    : `${historicoAnterior[0]?.ano} – ${historicoAnterior[historicoAnterior.length - 1]?.ano}`}
                </span>
              </div>
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 sm:mt-0" />
            </summary>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
              {historicoAnterior.map((h) => {
                const configAno = getRiscoConfig(h.classificacaoRisco);
                return (
                  <div
                    key={h.ano}
                    className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {h.ano}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 font-semibold text-[10px] ${configAno.badgeClass}`}
                      >
                        {configAno.statusText}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`font-bold text-base ${configAno.textColor}`}
                      >
                        {fmtPercent(h.taxaValorOpacidadePct)}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {fmtCompact(h.pagoResidual99)} pagos
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })()}

      {/* Gaveta de Maiores Fornecedores em Subitens .99 */}
      {topCredores.length > 0 && (
        <details className="group mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all">
          <summary className="flex cursor-pointer select-none items-start justify-between gap-2 font-semibold text-slate-800 text-sm sm:items-center">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span>
                Maiores Fornecedores em Subitens Genéricos (.99) (Top{" "}
                {topCredores.length})
              </span>
              <span className="inline-flex w-fit shrink-0 whitespace-nowrap rounded-full bg-slate-200 px-2.5 py-0.5 font-normal text-slate-700 text-xs">
                Detalhamento por Fornecedor
              </span>
            </div>
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 sm:mt-0" />
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
