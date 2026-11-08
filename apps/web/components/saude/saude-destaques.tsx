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

const POR_MIL_EXPLICACAO =
  "Por mil moradores quer dizer: para cada 1.000 pessoas que moram no município.";
const NOTA_POPULACAO_ESTIMADA =
  "Estimativa: o total dividido pela população estimada, que não é a do censo.";

const formatPorMil = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const formatPorMilInteiro = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});
/** Passando de 100, a casa decimal é ruído: 19.298 em vez de 19.298,0. */
const porMilOuTraco = (valor: number | null): string => {
  if (valor === null) return "—";
  return Math.abs(valor) >= 100
    ? formatPorMilInteiro.format(valor)
    : formatPorMil.format(valor);
};

const _formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

/** Régua é o ano anterior: sem meta fixa, só "em AAAA eram X". */
const notaComAnoAnterior = (
  ano: number,
  anterior: { ano: number; valor: number | null } | undefined,
): string =>
  anterior && anterior.valor !== null
    ? `em ${ano}. Em ${anterior.ano} eram ${porMilOuTraco(anterior.valor)}`
    : `em ${ano}`;

type MetricaRede =
  | "leitosSusPorMilMoradores"
  | "profissionaisSusPorMilMoradores";

const referenciaRede = (serie: SaudeRedeAnoDTO[], metrica: MetricaRede) => {
  const comDado = serie.filter((ano) => ano[metrica] !== null);
  const atual = comDado.at(-1);
  const anterior = comDado.at(-2);
  return {
    atual,
    nota: atual
      ? notaComAnoAnterior(
          atual.ano,
          anterior && { ano: anterior.ano, valor: anterior[metrica] },
        )
      : "sem dado da fonte",
  };
};

/** "De onde vem o dinheiro da saúde?": a fatia do Governo Federal e o total que entrou no Fundo. */
export function SaudeDestaqueOrigem({
  fontes,
  ano,
}: {
  fontes: FontesReceitaSaudeDTO;
  ano: number;
}) {
  const temDados = fontes.totalEntrada > 0;
  return (
    <section
      aria-label="De onde vem o dinheiro da saúde"
      className="space-y-3"
      data-testid="saude-destaque-origem"
    >
      <p className="eyebrow">Origem do dinheiro da saúde</p>
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

/** "Quantos leitos e profissionais do SUS há por mil moradores?" */
export function SaudeDestaqueRede({
  rede,
}: {
  rede: SaudeRedePorMilMoradoresDTO | null;
}) {
  const titulo = "Quantos leitos e profissionais do SUS há por mil moradores?";
  const eyebrow = "Rede do SUS por mil moradores";
  if (!rede) {
    return (
      <section aria-label={titulo} className="space-y-3">
        <p className="eyebrow">{eyebrow}</p>
        <p className="caption">O portal ainda não tem esse dado.</p>
      </section>
    );
  }
  const leitos = referenciaRede(rede.serie, "leitosSusPorMilMoradores");
  const profissionais = referenciaRede(
    rede.serie,
    "profissionaisSusPorMilMoradores",
  );
  const estimada = [leitos.atual, profissionais.atual].some(
    (ano) => ano?.populacaoEstimada,
  );
  return (
    <section
      aria-label={titulo}
      className="space-y-3"
      data-testid="saude-destaque-rede"
    >
      <p className="eyebrow">{eyebrow}</p>
      <IndicatorPanel columns={2}>
        <Indicator
          label="Leitos do SUS"
          value={porMilOuTraco(leitos.atual?.leitosSusPorMilMoradores ?? null)}
          note={leitos.nota}
        />
        <Indicator
          label="Profissionais do SUS"
          value={porMilOuTraco(
            profissionais.atual?.profissionaisSusPorMilMoradores ?? null,
          )}
          note={profissionais.nota}
        />
      </IndicatorPanel>
      <p className="caption">
        {[POR_MIL_EXPLICACAO, estimada ? NOTA_POPULACAO_ESTIMADA : null]
          .filter(Boolean)
          .join(" ")}
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
  const titulo = "O remédio que eu preciso está na Farmácia SUS?";
  const eyebrow = "Remédios na Farmácia SUS";
  const data = farmacia.dataPosicaoMaisRecente
    ? ` (lista de ${fmtDate(farmacia.dataPosicaoMaisRecente)})`
    : "";
  return (
    <section
      aria-label={titulo}
      className="space-y-3"
      data-testid="saude-destaque-farmacia"
    >
      <p className="eyebrow">{eyebrow}</p>
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
      <p className="caption">
        A lista mostra o que cada unidade informou. Antes de ir, confirme com a
        unidade.
      </p>
      <SaudeFarmaciaBotao portalSlug={portalSlug} />
    </section>
  );
}
