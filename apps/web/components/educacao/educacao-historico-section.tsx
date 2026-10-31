"use client";

import type { EtapaEnsino } from "@transparencia/db";
import {
  AlertBox,
  corDoGrafico,
  Indicator,
  IndicatorPanel,
  ModalDialog,
  SegmentedButton,
} from "@transparencia/ui";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  IdebEtapaHistorico,
  IdebHistoricoPonto,
} from "@/app/[portalSlug]/educacao/view-model";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface EducacaoHistoricoSectionProps {
  historico: {
    anosIniciais: IdebEtapaHistorico;
    anosFinais: IdebEtapaHistorico;
  };
  initialEtapa?: EtapaEnsino;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    payload: IdebHistoricoPonto;
  }>;
  label?: string | number;
}

const NOTA_INFORMATIVA_IDEB_URL = FONTES_OFICIAIS.notaInformativaIdeb2025.url;

const formatarSaeb = (valor: number | null) =>
  valor === null
    ? "—"
    : valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 });

const formatarAnos = (anos: number[]) =>
  new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(
    anos.map(String),
  );

function CustomIdebTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const ponto = payload[0]?.payload;

  return (
    <div className="min-w-[200px] space-y-1.5 border border-line bg-page p-3 text-xs">
      <div className="flex justify-between border-line border-b pb-1 font-bold font-serif text-ink text-sm">
        <span>IDEB {label}</span>
        {ponto?.atingiuMeta && (
          <span className="rounded border border-ok-fill bg-ok-fill/15 px-1.5 py-0.2 font-semibold text-ok-text text-xs">
            Meta Atingida
          </span>
        )}
      </div>
      <div className="space-y-1 pt-1">
        {payload.map((item) => {
          if (item.value === null || item.value === undefined) return null;
          return (
            <div
              key={item.name}
              className="flex items-center justify-between gap-3"
            >
              <span className="flex items-center gap-1.5 text-mute">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}:
              </span>
              <span className="font-bold text-ink">
                {item.value.toLocaleString("pt-BR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
            </div>
          );
        })}
      </div>
      {ponto && (
        <div className="mt-2 space-y-0.5 border-line border-t pt-2 text-mute text-xs">
          {ponto.saebLinguaPortuguesa !== null && (
            <div className="flex justify-between">
              <span>Saeb Português:</span>
              <span className="font-medium text-ink">
                {ponto.saebLinguaPortuguesa}
              </span>
            </div>
          )}
          {ponto.saebMatematica !== null && (
            <div className="flex justify-between">
              <span>Saeb Matemática:</span>
              <span className="font-medium text-ink">
                {ponto.saebMatematica}
              </span>
            </div>
          )}
          {ponto.taxaAprovacao !== null && (
            <div className="flex justify-between">
              <span>Taxa Aprovação:</span>
              <span className="font-medium text-ink">
                {ponto.taxaAprovacao}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EducacaoHistoricoSection({
  historico,
  initialEtapa = "anosIniciais",
}: EducacaoHistoricoSectionProps) {
  const [activeEtapa, setActiveEtapa] = useState<EtapaEnsino>(initialEtapa);
  const [detalhesAberto, setDetalhesAberto] = useState(false);

  const currentHistorico =
    activeEtapa === "anosIniciais"
      ? historico.anosIniciais
      : historico.anosFinais;

  const chartData = currentHistorico.pontos;
  const pontoMaisRecente = currentHistorico.pontoMaisRecente;

  return (
    <div className="space-y-4">
      {/* Container do Gráfico Recharts: o seletor de etapa pertence ao gráfico, ao lado do título */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3>Evolução da nota do IDEB</h3>
          <fieldset className="flex min-w-0 flex-wrap items-center gap-2">
            <legend className="sr-only">Etapa de ensino do gráfico</legend>
            <SegmentedButton
              onClick={() => setActiveEtapa("anosIniciais")}
              active={activeEtapa === "anosIniciais"}
              size="md"
            >
              Anos Iniciais
            </SegmentedButton>
            <SegmentedButton
              onClick={() => setActiveEtapa("anosFinais")}
              active={activeEtapa === "anosFinais"}
              size="md"
            >
              Anos Finais
            </SegmentedButton>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-medium text-mute text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-fill" />
            Rede municipal
          </span>
          {currentHistorico.possuiMeta && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-mute border-t-2 border-dashed" />
              Meta do MEC
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-warn-fill border-t-2 border-dotted" />
            {currentHistorico.mediaEstadualLabel}
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              accessibilityLayer={false}
              data={chartData}
              margin={{ top: 20, right: 10, left: -30, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={corDoGrafico("line")}
              />
              <XAxis
                dataKey="ano"
                stroke={corDoGrafico("mute")}
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: corDoGrafico("line") }}
              />
              <YAxis
                domain={[
                  (dataMin: number) =>
                    Math.max(
                      0,
                      Math.floor(Number.isFinite(dataMin) ? dataMin - 0.5 : 0),
                    ),
                  (dataMax: number) =>
                    Math.min(
                      10,
                      Math.ceil(Number.isFinite(dataMax) ? dataMax + 0.5 : 10),
                    ),
                ]}
                stroke={corDoGrafico("mute")}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) =>
                  typeof val === "number" ? val.toFixed(1) : String(val)
                }
              />
              <Tooltip content={<CustomIdebTooltip />} />
              <Line
                type="monotone"
                dataKey="notaIdeb"
                name="Nota IDEB"
                stroke={corDoGrafico("brand")}
                strokeWidth={3}
                dot={{
                  r: 5,
                  fill: corDoGrafico("brand"),
                  strokeWidth: 2,
                  stroke: corDoGrafico("page"),
                }}
                activeDot={{
                  r: 7,
                  fill: corDoGrafico("brand"),
                  stroke: corDoGrafico("page"),
                  strokeWidth: 2,
                }}
                connectNulls
              />
              {currentHistorico.possuiMeta && (
                <Line
                  type="monotone"
                  dataKey="metaMec"
                  name="Meta MEC"
                  stroke={corDoGrafico("mute")}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 4, fill: corDoGrafico("mute") }}
                  activeDot={{
                    r: 6,
                    fill: corDoGrafico("mute"),
                    stroke: corDoGrafico("page"),
                    strokeWidth: 2,
                  }}
                  connectNulls={false}
                />
              )}
              <Line
                type="monotone"
                dataKey="mediaEstadual"
                name={currentHistorico.mediaEstadualLabel}
                stroke={corDoGrafico("warn")}
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: corDoGrafico("warn") }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <AlertBox type="info" className="text-xs">
          O IDEB junta a nota dos alunos na prova do Saeb e a taxa de aprovação.{" "}
          <a
            href={FONTES_OFICIAIS.ideb.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-text underline underline-offset-2"
          >
            Fonte: Painel Oficial INEP
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </AlertBox>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setDetalhesAberto(true)}
          className="min-h-11 cursor-pointer font-medium text-brand-text underline underline-offset-2"
        >
          Ver detalhes
        </button>
      </div>

      <ModalDialog
        isOpen={detalhesAberto}
        onClose={() => setDetalhesAberto(false)}
        title="Detalhes do IDEB"
        subtitle={currentHistorico.label}
        maxWidth="3xl"
        showShareButton={false}
      >
        <div className="space-y-6">
          {pontoMaisRecente && (
            <IndicatorPanel columns={3} size="sm">
              <Indicator
                label="SAEB — Língua Portuguesa"
                value={formatarSaeb(pontoMaisRecente.saebLinguaPortuguesa)}
                note={`nota na prova do Saeb · ${pontoMaisRecente.ano}`}
              />
              <Indicator
                label="SAEB — Matemática"
                value={formatarSaeb(pontoMaisRecente.saebMatematica)}
                note={`nota na prova do Saeb · ${pontoMaisRecente.ano}`}
              />
              <Indicator
                label="Taxa de aprovação escolar"
                value={
                  pontoMaisRecente.taxaAprovacao === null
                    ? "—"
                    : `${pontoMaisRecente.taxaAprovacao.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}%`
                }
                note="alunos aprovados no ano"
              />
            </IndicatorPanel>
          )}

          <section aria-label="Como ler a meta do IDEB" className="space-y-3">
            <h3>Como ler a meta do IDEB</h3>
            <p className="text-mute">
              O MEC/INEP define a meta do IDEB separadamente para cada rede de
              ensino de cada município, a partir do ponto de partida da rede.
              Por isso municípios diferentes, e redes diferentes dentro do mesmo
              município (municipal, estadual e pública, que reúne as duas), têm
              metas diferentes. Compare a nota sempre com a meta da mesma rede.
            </p>
            {currentHistorico.anosSemMeta.length > 0 && (
              <p className="text-mute">
                {currentHistorico.ultimoAnoComMeta !== null &&
                  `O ciclo oficial de metas terminou em ${currentHistorico.ultimoAnoComMeta}. `}
                Os resultados de {formatarAnos(currentHistorico.anosSemMeta)}{" "}
                não têm metas definidas pelo INEP e podem ser comparados com os
                anos anteriores.{" "}
                <a
                  href={NOTA_INFORMATIVA_IDEB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-text underline underline-offset-2"
                >
                  Fonte: Nota Informativa do Ideb 2025
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </p>
            )}
          </section>
        </div>
      </ModalDialog>
    </div>
  );
}
