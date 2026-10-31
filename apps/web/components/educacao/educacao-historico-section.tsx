"use client";

import type { EtapaEnsino } from "@transparencia/db";
import { corDoGrafico, SegmentedButton } from "@transparencia/ui";
import { CheckCircle, ExternalLink, Info } from "lucide-react";
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
import { SectionHeader } from "@/components/section-header";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface EducacaoHistoricoSectionProps {
  historico: {
    anosIniciais: IdebEtapaHistorico;
    anosFinais: IdebEtapaHistorico;
  };
  initialEtapa?: EtapaEnsino;
  municipioUf?: string;
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
        <span>Ciclo {label}</span>
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
  municipioUf,
}: EducacaoHistoricoSectionProps) {
  const [activeEtapa, setActiveEtapa] = useState<EtapaEnsino>(initialEtapa);

  const currentHistorico =
    activeEtapa === "anosIniciais"
      ? historico.anosIniciais
      : historico.anosFinais;

  const chartData = currentHistorico.pontos;
  const pontoMaisRecente = currentHistorico.pontoMaisRecente;

  return (
    <section
      aria-label="Série Histórica e Linha do Tempo do IDEB"
      className="space-y-4"
    >
      <SectionHeader
        title={`Série Histórica do IDEB e Avaliações Oficiais${currentHistorico.periodoLabel ? ` (${currentHistorico.periodoLabel})` : ""}`}
        description={
          currentHistorico.possuiMeta
            ? "Trajetória das notas do IDEB, proficiências SAEB e metas do Ministério da Educação, quando definidas."
            : "Trajetória das notas do IDEB e proficiências SAEB."
        }
      />

      {/* Tabs / Toggle de Etapa */}
      <div className="flex items-center gap-2 border-line border-b pb-2">
        <SegmentedButton
          onClick={() => setActiveEtapa("anosIniciais")}
          active={activeEtapa === "anosIniciais"}
          size="md"
        >
          Anos Iniciais (1º ao 5º ano)
        </SegmentedButton>
        <SegmentedButton
          onClick={() => setActiveEtapa("anosFinais")}
          active={activeEtapa === "anosFinais"}
          size="md"
        >
          Anos Finais (6º ao 9º ano)
        </SegmentedButton>
      </div>

      {/* Container do Gráfico Recharts */}
      <div className="border-line border-t pt-5">
        <div className="mb-4 flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3>Evolução da Nota IDEB — {currentHistorico.label}</h3>
            <p className="text-mute text-xs">
              Comparativo com a Média Estadual da rede pública
              {municipioUf ? ` (${municipioUf})` : ""}
              {currentHistorico.possuiMeta
                ? " e com a Meta do MEC nos ciclos em que ela foi definida"
                : ""}
            </p>
          </div>
          <div className="flex items-center gap-4 font-medium text-mute text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-fill" />
              Rede Municipal
            </span>
            {currentHistorico.possuiMeta && (
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 border-mute border-t-2 border-dashed" />
                Meta MEC
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-3 border-warn-fill border-t-2 border-dotted" />
              {currentHistorico.mediaEstadualLabel}
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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

        {/* Linha explicativa institucional e fonte oficial */}
        <div className="mt-4 flex flex-col gap-2 border-line border-y bg-line2 p-3 text-mute text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-mute" />
            <p>
              O IDEB sintetiza a aprovação escolar e o aprendizado apurado pelo
              SAEB a cada dois anos. A evolução é resultado do trabalho conjunto
              de alunos, professores, gestores escolares e comunidade escolar.
            </p>
          </div>
          <a
            href={FONTES_OFICIAIS.ideb.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand-text hover:underline hover:underline"
          >
            <span>Fonte: Painel Oficial INEP</span>
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>

        <div className="mt-3 space-y-2 border-line border-t pt-3 text-mute text-xs">
          <h4>Como ler a meta do IDEB</h4>
          <p>
            O MEC/INEP define a meta do IDEB separadamente para cada rede de
            ensino de cada município, a partir do ponto de partida da rede. Por
            isso municípios diferentes, e redes diferentes dentro do mesmo
            município (municipal, estadual e pública, que reúne as duas), têm
            metas diferentes. Compare a nota sempre com a meta da mesma rede.
          </p>
          {currentHistorico.anosSemMeta.length > 0 && (
            <p>
              {currentHistorico.ultimoAnoComMeta !== null &&
                `O ciclo oficial de metas terminou em ${currentHistorico.ultimoAnoComMeta}. `}
              Os resultados de {formatarAnos(currentHistorico.anosSemMeta)} não
              têm metas definidas pelo INEP e podem ser comparados com os anos
              anteriores.{" "}
              <a
                href={NOTA_INFORMATIVA_IDEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-text hover:underline hover:underline"
              >
                <span>Fonte: Nota Informativa do Ideb 2025</span>
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                <span className="sr-only">(abre em nova aba)</span>
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Cards de Proficiência Pedagógica (SAEB & Fluxo) */}
      {pontoMaisRecente && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="border-line border-t pt-4">
            <span className="block font-semibold text-mute text-xs uppercase tracking-wider">
              SAEB — Língua Portuguesa
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-ink">
                {pontoMaisRecente.saebLinguaPortuguesa !== null
                  ? pontoMaisRecente.saebLinguaPortuguesa.toLocaleString(
                      "pt-BR",
                      {
                        minimumFractionDigits: 1,
                      },
                    )
                  : "—"}
              </span>
              <span className="text-mute text-xs">escala SAEB</span>
            </div>
            <p className="mt-1 text-mute text-xs">
              Ciclo {pontoMaisRecente.ano} &middot; {currentHistorico.label}
            </p>
          </div>

          <div className="border-line border-t pt-4">
            <span className="block font-semibold text-mute text-xs uppercase tracking-wider">
              SAEB — Matemática
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-ink">
                {pontoMaisRecente.saebMatematica !== null
                  ? pontoMaisRecente.saebMatematica.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                    })
                  : "—"}
              </span>
              <span className="text-mute text-xs">escala SAEB</span>
            </div>
            <p className="mt-1 text-mute text-xs">
              Ciclo {pontoMaisRecente.ano} &middot; {currentHistorico.label}
            </p>
          </div>

          <div className="border-line border-t pt-4">
            <span className="block font-semibold text-mute text-xs uppercase tracking-wider">
              Taxa de Aprovação Escolar
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-bold font-serif text-3xl text-ink">
                {pontoMaisRecente.taxaAprovacao !== null
                  ? `${pontoMaisRecente.taxaAprovacao.toLocaleString("pt-BR", {
                      minimumFractionDigits: 1,
                    })}%`
                  : "—"}
              </span>
              <CheckCircle className="inline h-4 w-4 text-ok-text" />
            </div>
            <p className="mt-1 text-mute text-xs">
              Indicador de fluxo regular dos alunos
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
