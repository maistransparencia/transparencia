import type {
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import {
  AlertBox,
  fmtDate,
  fmtNumber,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

import { SaudeDetalhesModal } from "./saude-detalhes-modal";

export interface SaudeRedeSusProps {
  rede: SaudeRedePorMilMoradoresDTO | null;
}

const formatPorMil = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const porMilOuTraco = (valor: number | null): string =>
  valor === null ? "—" : formatPorMil.format(valor);

const numeroOuTraco = (valor: number | null): string =>
  valor === null ? "—" : fmtNumber(valor);

const formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

type Metrica =
  | "totalLeitosExistentes"
  | "totalLeitosSus"
  | "totalProfissionais";

const ultimoComDado = (
  serie: SaudeRedeAnoDTO[],
  metrica: Metrica,
): SaudeRedeAnoDTO | undefined =>
  [...serie].reverse().find((ano) => ano[metrica] !== null);

function notaComparacao({
  serie,
  metrica,
  atual,
  competencia,
}: {
  serie: SaudeRedeAnoDTO[];
  metrica: Metrica;
  atual: SaudeRedeAnoDTO;
  competencia: number | null;
}): string {
  const base = competencia
    ? `cadastro do CNES em ${formatCompetencia(competencia)}`
    : `em ${atual.ano}`;
  const anterior = [...serie]
    .reverse()
    .find((ano) => ano.ano < atual.ano && ano[metrica] !== null);
  if (!anterior) return base;
  return `${base}. Em ${anterior.ano} eram ${numeroOuTraco(anterior[metrica])}`;
}

export function SaudeRedeSus({ rede }: SaudeRedeSusProps) {
  if (!rede) return null;

  const { serie } = rede;
  const leitos = ultimoComDado(serie, "totalLeitosExistentes");
  const leitosSus = ultimoComDado(serie, "totalLeitosSus");
  const profissionais = ultimoComDado(serie, "totalProfissionais");
  const maisRecente = serie.at(-1);
  const dataColeta = serie
    .map((ano) => ano.dataColeta)
    .filter((data): data is string => data !== null)
    .sort()
    .at(-1);
  const anoEstimado = serie.find(
    (ano) => ano.populacaoEstimada && ano.anoPopulacaoReferencia !== null,
  );
  const anoSemPopulacao = serie.find(
    (ano) =>
      ano.populacaoResidente === null &&
      (ano.totalLeitosExistentes !== null || ano.totalProfissionais !== null),
  );
  const temTraco = [
    leitos?.totalLeitosExistentes,
    leitosSus?.totalLeitosSus,
    profissionais?.totalProfissionais,
  ].some((valor) => valor === null || valor === undefined);
  const competenciaLeitos = leitos?.competenciaLeitos ?? null;
  const competenciaProfissionais =
    profissionais?.competenciaProfissionais ?? null;
  const porMilReferencia = maisRecente
    ? `${porMilOuTraco(maisRecente.leitosSusPorMilMoradores)} leitos do SUS e ${porMilOuTraco(maisRecente.profissionaisPorMilMoradores)} profissionais por mil moradores em ${maisRecente.ano}${maisRecente.populacaoEstimada ? " (população estimada)" : ""}`
    : null;

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Quantos leitos e profissionais de saúde a cidade tem hoje?"
        description={
          rede.anoMin === rede.anoMax
            ? `Dados de ${rede.anoMax}. Ainda não há outros anos para comparar.`
            : "Mostra se a rede de saúde da cidade cresceu ou encolheu em relação aos anos anteriores."
        }
      />
      <IndicatorPanel columns={3}>
        <Indicator
          label="Leitos existentes"
          value={numeroOuTraco(leitos?.totalLeitosExistentes ?? null)}
          note={
            leitos
              ? notaComparacao({
                  serie,
                  metrica: "totalLeitosExistentes",
                  atual: leitos,
                  competencia: competenciaLeitos,
                })
              : "sem dado da fonte"
          }
        />
        <Indicator
          label="Leitos do SUS"
          value={numeroOuTraco(leitosSus?.totalLeitosSus ?? null)}
          note={
            leitosSus
              ? notaComparacao({
                  serie,
                  metrica: "totalLeitosSus",
                  atual: leitosSus,
                  competencia: leitosSus.competenciaLeitos,
                })
              : "sem dado da fonte"
          }
        />
        <Indicator
          label="Profissionais de saúde"
          value={numeroOuTraco(profissionais?.totalProfissionais ?? null)}
          note={
            profissionais
              ? notaComparacao({
                  serie,
                  metrica: "totalProfissionais",
                  atual: profissionais,
                  competencia: competenciaProfissionais,
                })
              : "sem dado da fonte"
          }
        />
      </IndicatorPanel>
      <SaudeDetalhesModal titulo="Detalhes de leitos e profissionais">
        <div className="space-y-4">
          <p className="caption">
            Leitos e profissionais vêm do Cadastro Nacional de Estabelecimentos
            de Saúde (CNES), na competência mais recente de cada ano. Quem
            trabalha em mais de um local conta uma vez só, pelo número do Cartão
            Nacional de Saúde (CNS); vínculo sem esse número não entra na
            contagem de pessoas. O número não mede a qualidade do atendimento
            nem se os leitos estão ocupados.
          </p>
          <p className="caption">
            Por mil moradores quer dizer: para cada 1.000 pessoas que moram no
            município. Cálculo do Portal: total dividido pela população do
            município, vezes mil.
            {porMilReferencia ? ` Resultado: ${porMilReferencia}.` : ""}
            {anoEstimado
              ? ` A população de ${anoEstimado.ano} ainda não foi divulgada: o cálculo usa a de ${anoEstimado.anoPopulacaoReferencia}, por isso é uma estimativa.`
              : ""}
            {anoSemPopulacao
              ? ` Em ${anoSemPopulacao.ano} não há população divulgada para o município, por isso não foi possível calcular por mil moradores.`
              : ""}
          </p>
          {serie.length > 1 ? (
            <table>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col" className="numeric">
                    Leitos
                  </th>
                  <th scope="col" className="numeric">
                    Leitos do SUS
                  </th>
                  <th scope="col" className="numeric">
                    Profissionais
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
                    <td>
                      {ano.ano}
                      {ano.populacaoEstimada ? " (população estimada)" : ""}
                    </td>
                    <td className="numeric">
                      {numeroOuTraco(ano.totalLeitosExistentes)}
                    </td>
                    <td className="numeric">
                      {numeroOuTraco(ano.totalLeitosSus)}
                    </td>
                    <td className="numeric">
                      {numeroOuTraco(ano.totalProfissionais)}
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
          ) : null}
        </div>
      </SaudeDetalhesModal>
      {temTraco && (
        <AlertBox type="info" title="Dado não disponível">
          O traço (—) indica que a fonte não trouxe o dado; não quer dizer zero.
        </AlertBox>
      )}
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
