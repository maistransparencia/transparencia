import {
  cn,
  corDoGrafico,
  ThresholdMeter,
  type TokenCorGrafico,
} from "@transparencia/ui";
import Link from "next/link";

export interface AntiguidadeBarItem {
  year: string;
  amountFormatted?: string;
  percentage: number;
  percentageLiquidado?: number;
  percentageEmpenhado?: number;
  isCurrentYear?: boolean;
  corToken?: TokenCorGrafico;
  liquidadoCorToken?: TokenCorGrafico;
  empenhadoCorToken?: TokenCorGrafico;
}

export interface DespesasCardData {
  title?: string;
  linkText?: string;
  linkHref?: string;
  totalRestosPagarFormatted?: string;
  secondaryTextFormatted?: string;
  totalEmpenhadoFormatted?: string;
  totalLiquidadoFormatted?: string;
  subtext?: string;
  antiguidadeBars?: AntiguidadeBarItem[];
  footerText?: string;
}

export interface LicitacaoItemData {
  count: number | string;
  label: string;
  isAlert?: boolean;
}

export interface LicitacoesCardData {
  title?: string;
  linkText?: string;
  linkHref?: string;
  items?: LicitacaoItemData[];
}

export interface PessoalCardData {
  title?: string;
  linkText?: string;
  linkHref?: string;
  receitaFolhaPercentFormatted?: string;
  receitaFolhaPercentValue?: number;
  subtext?: string;
  lrfLimitPercentValue?: number;
  lrfLimitPercentFormatted?: string;
  footerText?: string;
}

export interface CardsSecundariosVisaoGeralProps {
  despesas?: DespesasCardData;
  licitacoes?: LicitacoesCardData;
  pessoal?: PessoalCardData;
  className?: string;
}

function CabecalhoColuna({
  title,
  linkText,
  linkHref,
}: {
  title: string;
  linkText: string;
  linkHref?: string;
}) {
  return (
    <header className="flex items-baseline justify-between gap-3 pb-4">
      <h3 className="eyebrow">{title}</h3>
      {linkHref && (
        <Link
          href={linkHref}
          className="text-brand shrink-0 text-xs transition-colors hover:underline"
        >
          {linkText}
        </Link>
      )}
    </header>
  );
}

export function CardsSecundariosVisaoGeral({
  despesas,
  licitacoes,
  pessoal,
  className,
}: CardsSecundariosVisaoGeralProps) {
  const despesasTitle = despesas?.title ?? "Despesas";
  const despesasLinkText = despesas?.linkText ?? "Restos a pagar →";
  const despesasLinkHref = despesas?.linkHref ?? "/despesas";
  const despesasTotal = despesas?.totalRestosPagarFormatted;
  const totalEmpenhado = despesas?.totalEmpenhadoFormatted ?? despesasTotal;
  const totalLiquidado = despesas?.totalLiquidadoFormatted;

  const despesasSubtext = despesas?.subtext;
  const despesasBars = despesas?.antiguidadeBars ?? [];
  const despesasFooter = despesas?.footerText;

  const licitacoesTitle = licitacoes?.title ?? "Licitações";
  const licitacoesLinkText = licitacoes?.linkText ?? "Contratos →";
  const licitacoesLinkHref = licitacoes?.linkHref ?? "/licitacoes";
  const licitacoesItems = licitacoes?.items ?? [];

  const pessoalTitle = pessoal?.title ?? "Pessoal";
  const pessoalLinkText = pessoal?.linkText ?? "Folha →";
  const pessoalLinkHref = pessoal?.linkHref ?? "/pessoal";
  const pessoalPercentFormatted = pessoal?.receitaFolhaPercentFormatted;
  const pessoalPercentVal = pessoal?.receitaFolhaPercentValue ?? 0;
  const pessoalSubtext = pessoal?.subtext;
  const lrfLimitVal = pessoal?.lrfLimitPercentValue ?? 54;
  const lrfLimitFormatted =
    pessoal?.lrfLimitPercentFormatted ?? `${lrfLimitVal}% LRF`;
  const pessoalFooter = pessoal?.footerText;

  return (
    <div
      className={cn(
        "divide-line border-ink grid grid-cols-1 divide-y border-t-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {/* Card 1: Despesas */}
      <div className="flex flex-col justify-between py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
        <div>
          {/* Cabeçalho */}
          <CabecalhoColuna
            title={despesasTitle}
            linkText={despesasLinkText}
            linkHref={despesasLinkHref}
          />

          {/* Destaque Numérico */}
          <div className="mb-4">
            {totalEmpenhado ? (
              <div>
                <div className="text-danger-text font-sans text-2xl leading-none font-bold tracking-tight sm:text-3xl">
                  {totalEmpenhado}
                </div>
                {totalLiquidado && (
                  <div className="text-mute2 mt-3 text-xs">
                    {totalLiquidado} liquidados
                    {despesasSubtext ? ` · ${despesasSubtext}` : ""}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-mute2 text-xs italic">
                Sem restos a pagar registrados
              </div>
            )}
            {despesasSubtext && !(totalEmpenhado && totalLiquidado) && (
              <div className="text-mute2 mt-3 text-xs">{despesasSubtext}</div>
            )}
          </div>

          {/* Antiguidade Bars (Stacked Bipartida: Base Liquidado real, Topo Empenhado pendente; h-14 altura ampliada) */}
          {despesasBars.length > 0 && (
            <div className="my-3 flex h-12 items-end gap-1.5">
              {despesasBars.map((bar, idx) => {
                const isHighlight =
                  bar.isCurrentYear ?? idx === despesasBars.length - 1;

                const isBipartite =
                  bar.percentageLiquidado !== undefined &&
                  bar.percentageEmpenhado !== undefined;

                const liquidadoColor = corDoGrafico(
                  bar.liquidadoCorToken ?? (isHighlight ? "danger" : "mute2"),
                );
                const empenhadoColor = corDoGrafico(
                  bar.empenhadoCorToken ?? "line",
                );
                const fallbackColor = corDoGrafico(
                  bar.corToken ?? (isHighlight ? "danger" : "line"),
                );

                const totalPct = Math.min(100, Math.max(10, bar.percentage));

                if (!isBipartite) {
                  return (
                    <div
                      key={bar.year}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className="w-full transition-all duration-300"
                        style={{
                          height: `${totalPct}%`,
                          backgroundColor: fallbackColor,
                        }}
                      />
                      <span className="numeric text-mute2 mt-1 text-left text-[9px]">
                        {bar.year}
                      </span>
                    </div>
                  );
                }

                const totalVal =
                  (bar.percentageLiquidado ?? 0) +
                  (bar.percentageEmpenhado ?? 0);
                const liqRatio =
                  totalVal > 0
                    ? ((bar.percentageLiquidado ?? 0) / totalVal) * 100
                    : 0;
                const empRatio =
                  totalVal > 0
                    ? ((bar.percentageEmpenhado ?? 0) / totalVal) * 100
                    : 0;

                return (
                  <div
                    key={bar.year}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className="flex w-full flex-col overflow-hidden transition-all duration-300"
                      style={{ height: `${totalPct}%` }}
                    >
                      {/* Topo: Empenhado residual (tom muted) */}
                      {empRatio > 0 && (
                        <div
                          className="w-full transition-all"
                          style={{
                            height: `${empRatio}%`,
                            backgroundColor: empenhadoColor,
                          }}
                          title={`Empenhado pendente (${bar.year})`}
                        />
                      )}
                      {/* Base: Liquidado real (cor viva) */}
                      {liqRatio > 0 && (
                        <div
                          className="w-full transition-all"
                          style={{
                            height: `${liqRatio}%`,
                            backgroundColor: liquidadoColor,
                          }}
                          title={`Liquidado (${bar.year})`}
                        />
                      )}
                    </div>
                    <span className="numeric text-mute2 mt-1 text-left text-[9px]">
                      {bar.year}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        {despesasFooter && (
          <div className="text-mute2 mt-4 text-xs">{despesasFooter}</div>
        )}
      </div>

      {/* Card 2: Licitações */}
      <div className="flex flex-col justify-between py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
        <div>
          {/* Cabeçalho */}
          <CabecalhoColuna
            title={licitacoesTitle}
            linkText={licitacoesLinkText}
            linkHref={licitacoesLinkHref}
          />

          {/* Lista de Itens */}
          <div className="divide-line divide-y">
            {licitacoesItems.length > 0 ? (
              licitacoesItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 py-2.5 text-xs first:pt-0"
                >
                  <strong
                    className={cn(
                      "w-9 shrink-0 font-sans text-base font-bold",
                      item.isAlert ? "text-danger-text" : "text-ink",
                    )}
                  >
                    {item.count}
                  </strong>
                  <span className="text-mute2 flex-1 truncate">
                    {item.label}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-mute2 py-4 text-center text-xs italic">
                Nenhum indicador registrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Pessoal */}
      <div className="flex flex-col justify-between py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0">
        <div>
          {/* Cabeçalho */}
          <CabecalhoColuna
            title={pessoalTitle}
            linkText={pessoalLinkText}
            linkHref={pessoalLinkHref}
          />

          {/* Destaque Numérico */}
          <div className="mb-4">
            {pessoalPercentFormatted ? (
              <div className="text-ink font-sans text-2xl leading-none font-bold tracking-tight sm:text-3xl">
                {pessoalPercentFormatted}
              </div>
            ) : (
              <div className="text-mute2 text-xs italic">
                Sem dados de folha registrados
              </div>
            )}
            {pessoalSubtext && (
              <div className="text-mute2 mt-3 text-xs">{pessoalSubtext}</div>
            )}
          </div>

          {/* Barra de Progresso + Marcador LRF */}
          {pessoalPercentFormatted && (
            <div className="my-3 space-y-1.5">
              <ThresholdMeter
                value={pessoalPercentVal}
                threshold={lrfLimitVal}
                label="Gasto com pessoal em relação à receita"
                valueText={`${pessoalPercentVal}% da receita; limite da LRF: ${lrfLimitFormatted}`}
              />
              <div className="numeric text-mute2 flex items-center justify-between text-left text-[10.5px]">
                <span>{pessoalPercentVal}% atual</span>
                <span>limite LRF: {lrfLimitFormatted}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {pessoalFooter && (
          <div className="text-mute2 mt-4 text-xs">{pessoalFooter}</div>
        )}
      </div>
    </div>
  );
}
