import type {
  FontesReceitaSaudeDTO,
  SaudeFarmaciaResumoDTO,
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import {
  fmtCompact,
  fmtDate,
  fmtNumber,
  Indicator,
  IndicatorPanel,
  ThresholdMeter,
} from "@transparencia/ui";
import { SaudeFarmaciaBotao } from "./saude-farmacia-botao";

const formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

const numeroOuTraco = (valor: number | null): string =>
  valor === null ? "—" : fmtNumber(valor);

type MetricaRede = "totalLeitosSus" | "totalProfissionaisSus";

/** Régua é o ano anterior: sem meta fixa, só "Em AAAA eram X". */
const referenciaRede = (
  serie: SaudeRedeAnoDTO[],
  metrica: MetricaRede,
  cadastro: (ano: SaudeRedeAnoDTO) => string,
) => {
  const comDado = serie.filter((ano) => ano[metrica] !== null);
  const atual = comDado.at(-1);
  const anterior = comDado.at(-2);
  if (!atual) return { atual, nota: "sem dado da fonte" };
  const base = cadastro(atual);
  return {
    atual,
    nota: anterior
      ? `${base}. Em ${anterior.ano} eram ${numeroOuTraco(anterior[metrica])}`
      : base,
  };
};

/** "De onde vem o dinheiro da saúde?": a fatia do Governo Federal e o total que entrou no Fundo. */
export function SaudeDestaqueOrigem({
  fontes,
  ano,
  isCurrentYear = true,
}: {
  fontes: FontesReceitaSaudeDTO;
  ano: number;
  isCurrentYear?: boolean;
}) {
  const temDados = fontes.totalEntrada > 0;
  return (
    <section
      aria-label="De onde vem o dinheiro da saúde"
      className="space-y-3"
      data-testid="saude-destaque-origem"
    >
      <h3 className="">
        De onde {isCurrentYear ? "vem" : "veio"} o dinheiro da saúde em {ano}?
      </h3>
      {temDados ? (
        <>
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="stat-value-lg text-brand-text">
              R$ {fontes.percentualUniaoSus}
            </span>
            <span className="font-semibold text-sm">
              de cada R$ 100 vêm do Governo Federal
            </span>
          </p>
          <div className="space-y-2">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 font-semibold text-sm tabular-nums">
              <span>Governo Federal: {fontes.percentualUniaoSus}%</span>
              <span>Outras fontes: {100 - fontes.percentualUniaoSus}%</span>
            </p>
            <ThresholdMeter
              value={fontes.percentualUniaoSus}
              label="Parte que vem do Governo Federal"
              valueText={`${fontes.percentualUniaoSus}% do que entrou no Fundo vem do Governo Federal`}
            />
          </div>
          <p className="caption">
            Entraram {fmtCompact(fontes.totalEntrada)} no Fundo Municipal de
            Saúde em {ano}.{" "}
            <a href="#o-que-entrou" className="font-semibold">
              Ver de onde veio cada parte
            </a>
          </p>
        </>
      ) : (
        <p className="caption">
          O portal não tem entradas do Fundo Municipal de Saúde registradas em{" "}
          {ano}.
        </p>
      )}
    </section>
  );
}

/** "Quantos leitos e profissionais o SUS tem?": números absolutos do cadastro mais recente do CNES. */
export function SaudeDestaqueRede({
  rede,
}: {
  rede: SaudeRedePorMilMoradoresDTO | null;
}) {
  const titulo = "Quantos leitos e profissionais o SUS tem hoje?";
  if (!rede) {
    return (
      <section aria-label={titulo} className="space-y-3">
        <h3>{titulo}</h3>
        <p className="caption">O portal ainda não tem esse dado.</p>
      </section>
    );
  }
  const competencia = (valor: number | null) =>
    valor ? ` em ${formatCompetencia(valor)}` : "";
  const leitos = referenciaRede(
    rede.serie,
    "totalLeitosSus",
    (ano) =>
      `${numeroOuTraco(ano.totalLeitosSus)} dos ${numeroOuTraco(ano.totalLeitosExistentes)} leitos da cidade. Cadastro do CNES${competencia(ano.competenciaLeitos)}`,
  );
  const profissionais = referenciaRede(
    rede.serie,
    "totalProfissionaisSus",
    (ano) =>
      `${numeroOuTraco(ano.totalProfissionaisSus)} dos ${numeroOuTraco(ano.totalProfissionais)} profissionais da cidade. Cadastro do CNES${competencia(ano.competenciaProfissionais)}`,
  );
  return (
    <section
      aria-label={titulo}
      className="space-y-3"
      data-testid="saude-destaque-rede"
    >
      <h3>{titulo}</h3>
      <IndicatorPanel columns={2}>
        <Indicator
          label="Leitos do SUS"
          value={numeroOuTraco(leitos.atual?.totalLeitosSus ?? null)}
          note={leitos.nota}
        />
        <Indicator
          label="Profissionais do SUS"
          value={numeroOuTraco(
            profissionais.atual?.totalProfissionaisSus ?? null,
          )}
          note={profissionais.nota}
        />
      </IndicatorPanel>
      <p className="caption">
        Cadastro do Ministério da Saúde (CNES). Não mostra se os leitos estão
        ocupados.
      </p>
    </section>
  );
}

/** Âncora da Farmácia SUS. Fora do estado "conforme" mostra só o texto e o botão, sem afirmar que há remédio. */
export function SaudeDestaqueFarmacia({
  farmacia,
  portalSlug,
}: {
  farmacia: SaudeFarmaciaResumoDTO;
  portalSlug: string;
}) {
  const titulo = "Tem o meu remédio na Farmácia SUS hoje?";
  const data = farmacia.dataPosicaoMaisRecente
    ? ` (lista de ${fmtDate(farmacia.dataPosicaoMaisRecente)})`
    : "";
  return (
    <section
      aria-label={titulo}
      className="space-y-3"
      data-testid="saude-destaque-farmacia"
    >
      <h3>{titulo}</h3>
      {farmacia.totalUnidadesAtivas !== null && (
        <IndicatorPanel columns={2}>
          <Indicator
            label="Unidades de saúde"
            value={fmtNumber(farmacia.totalUnidadesAtivas)}
            note={`informaram estoque${data}`}
          />
          {farmacia.essenciaisNoEstoque !== null &&
            farmacia.totalEssenciais !== null && (
              <Indicator
                label="Remédios essenciais"
                value={`${fmtNumber(farmacia.essenciaisNoEstoque)} de ${fmtNumber(farmacia.totalEssenciais)}`}
                note="aparecem na lista de estoque"
              />
            )}
        </IndicatorPanel>
      )}
      {farmacia.status === "apagao" && (
        <p className="caption">
          A lista de estoque está desatualizada
          {farmacia.dataPosicaoMaisRecente
            ? ` (última de ${fmtDate(farmacia.dataPosicaoMaisRecente)})`
            : ""}
          ; por isso o portal não mostra os números de estoque.
        </p>
      )}
      <p className="caption">
        A lista mostra o que cada unidade informou. Antes de ir, confirme com a
        unidade.
      </p>
      <SaudeFarmaciaBotao portalSlug={portalSlug} />
    </section>
  );
}
