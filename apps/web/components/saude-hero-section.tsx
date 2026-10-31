import { fmtCompact, fmtPercent, Indicator } from "@transparencia/ui";

export interface SaudeHeroOrcamentoProps {
  dotacao: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  taxaExecucao: number;
  medicamentosInsumos: number;
  contratosVinculadosCount: number;
  fornecedoresAtivosCount: number;
}

export interface SaudeHeroFontesProps {
  uniaoSusPct: number;
  estadoPct: number;
  propriaPct: number;
  repassesPrefeitura: number;
  emendasParlamentares: number;
}

export interface SaudeHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  orcamento: SaudeHeroOrcamentoProps;
  fontesReceita: SaudeHeroFontesProps;
}

export function SaudeHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  orcamento,
  fontesReceita,
}: SaudeHeroSectionProps) {
  const susPct = fontesReceita.uniaoSusPct ?? 0;

  const empenhadoRatio =
    orcamento.dotacao > 0
      ? Math.min(
          100,
          Math.max(0, (orcamento.empenhado / orcamento.dotacao) * 100),
        )
      : 0;

  const liquidadoRatio =
    orcamento.empenhado > 0
      ? Math.min(
          100,
          Math.max(0, (orcamento.liquidado / orcamento.empenhado) * 100),
        )
      : 0;

  const pagoRatio =
    orcamento.empenhado > 0
      ? Math.min(100, Math.max(0, (orcamento.pago / orcamento.empenhado) * 100))
      : 0;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <p className="eyebrow text-brand-text!">
          FUNDO MUNICIPAL DE SAÚDE · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>

        <h1>
          {susPct} de cada R$ 100 que entram na saúde vêm do Governo Federal
          (SUS). O que o município faz com esse dinheiro depende de como
          contrata.
        </h1>

        <p className="lead">
          {isCurrentYear ? (
            <>
              O Fundo Municipal de Saúde já reservou{" "}
              <strong className="text-ink">
                {fmtCompact(orcamento.empenhado)}
              </strong>{" "}
              em {ano} para despesas da saúde (empenho). É{" "}
              {fmtPercent(orcamento.taxaExecucao * 100)} da verba prevista para
              o ano, de {fmtCompact(orcamento.dotacao)}. Reservar não é pagar:
              veja quanto já foi entregue e quanto já foi pago.
            </>
          ) : (
            <>
              O Fundo Municipal de Saúde reservou{" "}
              <strong className="text-ink">
                {fmtCompact(orcamento.empenhado)}
              </strong>{" "}
              em {ano} para despesas da saúde (empenho), ou{" "}
              {fmtPercent(orcamento.taxaExecucao * 100)} da verba prevista para
              o ano, de {fmtCompact(orcamento.dotacao)}. Desse valor,{" "}
              {fmtCompact(orcamento.pago)} já foi pago.
            </>
          )}
        </p>
      </div>

      <div className="panel panel-brand space-y-6 lg:col-span-5">
        <dl>
          <Indicator
            size="md"
            label={
              isCurrentYear
                ? "Reservado (empenhado) no ano até agora"
                : "Reservado (empenhado) no ano"
            }
            value={fmtCompact(orcamento.empenhado)}
            note={`${fmtPercent(orcamento.taxaExecucao * 100)} da verba prevista de ${fmtCompact(orcamento.dotacao)}`}
          />
        </dl>
        <ProgressBar percent={empenhadoRatio} />

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Serviço entregue (liquidado)"
              value={fmtCompact(orcamento.liquidado)}
              note={`${fmtPercent(liquidadoRatio)} do reservado`}
            />
            <ProgressBar percent={liquidadoRatio} />
          </div>
          <div className="space-y-2">
            <Indicator
              size="sm"
              label="Dinheiro que saiu (pago)"
              value={fmtCompact(orcamento.pago)}
              note={`${fmtPercent(pagoRatio)} do reservado`}
            />
            <ProgressBar percent={pagoRatio} />
          </div>
        </dl>
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-3 w-full overflow-hidden bg-track">
      <div
        className="h-full bg-brand-fill transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
