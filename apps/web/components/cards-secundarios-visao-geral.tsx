import {
  cn,
  corDoGrafico,
  SectionHeader,
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
        "grid grid-cols-1 divide-y divide-line border-line border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {/* Card 1: Despesas */}
      <div className="flex flex-col justify-between py-6 sm:px-6 sm:last:pr-0 sm:first:pl-0">
        <div>
          {/* Cabeçalho */}
          <SectionHeader
            as="h3"
            className="pb-3"
            title={despesasTitle}
            action={
              despesasLinkHref ? (
                <Link
                  href={despesasLinkHref}
                  className="font-medium text-mute2 text-xs transition-colors hover:text-brand"
                >
                  {despesasLinkText}
                </Link>
              ) : undefined
            }
          />

          {/* Destaque Numérico */}
          <div className="my-4">
            {totalEmpenhado ? (
              <div>
                <div className="font-bold font-serif text-2xl text-danger leading-none tracking-tight sm:text-3xl">
                  {totalEmpenhado}
                </div>
                {totalLiquidado && (
                  <div className="mt-1 font-medium text-[11px] text-mute2">
                    {totalLiquidado} liquidados
                  </div>
                )}
              </div>
            ) : (
              <div className="text-mute2 text-xs italic">
                Sem restos a pagar registrados
              </div>
            )}
            {despesasSubtext && (
              <div className="mt-1.5 font-medium text-mute2 text-xs">
                {despesasSubtext}
              </div>
            )}
          </div>

          {/* Antiguidade Bars (Stacked Bipartida: Base Liquidado real, Topo Empenhado pendente; h-14 altura ampliada) */}
          {despesasBars.length > 0 && (
            <div className="my-3 flex h-14 items-end gap-1.5">
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
                        className="w-full rounded-sm transition-all duration-300"
                        style={{
                          height: `${totalPct}%`,
                          backgroundColor: fallbackColor,
                        }}
                      />
                      <span className="mt-1 text-[9px] text-mute2">
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
                      className="flex w-full flex-col overflow-hidden rounded-sm transition-all duration-300"
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
                    <span className="mt-1 text-[9px] text-mute2">
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
          <div className="mt-2 border-line border-t pt-2.5 font-medium text-[11px] text-mute2">
            {despesasFooter}
          </div>
        )}
      </div>

      {/* Card 2: Licitações */}
      <div className="flex flex-col justify-between py-6 sm:px-6 sm:last:pr-0 sm:first:pl-0">
        <div>
          {/* Cabeçalho */}
          <SectionHeader
            as="h3"
            className="pb-3"
            title={licitacoesTitle}
            action={
              licitacoesLinkHref ? (
                <Link
                  href={licitacoesLinkHref}
                  className="font-medium text-mute2 text-xs transition-colors hover:text-brand"
                >
                  {licitacoesLinkText}
                </Link>
              ) : undefined
            }
          />

          {/* Lista de Itens */}
          <div className="my-3.5 space-y-2.5">
            {licitacoesItems.length > 0 ? (
              licitacoesItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <strong
                    className={cn(
                      "w-7 shrink-0 font-bold font-serif text-base",
                      item.isAlert ? "text-danger" : "text-ink",
                    )}
                  >
                    {item.count}
                  </strong>
                  <span className="flex-1 truncate font-medium text-mute2">
                    {item.label}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-mute2 text-xs italic">
                Nenhum indicador registrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Pessoal */}
      <div className="flex flex-col justify-between py-6 sm:px-6 sm:last:pr-0 sm:first:pl-0">
        <div>
          {/* Cabeçalho */}
          <SectionHeader
            as="h3"
            className="pb-3"
            title={pessoalTitle}
            action={
              pessoalLinkHref ? (
                <Link
                  href={pessoalLinkHref}
                  className="font-medium text-mute2 text-xs transition-colors hover:text-brand"
                >
                  {pessoalLinkText}
                </Link>
              ) : undefined
            }
          />

          {/* Destaque Numérico */}
          <div className="my-4">
            {pessoalPercentFormatted ? (
              <div className="font-bold font-serif text-2xl text-ink leading-none tracking-tight sm:text-3xl">
                {pessoalPercentFormatted}
              </div>
            ) : (
              <div className="text-mute2 text-xs italic">
                Sem dados de folha registrados
              </div>
            )}
            {pessoalSubtext && (
              <div className="mt-1.5 font-medium text-mute2 text-xs">
                {pessoalSubtext}
              </div>
            )}
          </div>

          {/* Barra de Progresso + Marcador LRF */}
          {pessoalPercentFormatted && (
            <div className="my-3 space-y-1.5">
              <div className="relative h-2.5 w-full overflow-visible rounded-md bg-track">
                {/* Progresso da Folha */}
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    backgroundColor: corDoGrafico("brand"),
                    width: `${Math.min(100, Math.max(0, pessoalPercentVal))}%`,
                  }}
                />
                {/* Linha Vermelha de Limite LRF */}
                <div
                  className="absolute top-[-3px] z-10 h-4 w-0.5 bg-danger"
                  style={{
                    left: `${Math.min(100, Math.max(0, lrfLimitVal))}%`,
                  }}
                  title={`Limite LRF: ${lrfLimitFormatted}`}
                />
              </div>
              <div className="flex items-center justify-between font-medium text-[10.5px] text-mute2">
                <span>{pessoalPercentVal}% atual</span>
                <span className="font-semibold text-danger">
                  limite LRF: {lrfLimitFormatted}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {pessoalFooter && (
          <div className="mt-2 border-line border-t pt-2.5 font-medium text-[11px] text-mute2">
            {pessoalFooter}
          </div>
        )}
      </div>
    </div>
  );
}
