import type {
  SaudeProducaoSusAnoDTO,
  SaudeProducaoSusDTO,
  SaudeProducaoSusReferenciaDTO,
} from "@transparencia/db";
import {
  fmtDate,
  fmtNumber,
  Indicator,
  IndicatorPanel,
  SectionHeader,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface SaudeProducaoSusProps {
  producao: SaudeProducaoSusDTO | null;
}

const formatPorMil = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const porMilOuTraco = (valor: number | null): string =>
  valor === null ? "—" : formatPorMil.format(valor);

const totalOuTraco = (valor: number | null): string =>
  valor === null ? "—" : fmtNumber(valor);

const formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

const maisRecentePrimeiro = (serie: SaudeProducaoSusAnoDTO[]) =>
  [...serie].reverse();

function notaDoIndicador(
  serie: SaudeProducaoSusAnoDTO[],
  referencia: SaudeProducaoSusReferenciaDTO | null,
  porMil: (ano: SaudeProducaoSusAnoDTO) => number | null,
): string {
  if (!referencia) return "sem dado nesta fonte";
  const doAno = serie.find((ano) => ano.ano === referencia.ano);
  const estimada = doAno?.populacaoEstimada ? " (população estimada)" : "";
  if (!referencia.completo) {
    const ate = referencia.ultimaCompetencia;
    return `ano ${referencia.ano} incompleto${ate ? `, com dados até ${formatCompetencia(ate)}` : ""}${estimada}`;
  }
  const anterior = serie.find((ano) => ano.ano === referencia.anoAnterior);
  const base = anterior
    ? `em ${referencia.ano}. Em ${anterior.ano} eram ${porMilOuTraco(porMil(anterior))}`
    : `em ${referencia.ano}`;
  return `${base}${estimada}`;
}

function valorDaReferencia(
  serie: SaudeProducaoSusAnoDTO[],
  referencia: SaudeProducaoSusReferenciaDTO | null,
  porMil: (ano: SaudeProducaoSusAnoDTO) => number | null,
): number | null {
  const doAno = serie.find((ano) => ano.ano === referencia?.ano);
  return doAno ? porMil(doAno) : null;
}

const atendimentosPorMil = (ano: SaudeProducaoSusAnoDTO) =>
  ano.procedimentosAmbulatoriaisPorMilMoradores;

const internacoesPorMil = (ano: SaudeProducaoSusAnoDTO) =>
  ano.internacoesPorMilMoradores;

function descricaoAno(ano: SaudeProducaoSusAnoDTO): string {
  const incompleto = ano.anoIncompleto ? " (ano incompleto)" : "";
  const estimada = ano.populacaoEstimada ? " (população estimada)" : "";
  return `${ano.ano}${incompleto}${estimada}`;
}

export function SaudeProducaoSus({ producao }: SaudeProducaoSusProps) {
  if (!producao) return null;

  const {
    serie,
    referenciaAmbulatorial,
    referenciaInternacoes,
    anoEmAndamento,
    semInternacoes,
  } = producao;
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
      (ano.totalProcedimentosAmbulatoriais !== null ||
        ano.totalInternacoes !== null),
  );

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Quantos atendimentos e internações o SUS fez na cidade?"
        eyebrow={`${producao.anoMin}–${producao.anoMax}`}
        description="Mostra a produção que o SUS registrou e pagou na cidade, comparada com o ano anterior. Não é todo o atendimento da cidade: consultas e exames particulares ou de planos de saúde não entram. O Portal calcula o número por mil moradores."
      />
      <IndicatorPanel columns={2}>
        <Indicator
          label="Atendimentos sem internação por mil moradores"
          value={porMilOuTraco(
            valorDaReferencia(
              serie,
              referenciaAmbulatorial,
              atendimentosPorMil,
            ),
          )}
          note={notaDoIndicador(
            serie,
            referenciaAmbulatorial,
            atendimentosPorMil,
          )}
        />
        <Indicator
          label="Internações pagas pelo SUS por mil moradores"
          value={porMilOuTraco(
            valorDaReferencia(serie, referenciaInternacoes, internacoesPorMil),
          )}
          note={notaDoIndicador(
            serie,
            referenciaInternacoes,
            internacoesPorMil,
          )}
        />
      </IndicatorPanel>
      {semInternacoes ? (
        <p className="caption">
          Esta fonte não trouxe internações pagas pelo SUS para o município.
          Isso não diz quantas internações ocorrem na cidade: apenas que não há
          registro nesta base.
        </p>
      ) : null}
      {anoEmAndamento ? (
        <p className="caption">
          O ano de {anoEmAndamento.ano} está em andamento: a fonte tem dados só
          até{" "}
          {anoEmAndamento.ateCompetencia
            ? formatCompetencia(anoEmAndamento.ateCompetencia)
            : "agora"}{" "}
          e por isso ele não é comparado com anos completos.
        </p>
      ) : null}
      <details>
        <summary>Ver detalhes por ano</summary>
        <table>
          <thead>
            <tr>
              <th scope="col">Ano</th>
              <th scope="col" className="numeric">
                Atendimentos sem internação
              </th>
              <th scope="col" className="numeric">
                por mil moradores
              </th>
              <th scope="col" className="numeric">
                Internações
              </th>
              <th scope="col" className="numeric">
                por mil moradores
              </th>
            </tr>
          </thead>
          <tbody>
            {maisRecentePrimeiro(serie).map((ano) => (
              <tr key={ano.ano}>
                <td>{descricaoAno(ano)}</td>
                <td className="numeric">
                  {totalOuTraco(ano.totalProcedimentosAmbulatoriais)}
                </td>
                <td className="numeric">
                  {porMilOuTraco(ano.procedimentosAmbulatoriaisPorMilMoradores)}
                </td>
                <td className="numeric">
                  {totalOuTraco(ano.totalInternacoes)}
                </td>
                <td className="numeric">
                  {porMilOuTraco(ano.internacoesPorMilMoradores)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="caption">
        Cálculo do Portal: total de atendimentos (ou de internações) dividido
        pela população do município, vezes mil. Atendimentos sem internação são
        os procedimentos ambulatoriais pagos pelo SUS (cada consulta, exame ou
        procedimento conta um); internações são as AIH, autorizações de
        internação hospitalar, pagas pelo SUS. Os números são os registrados
        pelo Ministério da Saúde, com atraso de 1 a 2 meses. O traço (—) indica
        que a fonte não trouxe o dado; não quer dizer zero.
        {anoEstimado
          ? ` A população de ${anoEstimado.ano} ainda não foi divulgada: o cálculo usa a de ${anoEstimado.anoPopulacaoReferencia}, por isso o resultado é uma estimativa.`
          : ""}
        {anoSemPopulacao
          ? ` Em ${anoSemPopulacao.ano} não há população divulgada para o município, por isso não foi possível calcular por mil moradores.`
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
