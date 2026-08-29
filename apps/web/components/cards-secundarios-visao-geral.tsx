import { cn } from "@transparencia/ui";
import Link from "next/link";

export interface AntiguidadeBarItem {
  year: string;
  amountFormatted?: string;
  percentage: number;
  percentageLiquidado?: number;
  percentageEmpenhado?: number;
  isCurrentYear?: boolean;
  colorClass?: string;
  liquidadoColorClass?: string;
  empenhadoColorClass?: string;
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
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-3", className)}>
      {/* Card 1: Despesas */}
      <div className="flex flex-col justify-between rounded-[14px] border border-[#e7e9ee] bg-white p-5 shadow-sm">
        <div>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-[#f4f5f7] border-b pb-3">
            <span className="font-bold font-serif text-base text-ink">
              {despesasTitle}
            </span>
            {despesasLinkHref && (
              <Link
                href={despesasLinkHref}
                className="font-medium text-subtleText text-xs transition-colors hover:text-accent"
              >
                {despesasLinkText}
              </Link>
            )}
          </div>

          {/* Destaque Numérico */}
          <div className="my-4">
            {totalEmpenhado ? (
              <div>
                <div className="font-bold font-serif text-2xl text-[oklch(0.55_0.11_25)] leading-none tracking-tight sm:text-3xl">
                  {totalEmpenhado}
                </div>
                {totalLiquidado && (
                  <div className="mt-1 font-medium text-[11px] text-subtleText">
                    {totalLiquidado} liquidados
                  </div>
                )}
              </div>
            ) : (
              <div className="text-subtleText text-xs italic">
                Sem restos a pagar registrados
              </div>
            )}
            {despesasSubtext && (
              <div className="mt-1.5 font-medium text-subtleText text-xs">
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

                const liquidadoColor =
                  bar.liquidadoColorClass ||
                  (isHighlight ? "bg-[oklch(0.55_0.11_25)]" : "bg-[#c57983]");
                const empenhadoColor =
                  bar.empenhadoColorClass ||
                  (isHighlight ? "bg-[#f0dadd]" : "bg-slate-200");
                const fallbackColor =
                  bar.colorClass ||
                  (isHighlight ? "bg-[oklch(0.55_0.11_25)]" : "bg-slate-200");

                const totalPct = Math.min(100, Math.max(10, bar.percentage));

                if (!isBipartite) {
                  return (
                    <div
                      key={bar.year}
                      className="group relative flex h-full flex-1 flex-col items-center justify-end"
                    >
                      <div
                        className={cn(
                          "w-full rounded-sm transition-all duration-300",
                          fallbackColor,
                        )}
                        style={{ height: `${totalPct}%` }}
                      />
                      <span className="mt-1 font-mono text-[9px] text-mutedText">
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
                          className={cn(
                            "w-full transition-all",
                            empenhadoColor,
                          )}
                          style={{ height: `${empRatio}%` }}
                          title={`Empenhado pendente (${bar.year})`}
                        />
                      )}
                      {/* Base: Liquidado real (cor viva) */}
                      {liqRatio > 0 && (
                        <div
                          className={cn(
                            "w-full transition-all",
                            liquidadoColor,
                          )}
                          style={{ height: `${liqRatio}%` }}
                          title={`Liquidado (${bar.year})`}
                        />
                      )}
                    </div>
                    <span className="mt-1 font-mono text-[9px] text-mutedText">
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
          <div className="mt-2 border-[#f4f5f7] border-t pt-2.5 font-medium text-[11px] text-subtleText">
            {despesasFooter}
          </div>
        )}
      </div>

      {/* Card 2: Licitações */}
      <div className="flex flex-col justify-between rounded-[14px] border border-[#e7e9ee] bg-white p-5 shadow-sm">
        <div>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-[#f4f5f7] border-b pb-3">
            <span className="font-bold font-serif text-base text-ink">
              {licitacoesTitle}
            </span>
            {licitacoesLinkHref && (
              <Link
                href={licitacoesLinkHref}
                className="font-medium text-subtleText text-xs transition-colors hover:text-accent"
              >
                {licitacoesLinkText}
              </Link>
            )}
          </div>

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
                      item.isAlert ? "text-[oklch(0.55_0.11_25)]" : "text-ink",
                    )}
                  >
                    {item.count}
                  </strong>
                  <span className="flex-1 truncate font-medium text-subtleText">
                    {item.label}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-4 text-center text-subtleText text-xs italic">
                Nenhum indicador registrado
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 3: Pessoal */}
      <div className="flex flex-col justify-between rounded-[14px] border border-[#e7e9ee] bg-white p-5 shadow-sm">
        <div>
          {/* Cabeçalho */}
          <div className="flex items-center justify-between border-[#f4f5f7] border-b pb-3">
            <span className="font-bold font-serif text-base text-ink">
              {pessoalTitle}
            </span>
            {pessoalLinkHref && (
              <Link
                href={pessoalLinkHref}
                className="font-medium text-subtleText text-xs transition-colors hover:text-accent"
              >
                {pessoalLinkText}
              </Link>
            )}
          </div>

          {/* Destaque Numérico */}
          <div className="my-4">
            {pessoalPercentFormatted ? (
              <div className="font-bold font-serif text-2xl text-ink leading-none tracking-tight sm:text-3xl">
                {pessoalPercentFormatted}
              </div>
            ) : (
              <div className="text-subtleText text-xs italic">
                Sem dados de folha registrados
              </div>
            )}
            {pessoalSubtext && (
              <div className="mt-1.5 font-medium text-subtleText text-xs">
                {pessoalSubtext}
              </div>
            )}
          </div>

          {/* Barra de Progresso + Marcador LRF */}
          {pessoalPercentFormatted && (
            <div className="my-3 space-y-1.5">
              <div className="relative h-2.5 w-full overflow-visible rounded-md bg-[#f4f5f7]">
                {/* Progresso da Folha */}
                <div
                  className="h-full rounded-md bg-sky-600 transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, pessoalPercentVal))}%`,
                  }}
                />
                {/* Linha Vermelha de Limite LRF */}
                <div
                  className="absolute top-[-3px] z-10 h-4 w-0.5 bg-red-600"
                  style={{
                    left: `${Math.min(100, Math.max(0, lrfLimitVal))}%`,
                  }}
                  title={`Limite LRF: ${lrfLimitFormatted}`}
                />
              </div>
              <div className="flex items-center justify-between font-medium text-[10.5px] text-mutedText">
                <span>{pessoalPercentVal}% atual</span>
                <span className="font-semibold text-red-700">
                  limite LRF: {lrfLimitFormatted}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        {pessoalFooter && (
          <div className="mt-2 border-[#f4f5f7] border-t pt-2.5 font-medium text-[11px] text-subtleText">
            {pessoalFooter}
          </div>
        )}
      </div>
    </div>
  );
}
