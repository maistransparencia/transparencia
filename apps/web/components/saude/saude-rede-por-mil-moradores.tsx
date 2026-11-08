import type {
  SaudeRedeAnoDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import {
  AlertBox,
  fmtDate,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

import { rotuloPeriodoAnos } from "./periodo-anos";
import { SaudeDetalhesModal } from "./saude-detalhes-modal";

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
  const leitosCompetencia = leitos?.competenciaLeitos ?? null;
  const profissionaisCompetencia =
    profissionais?.competenciaProfissionais ?? null;
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
    leitos?.leitosExistentesPorMilMoradores,
    leitosSus?.leitosSusPorMilMoradores,
    profissionais?.profissionaisPorMilMoradores,
  ].some((valor) => valor === null || valor === undefined);
  const textoCompetencias = (() => {
    if (leitosCompetencia && profissionaisCompetencia)
      return `; os leitos mostrados são de ${formatCompetencia(leitosCompetencia)} e os profissionais, de ${formatCompetencia(profissionaisCompetencia)}`;
    if (leitosCompetencia)
      return `; os leitos mostrados são de ${formatCompetencia(leitosCompetencia)}`;
    if (profissionaisCompetencia)
      return `; os profissionais mostrados são de ${formatCompetencia(profissionaisCompetencia)}`;
    return "";
  })();
  const notaEstimativa = (ano: SaudeRedeAnoDTO | undefined, nota: string) =>
    ano?.populacaoEstimada ? `${nota} (população estimada)` : nota;

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Quantos leitos e profissionais de saúde há para cada mil moradores?"
        eyebrow={
          rede.anoMin === rede.anoMax
            ? undefined
            : rotuloPeriodoAnos(rede.anoMin, rede.anoMax)
        }
        description={
          rede.anoMin === rede.anoMax
            ? `Dados de ${rede.anoMax}. Ainda não há outros anos para comparar.`
            : "Mostra se a rede de saúde da cidade cresceu ou encolheu em relação aos anos anteriores."
        }
      />
      <IndicatorPanel columns={3}>
        <Indicator
          label="Leitos existentes por mil moradores"
          value={porMilOuTraco(leitos?.leitosExistentesPorMilMoradores ?? null)}
          note={
            leitos
              ? notaEstimativa(
                  leitos,
                  notaComparacao(
                    serie,
                    "leitosExistentesPorMilMoradores",
                    leitos,
                  ),
                )
              : "sem dado da fonte"
          }
        />
        <Indicator
          label="Leitos do SUS por mil moradores"
          value={porMilOuTraco(leitosSus?.leitosSusPorMilMoradores ?? null)}
          note={
            leitosSus
              ? notaEstimativa(
                  leitosSus,
                  notaComparacao(serie, "leitosSusPorMilMoradores", leitosSus),
                )
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
              ? notaEstimativa(
                  profissionais,
                  notaComparacao(
                    serie,
                    "profissionaisPorMilMoradores",
                    profissionais,
                  ),
                )
              : "sem dado da fonte"
          }
        />
      </IndicatorPanel>
      <SaudeDetalhesModal titulo="Detalhes de leitos e profissionais">
        <div className="space-y-4">
          <p className="caption">
            Cálculo do Portal: total de leitos (ou de profissionais) dividido
            pela população do município, vezes mil. Leitos e profissionais vêm
            do Cadastro Nacional de Estabelecimentos de Saúde (CNES)
            {textoCompetencias}. Quem trabalha em mais de um local conta uma vez
            só, pelo número do Cartão Nacional de Saúde (CNS); vínculo sem esse
            número não entra na contagem de pessoas. O número não mede a
            qualidade do atendimento nem se os leitos estão ocupados.
          </p>
          {serie.length > 1 ? (
            <table>
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
                    <td>
                      {ano.ano}
                      {ano.populacaoEstimada ? " (população estimada)" : ""}
                    </td>
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
          ) : null}
        </div>
      </SaudeDetalhesModal>
      {temTraco && (
        <AlertBox type="info" title="Dado não disponível">
          O traço (—) indica que a fonte não trouxe o dado; não quer dizer zero.
          {anoEstimado
            ? ` A população de ${anoEstimado.ano} ainda não foi divulgada: o cálculo usa a de ${anoEstimado.anoPopulacaoReferencia}, por isso o resultado é uma estimativa.`
            : ""}
          {anoSemPopulacao
            ? ` Em ${anoSemPopulacao.ano} não há população divulgada para o município, por isso não foi possível calcular por mil moradores.`
            : ""}
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
