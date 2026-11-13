import type {
  OpacidadeContabilMetricsDTO,
  OpacidadeCredorDTO,
  OpacidadeMetricasExercicioDTO,
} from "@transparencia/db";
import { Badge, fmtCompact, fmtNumber, fmtPercent } from "@transparencia/ui";
import { ChevronDown, ExternalLink, Lightbulb } from "lucide-react";
import { urlLegislacao } from "@/lib/constants/legislacao";
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
      badgeVariant: "danger" as const,
      barClass: "bg-danger-fill",
      textColor: "text-danger-text",
      statusText: "Muito alto",
    };
  }
  if (classificacao === "atencao") {
    return {
      badgeVariant: "warning" as const,
      barClass: "bg-warn-fill",
      textColor: "text-warn-text",
      statusText: "Atenção",
    };
  }
  return {
    badgeVariant: "success" as const,
    textColor: "text-ok-text",
    statusText: "Normal",
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
  if (cat === "locacao_equipamentos_saude") return "Equipamentos de Saúde";
  if (cat === "assistencia_domiciliar_home_care")
    return "Home Care & Domiciliar";
  if (cat === "pecas_manutencao_frota") return "Peças & Manutenção de Frotas";
  if (cat === "aluguel_social") return "Aluguel Social";
  if (cat === "locacao_maquinas_veiculos")
    return "Locação de Máquinas & Frotas";
  if (cat === "eventos_festas") return "Eventos & Festividades";
  if (cat === "combustivel_frota") return "Combustíveis & Abastecimento";
  if (cat === "obras_infraestrutura") return "Obras & Infraestrutura";
  if (cat === "locacao_imoveis") return "Locação de Imóveis";
  if (cat === "diarias_viagens") return "Diárias & Viagens";
  return "Outros (sem categoria definida)";
}

function ElementoResidualRow({
  elem,
}: {
  elem: OpacidadeContabilMetricsDTO["elementosResidual99"][number];
}) {
  const pct = Math.max(0, Math.min(100, elem.percentualDoResidual99 || 0));

  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3">
      <span className="text-ink text-sm font-medium">
        <span className="numeric text-mute2 mr-2 text-left text-xs">
          {elem.elementoCodigo}.99
        </span>
        {elem.elementoDescricao}
        <span className="numeric text-mute2 ml-2 text-left text-xs">
          {fmtPercent(elem.percentualDoResidual99)}
        </span>
      </span>
      <span className="text-ink text-right text-sm tabular-nums">
        {fmtCompact(elem.totalPago)}
      </span>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Percentual do elemento ${elem.elementoCodigo}.99`}
        className="bg-track col-span-full block h-1.5 w-full overflow-hidden"
      >
        <div className="bg-brand-fill h-full" style={{ width: `${pct}%` }} />
      </div>

      {elem.tipoResidual === "estrutural" ? (
        <span
          className="text-mute2 col-span-full text-xs"
          title="Obrigatório por lei ou decisão judicial"
        >
          Obrigatório por lei
        </span>
      ) : (
        <span
          className="text-warn-text col-span-full text-xs"
          title="Poderia ter sido registrado com mais detalhe"
        >
          Poderia ser detalhado
        </span>
      )}
    </div>
  );
}

export function TermometroOpacidadeFiscal({
  data,
  portalSlug,
  className = "",
}: TermometroOpacidadeFiscalProps) {
  if (!data?.exercicioAtual) return null;

  const { exercicioAtual, limiares, topCredores, basesLegais } = data;
  const maiorTotalCredor = Math.max(...topCredores.map((c) => c.totalPago), 1);
  const risco = getRiscoConfig(exercicioAtual.classificacaoRisco);

  const baseLegalPrincipal = basesLegais.find(
    (b) => b.chave.includes("especificacao") || b.baseLegal.includes("4.320"),
  ) ??
    basesLegais[0] ?? {
      baseLegal: "Lei 4.320/64 Arts. 5º e 15",
      urlBaseLegal: urlLegislacao("lei4320"),
    };

  const taxaExibida = Math.min(
    100,
    Math.max(0, exercicioAtual.taxaValorOpacidadePct),
  );

  return (
    <div
      className={`border-ink border-t-1 pt-6 ${className}`}
      data-testid="termometro-opacidade-fiscal"
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h2>Gastos registrados como &ldquo;Outros&rdquo;</h2>
        </div>
      </div>

      {/* Descrição Didática e Cidadã */}
      <p className="text-mute2 mt-3 text-sm leading-relaxed">
        Todo gasto da prefeitura é registrado com um tipo. Quando cai em{" "}
        <em>&ldquo;Outros&rdquo;</em> (por exemplo,{" "}
        <em>&ldquo;Outros serviços de terceiros&rdquo;</em>), fica difícil saber
        no que o dinheiro foi usado. Um pouco de &ldquo;Outros&rdquo; é normal.
        Aqui você vê quanto foi e onde pesa mais. A lei exige que o orçamento
        detalhe a despesa ao menos por tipo de gasto
        {baseLegalPrincipal.urlBaseLegal && (
          <>
            {" ("}
            <a
              href={baseLegalPrincipal.urlBaseLegal}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink hover:text-brand inline-flex items-center gap-1 underline underline-offset-2"
            >
              {baseLegalPrincipal.baseLegal}
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
            {")"}
          </>
        )}
        . Os limites de {limiares.limiteAtencaoPct}% e{" "}
        {limiares.limiteCriticoPct}% são referências do portal, não da lei.
        &ldquo;Outros&rdquo; fica um nível abaixo desse mínimo: não é
        irregularidade, mas dificulta acompanhar o gasto.
      </p>

      {/* Termômetro Visual com Legendas Alinhadas com os Marcadores */}
      <div className="mt-6 space-y-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs">
          <span className="text-ink text-sm font-medium">
            Parte dos pagamentos em &ldquo;Outros&rdquo;
          </span>
          <span className="text-mute2">
            Referência do portal: até {limiares.limiteAtencaoPct}% é comum ·
            acima de {limiares.limiteCriticoPct}% merece atenção
          </span>
        </div>

        <p
          className={`text-4xl leading-none font-bold tabular-nums ${risco.textColor}`}
        >
          {fmtPercent(exercicioAtual.taxaValorOpacidadePct)}
        </p>

        {/* Faixas empilhadas (verde, amarelo, vermelho) com um único marcador da taxa atual */}
        <div
          className="relative py-1"
          role="img"
          aria-label={`${fmtPercent(exercicioAtual.taxaValorOpacidadePct)} dos pagamentos em Outros`}
        >
          <div className="bg-track flex h-3.5 w-full overflow-hidden">
            <div
              className="bg-ok-fill h-full"
              style={{ width: `${limiares.limiteAtencaoPct}%` }}
            />
            <div
              className="bg-warn-fill h-full"
              style={{
                width: `${limiares.limiteCriticoPct - limiares.limiteAtencaoPct}%`,
              }}
            />
            <div
              className="bg-danger-fill h-full"
              style={{ width: `${100 - limiares.limiteCriticoPct}%` }}
            />
          </div>
          <div
            className="bg-ink absolute top-0 bottom-0 w-1 -translate-x-1/2"
            style={{ left: `${taxaExibida}%` }}
            data-testid="termometro-marcador"
          />
        </div>

        {/* Legendas com Posicionamento Absoluto Exato e Responsivo */}
        <div className="text-mute2 relative h-4 text-[11px]">
          <span className="absolute left-0">
            <span className="hidden sm:inline">0%</span>
            <span className="sm:hidden">0%</span>
          </span>
          <span
            className="text-warn-text absolute -translate-x-1/2 font-medium whitespace-nowrap"
            style={{ left: `${limiares.limiteAtencaoPct}%` }}
          >
            <span className="hidden sm:inline">
              Merece atenção ({limiares.limiteAtencaoPct}%)
            </span>
            <span className="sm:hidden">{limiares.limiteAtencaoPct}%</span>
          </span>
          <span
            className="text-danger-text absolute -translate-x-1/2 font-medium whitespace-nowrap"
            style={{ left: `${limiares.limiteCriticoPct}%` }}
          >
            <span className="hidden sm:inline">
              Muito alto (&gt;{limiares.limiteCriticoPct}%)
            </span>
            <span className="sm:hidden">&gt;{limiares.limiteCriticoPct}%</span>
          </span>
          <span className="absolute right-0">100%</span>
        </div>
      </div>

      {/* Grid de Indicadores Informativos */}
      <div className="divide-line border-line max-md:[&>*]:border-line mt-6 grid grid-cols-2 border-y md:grid-cols-4 md:divide-x [&>*]:px-4 [&>*]:py-3.5 md:[&>*:first-child]:pl-0 max-md:[&>*:nth-child(2n)]:border-l max-md:[&>*:nth-child(2n+1)]:pl-0 max-md:[&>*:nth-child(n+3)]:border-t">
        <div className="flex flex-col justify-between">
          <div>
            <span className="text-mute2 block text-xs">
              Pago em &ldquo;Outros&rdquo;
            </span>
            <span className="text-ink mt-1 block text-lg font-bold">
              {fmtCompact(exercicioAtual.pagoResidual99)}
            </span>
          </div>
          <span className="text-mute2 mt-2 text-[11px]">
            {fmtPercent(exercicioAtual.taxaValorOpacidadePct)} de{" "}
            {fmtCompact(exercicioAtual.totalPago)} pagos
          </span>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <span className="text-mute2 block text-xs">
              Compras e contratos em &ldquo;Outros&rdquo;
            </span>
            <span className="text-ink mt-1 block text-lg font-bold">
              {fmtNumber(exercicioAtual.empenhosResidual99)}
            </span>
          </div>
          <span className="text-mute2 mt-2 text-[11px]">
            {fmtPercent(exercicioAtual.taxaEmpenhosOpacidadePct)} de{" "}
            {fmtNumber(exercicioAtual.totalEmpenhos)} compras e contratos
          </span>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <span className="text-warn-text block text-xs font-medium">
              Em &ldquo;Outros&rdquo;, mas dá para saber do que se trata
            </span>
            <span className="text-warn-text mt-1 block text-lg font-bold">
              {fmtCompact(exercicioAtual.pagoDesvioSensivel99)}
            </span>
          </div>
          <span className="text-warn-text mt-2 text-[11px]">
            {fmtPercent(exercicioAtual.taxaDesvioSensivelPct)} de{" "}
            {fmtCompact(exercicioAtual.pagoResidual99)} em &ldquo;Outros&rdquo;
            (estimativa pela descrição do pagamento)
          </span>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <span className="text-mute2 block text-xs">Situação</span>
            <span
              className={`mt-1 block text-base font-bold ${risco.textColor}`}
            >
              {risco.statusText}
            </span>
          </div>
          <span className="text-mute2 mt-2 text-[11px]">
            Pela referência do portal
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
            <>
              {/* Callout Narrativo do Achado Principal */}
              {elemPrincipal && elemPrincipal.percentualDoResidual99 >= 30 && (
                <div className="border-warn-fill bg-warn-fill/15 text-ink mt-6 border-l-2 py-3 pr-3 pl-3 text-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="text-warn-text mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                      <Lightbulb className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="leading-relaxed">
                      <strong className="font-bold">Onde pesa mais:</strong>{" "}
                      <span>
                        {elemPrincipal.percentualDoResidual99 >= 50
                          ? "Mais da metade"
                          : "Boa parte"}{" "}
                        ({fmtPercent(elemPrincipal.percentualDoResidual99)}) do
                        que foi pago em &ldquo;Outros&rdquo; é do tipo{" "}
                        <strong className="font-semibold">
                          {elemPrincipal.elementoCodigo}.99 (
                          {elemPrincipal.elementoDescricao})
                        </strong>
                        , somando{" "}
                        <strong className="font-semibold">
                          {fmtCompact(elemPrincipal.totalPago)}
                        </strong>
                        . Vale consultar os pagamentos desse tipo.
                      </span>
                    </p>
                  </div>
                </div>
              )}

              <details className="group border-line mt-6 border-t pt-4">
                <summary className="text-ink flex cursor-pointer items-start justify-between gap-2 text-sm font-semibold select-none sm:items-center">
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                    <span>
                      Em que tipos de gasto &ldquo;Outros&rdquo; aparece mais
                    </span>
                    <span className="bg-pill text-mute2 inline-flex w-fit shrink-0 rounded-md px-2.5 py-0.5 text-xs font-normal whitespace-nowrap">
                      {top5Elementos.length} maiores de{" "}
                      {data.elementosResidual99.length} tipos
                    </span>
                  </div>
                  <ChevronDown className="text-mute2 mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180 sm:mt-0" />
                </summary>

                <div className="mt-4 space-y-3.5">
                  <p className="text-mute2 text-xs">
                    Como se dividem os{" "}
                    {fmtCompact(exercicioAtual.pagoResidual99)} pagos em
                    &ldquo;Outros&rdquo; entre os tipos de gasto
                  </p>

                  {/* Lista dos Top 5 Elementos */}
                  <div>
                    {top5Elementos.map((elem) => (
                      <ElementoResidualRow
                        key={elem.elementoCodigo}
                        elem={elem}
                      />
                    ))}
                  </div>

                  {/* Expansão das demais naturezas identificadas */}
                  {demaisElementos.length > 0 && (
                    <details className="group/demais mt-2 pt-3">
                      <summary className="text-mute2 hover:text-ink flex cursor-pointer items-center justify-between text-xs font-medium select-none">
                        <span>
                          Ver todos os {data.elementosResidual99.length} tipos
                        </span>
                        <ChevronDown className="text-mute2 h-3.5 w-3.5 transition-transform group-open/demais:rotate-180" />
                      </summary>
                      <div className="mt-1">
                        {demaisElementos.map((elem) => (
                          <ElementoResidualRow
                            key={elem.elementoCodigo}
                            elem={elem}
                          />
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Nota Metodológica Didática */}
                  <p className="border-line text-mute2 border-t pt-2.5 text-xs leading-relaxed">
                    <strong className="text-ink font-semibold">
                      Nem todo &ldquo;Outros&rdquo; é problema.
                    </strong>{" "}
                    O portal separa os gastos em dois grupos, por critério
                    próprio: <strong>Obrigatório por lei</strong> (como
                    sentenças judiciais, <em>91.99</em>, e encargos de pessoal,{" "}
                    <em>13.99</em>) e <strong>Poderia ser detalhado</strong>{" "}
                    (como serviços, <em>39.99/36.99</em>, e materiais,{" "}
                    <em>30.99</em>). É uma classificação do portal, não da lei.
                  </p>
                </div>
              </details>
            </>
          );
        })()}

      {/* Série Histórica de Exercícios Anteriores Fechados */}
      {(() => {
        const historicoAnterior = data.historico.filter(
          (h) => h.ano < exercicioAtual.ano,
        );
        if (historicoAnterior.length === 0) return null;

        return (
          <details className="group border-line mt-4 border-t pt-4">
            <summary className="text-ink flex cursor-pointer items-start justify-between gap-2 text-sm font-semibold select-none sm:items-center">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span>Como foi nos anos anteriores</span>
                <span className="bg-pill text-mute2 inline-flex w-fit shrink-0 rounded-md px-2.5 py-0.5 text-xs font-normal whitespace-nowrap">
                  {historicoAnterior.length === 1
                    ? historicoAnterior[0]?.ano
                    : `${historicoAnterior[0]?.ano} – ${historicoAnterior[historicoAnterior.length - 1]?.ano}`}
                </span>
              </div>
              <ChevronDown className="text-mute2 mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180 sm:mt-0" />
            </summary>

            <div className="mt-4 grid grid-cols-2 gap-x-4 sm:grid-cols-3 md:grid-cols-5">
              {historicoAnterior.map((h) => {
                const configAno = getRiscoConfig(h.classificacaoRisco);
                return (
                  <div
                    key={h.ano}
                    className="border-line flex flex-col justify-between border-t py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-ink text-sm font-bold">
                        {h.ano}
                      </span>
                      <Badge variant={configAno.badgeVariant}>
                        {configAno.statusText}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-base font-bold ${configAno.textColor}`}
                      >
                        {fmtPercent(h.taxaValorOpacidadePct)}
                      </span>
                      <span className="text-mute2 block text-[11px]">
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
        <details className="group border-line mt-4 border-t pt-4">
          <summary className="text-ink flex cursor-pointer items-start justify-between gap-2 text-sm font-semibold select-none sm:items-center">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
              <span>
                Quem mais recebeu em &ldquo;Outros&rdquo; ({topCredores.length}{" "}
                maiores)
              </span>
              <span className="bg-pill text-mute2 inline-flex w-fit shrink-0 rounded-md px-2.5 py-0.5 text-xs font-normal whitespace-nowrap">
                Por fornecedor
              </span>
            </div>
            <ChevronDown className="text-mute2 mt-0.5 h-4 w-4 shrink-0 transition-transform group-open:rotate-180 sm:mt-0" />
          </summary>

          <div className="mt-2">
            {topCredores.map((credor) => {
              const hasCategoriaSugerida =
                credor.categoriaPredominante !==
                  "sem_classificacao_especifica" &&
                credor.pagoDesvioSensivel > 0;
              const larguraBarra = Math.min(
                100,
                (credor.totalPago / maiorTotalCredor) * 100,
              );

              return (
                <div
                  key={credor.credorCodigo + credor.ranking}
                  className="grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 py-3"
                >
                  <span className="text-ink text-sm font-medium">
                    {credor.credorNome}
                    <span className="numeric text-mute2 ml-2 text-left text-xs">
                      {credor.credorCodigo}
                    </span>
                  </span>
                  <span className="text-ink text-right text-sm tabular-nums">
                    {fmtCompact(credor.totalPago)}
                  </span>
                  <span className="bg-track col-span-full block h-1.5 w-full overflow-hidden">
                    <span
                      className="bg-brand-fill block h-full"
                      style={{ width: `${larguraBarra}%` }}
                    />
                  </span>
                  <span className="text-mute2 col-span-full text-xs">
                    Parece ser de:{" "}
                    {hasCategoriaSugerida ? (
                      <span className="text-warn-text font-medium">
                        {formatCategoriaSensivel(credor.categoriaPredominante)}
                      </span>
                    ) : (
                      <span>Não identificado</span>
                    )}
                  </span>
                  {credor.amostraObjeto && (
                    <span
                      className="text-mute2 col-span-full truncate text-xs"
                      title={credor.amostraObjeto}
                    >
                      {credor.amostraObjeto}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="border-line mt-4 border-t pt-4">
        <ShowYourWorkButton
          variante="link"
          rotulo={`Baixar os gastos em “Outros” de ${exercicioAtual.ano} (CSV)`}
          legenda="Traz cada pagamento registrado como “Outros” no ano, com fornecedor, objeto e valores."
          portalSlug={portalSlug || data.portalSlug}
          ano={exercicioAtual.ano}
          tipo="opacidade_99"
          tituloContexto="Gastos registrados como Outros"
        />
      </div>
    </div>
  );
}
