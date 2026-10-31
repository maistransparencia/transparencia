import { fmtCompact, fmtPercent } from "@transparencia/ui";

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

  const insumosRatio =
    orcamento.empenhado > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (orcamento.medicamentosInsumos / orcamento.empenhado) * 100,
          ),
        )
      : 0;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      {/* Coluna Esquerda: Narrativa */}
      <div className="space-y-4 lg:col-span-7">
        <span className="inline-block font-semibold text-brand-text text-xs uppercase tracking-wider">
          TEMAS · FUNDO MUNICIPAL DE SAÚDE · {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </span>

        <h1>
          {susPct} de cada R$ 100 da saúde vêm do SUS.{" "}
          <span className="text-brand-text">
            O que o município faz com eles
          </span>{" "}
          se decide na forma de contratar.
        </h1>

        <p className="text-mute text-sm leading-relaxed sm:text-base">
          {isCurrentYear ? (
            <>
              O Fundo Municipal de Saúde já empenhou{" "}
              <strong className="font-bold text-ink">
                {fmtCompact(orcamento.empenhado)}
              </strong>{" "}
              em {ano} — {fmtPercent(orcamento.taxaExecucao * 100)} da dotação
              aprovada. Com a destinação de recursos oriundos do SUS e repasses
              governamentais, a transparência e a eficiência de cada contrato de
              insumos, exames e serviços garantem que a atenção básica chegue a
              quem precisa.
            </>
          ) : (
            <>
              O Fundo Municipal de Saúde empenhou{" "}
              <strong className="font-bold text-ink">
                {fmtCompact(orcamento.empenhado)}
              </strong>{" "}
              no exercício de {ano} — {fmtPercent(orcamento.taxaExecucao * 100)}{" "}
              da dotação aprovada. Dos recursos oriundos do SUS e repasses
              governamentais, a execução de cada contrato de insumos, exames e
              serviços definiu a cobertura da atenção básica no município
              naquele ano.
            </>
          )}
        </p>
      </div>

      {/* Coluna Direita: Card Visual do Empenho ao Pagamento */}
      <div className="border-line border-t pt-6 lg:col-span-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          {isCurrentYear ? (
            <>
              <span className="font-medium text-mute text-xs">
                Empenhado no ano até agora
              </span>
              <span className="inline-flex shrink-0 items-center rounded-md border border-ok-fill bg-ok-fill/15 px-2.5 py-0.5 font-medium text-ok-text text-xs">
                no ritmo
              </span>
            </>
          ) : (
            <span className="font-medium text-mute text-xs">
              Empenhado no exercício
            </span>
          )}
        </div>

        <div className="mb-2 font-bold font-serif text-3xl text-ink tracking-tight sm:text-4xl">
          {fmtCompact(orcamento.empenhado)}
        </div>

        <div className="mb-6 space-y-1.5">
          <div className="flex items-center justify-between font-medium text-mute text-xs">
            <span>
              {fmtPercent(orcamento.taxaExecucao * 100)} da dotação de{" "}
              {fmtCompact(orcamento.dotacao)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-md bg-line2">
            <div
              className="h-full rounded-md bg-brand-fill transition-all duration-500 ease-out"
              style={{ width: `${empenhadoRatio}%` }}
            />
          </div>
        </div>

        <div className="border-line border-t pt-4">
          <h4 className="mb-3 text-mute">DO EMPENHO ATÉ O PAGAMENTO</h4>
          <div className="space-y-3">
            {/* Liquidado */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="font-medium text-ink">Liquidado</span>
                <span className="font-semibold text-ink">
                  {fmtCompact(orcamento.liquidado)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-md bg-line2">
                <div
                  className="h-full rounded-md bg-brand-fill transition-all duration-500"
                  style={{ width: `${liquidadoRatio}%` }}
                />
              </div>
            </div>

            {/* Pago */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="font-medium text-ink">Pago</span>
                <span className="font-semibold text-ink">
                  {fmtCompact(orcamento.pago)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-md bg-line2">
                <div
                  className="h-full rounded-md bg-brand-fill transition-all duration-500"
                  style={{ width: `${pagoRatio}%` }}
                />
              </div>
            </div>

            {/* Medicamentos e insumos */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between text-mute">
                <span className="font-medium text-ink">
                  Medicamentos e insumos
                </span>
                <span className="font-semibold text-ink">
                  {fmtCompact(orcamento.medicamentosInsumos)}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-md bg-line2">
                <div
                  className="h-full rounded-md bg-ok-fill transition-all duration-500"
                  style={{ width: `${insumosRatio}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
