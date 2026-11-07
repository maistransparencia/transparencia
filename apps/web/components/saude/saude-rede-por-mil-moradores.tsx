import type {
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import {
  fmtDate,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface SaudeRedePorMilMoradoresProps {
  rede: SaudeRedePorMilMoradoresDTO | null;
}

const formatPorMil = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const porMilOuTraco = (valor: number | null): string =>
  valor === null ? "—" : formatPorMil.format(valor);

const formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

type Metrica =
  | "leitosExistentesPorMilMoradores"
  | "leitosSusPorMilMoradores"
  | "profissionaisPorMilMoradores";

const ultimoComDado = (
  serie: SaudeRedeAnoDTO[],
  metrica: Metrica,
): SaudeRedeAnoDTO | undefined =>
  [...serie].reverse().find((ano) => ano[metrica] !== null);

function notaComparacao(
  serie: SaudeRedeAnoDTO[],
  metrica: Metrica,
  atual: SaudeRedeAnoDTO,
): string {
  const anterior = [...serie]
    .reverse()
    .find((ano) => ano.ano < atual.ano && ano[metrica] !== null);
  if (!anterior) return `em ${atual.ano}`;
  return `em ${atual.ano}. Em ${anterior.ano} eram ${porMilOuTraco(anterior[metrica])}`;
}

export function SaudeRedePorMilMoradores({
  rede,
}: SaudeRedePorMilMoradoresProps) {
  if (!rede) return null;

  const { serie } = rede;
  const leitos = ultimoComDado(serie, "leitosExistentesPorMilMoradores");
  const leitosSus = ultimoComDado(serie, "leitosSusPorMilMoradores");
  const profissionais = ultimoComDado(serie, "profissionaisPorMilMoradores");
  const referencia = leitos ?? profissionais;
  const dataColeta = serie
    .map((ano) => ano.dataColeta)
    .filter((data): data is string => data !== null)
    .sort()
    .at(-1);
  const anoEstimado = serie.find(
    (ano) => ano.populacaoEstimada && ano.anoPopulacaoReferencia !== null,
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Quantos leitos e profissionais de saúde há para cada mil moradores?"
        eyebrow={`${rede.anoMin}–${rede.anoMax}`}
        description="Mostra se a rede de saúde da cidade cresceu ou encolheu em relação aos anos anteriores. O Portal calcula esses números dividindo o total pela população e multiplicando por mil."
      />
      <IndicatorPanel columns={3}>
        <Indicator
          label="Leitos hospitalares por mil moradores"
          value={porMilOuTraco(leitos?.leitosExistentesPorMilMoradores ?? null)}
          note={
            leitos
              ? notaComparacao(serie, "leitosExistentesPorMilMoradores", leitos)
              : "sem dado da fonte"
          }
        />
        <Indicator
          label="Leitos hospitalares do SUS por mil moradores"
          value={porMilOuTraco(leitosSus?.leitosSusPorMilMoradores ?? null)}
          note={
            leitosSus
              ? notaComparacao(serie, "leitosSusPorMilMoradores", leitosSus)
              : "sem dado da fonte"
          }
        />
        <Indicator
          label="Profissionais de saúde por mil moradores"
          value={porMilOuTraco(
            profissionais?.profissionaisPorMilMoradores ?? null,
          )}
          note={
            profissionais
              ? notaComparacao(
                  serie,
                  "profissionaisPorMilMoradores",
                  profissionais,
                )
              : "sem dado da fonte"
          }
        />
      </IndicatorPanel>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th scope="col">Ano</th>
            <th scope="col" className="numeric">
              Leitos por mil
            </th>
            <th scope="col" className="numeric">
              Leitos do SUS por mil
            </th>
            <th scope="col" className="numeric">
              Profissionais por mil
            </th>
          </tr>
        </thead>
        <tbody>
          {[...serie].reverse().map((ano) => (
            <tr key={ano.ano}>
              <td>{ano.ano}</td>
              <td className="numeric">
                {porMilOuTraco(ano.leitosExistentesPorMilMoradores)}
              </td>
              <td className="numeric">
                {porMilOuTraco(ano.leitosSusPorMilMoradores)}
              </td>
              <td className="numeric">
                {porMilOuTraco(ano.profissionaisPorMilMoradores)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="caption">
        Cálculo do Portal: total de leitos (ou de profissionais) dividido pela
        população do município, vezes mil. Leitos e profissionais vêm do
        Cadastro Nacional de Estabelecimentos de Saúde (CNES)
        {referencia?.competenciaLeitos
          ? `; no ano mais recente, os dados são de ${formatCompetencia(referencia.competenciaLeitos)}`
          : ""}
        . Quem trabalha em mais de um local conta uma vez só. O número não mede
        a qualidade do atendimento nem se os leitos estão ocupados. O traço (—)
        indica que a fonte não trouxe o dado; não quer dizer zero.
        {anoEstimado
          ? ` A população de ${anoEstimado.ano} ainda não foi divulgada: o cálculo usa a de ${anoEstimado.anoPopulacaoReferencia}, por isso o resultado é uma estimativa.`
          : ""}
      </p>
      <LinhaLeiEFonte
        source={
          <LeiLink
            label={FONTES_OFICIAIS.dadosAbertosSaude.nome}
            url={FONTES_OFICIAIS.dadosAbertosSaude.url}
          />
        }
        extra={dataColeta ? `Coletado em ${fmtDate(dataColeta)}` : undefined}
      />
    </section>
  );
}
