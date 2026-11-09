import type {
  SaudeProducaoSusAnoDTO,
  SaudeProducaoSusDTO,
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

export interface SaudeProducaoSusProps {
  producao: SaudeProducaoSusDTO | null;
}

const totalOuTraco = (valor: number | null): string =>
  valor === null ? "—" : fmtNumber(valor);

const formatCompetencia = (competencia: number): string =>
  `${String(competencia % 100).padStart(2, "0")}/${Math.floor(competencia / 100)}`;

const maisRecentePrimeiro = (serie: SaudeProducaoSusAnoDTO[]) =>
  [...serie].reverse();

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/**
 * Período lido do dado: da primeira à última competência carregada. Se houver mês faltando no meio
 * (menos competências que o intervalo), não afirma um período contínuo e diz só o mês mais recente.
 */
function describePeriod({
  ano,
  competencias,
  primeiraCompetencia,
  ultimaCompetencia,
  mostrarAno,
}: {
  ano: number;
  competencias: number | null;
  primeiraCompetencia: number | null;
  ultimaCompetencia: number | null;
  mostrarAno: boolean;
}): string | null {
  if (!competencias || !primeiraCompetencia || !ultimaCompetencia) return null;
  const mesInicial = primeiraCompetencia % 100;
  const mesFinal = ultimaCompetencia % 100;
  const sufixo = mostrarAno ? ` de ${ano}` : "";
  const seguidos = mesFinal - mesInicial + 1 === competencias;
  if (!seguidos) return `até ${MESES[mesFinal - 1]}${sufixo}`;
  if (mesInicial === mesFinal) return `em ${MESES[mesFinal - 1]}${sufixo}`;
  return `de ${MESES[mesInicial - 1]} a ${MESES[mesFinal - 1]}${sufixo}`;
}

/** Média pequena não vira "0": com menos de 1 por mês diz isso em vez de arredondar para zero. */
function formatInpatientAverage(media: number): string {
  if (media > 0 && media < 1) return "menos de 1";
  return fmtNumber(Math.round(media));
}

/** Atendimentos em milhares por extenso ("344 mil"); internações são poucas e saem exatas. */
function spellOutTotal(total: number): string {
  const milhares = Math.round(total / 1000);
  if (milhares >= 1000) {
    const milhoes = Math.round(total / 100_000) / 10;
    const unidade = milhoes === 1 ? "milhão" : "milhões";
    return `${milhoes.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${unidade}`;
  }
  if (total >= 1000) return `${milhares} mil`;
  return fmtNumber(total);
}

/** Frase em linguagem comum com o período de cada medida: internações podem ter menos meses que atendimentos. */
function mainSentence(producao: SaudeProducaoSusDTO): string | null {
  const { serie, referenciaAmbulatorial, referenciaInternacoes } = producao;
  const atendimentos = serie.find((a) => a.ano === referenciaAmbulatorial?.ano);
  const internacoes = serie.find((a) => a.ano === referenciaInternacoes?.ano);
  const periodoAtendimentos =
    atendimentos?.totalProcedimentosAmbulatoriais != null
      ? describePeriod({
          ano: atendimentos.ano,
          competencias: atendimentos.competenciasAmbulatoriais,
          primeiraCompetencia: atendimentos.primeiraCompetenciaAmbulatorial,
          ultimaCompetencia: atendimentos.ultimaCompetenciaAmbulatorial,
          mostrarAno: true,
        })
      : null;
  const periodoInternacoes =
    internacoes?.totalInternacoes != null
      ? describePeriod({
          ano: internacoes.ano,
          competencias: internacoes.competenciasInternacoes,
          primeiraCompetencia: internacoes.primeiraCompetenciaInternacoes,
          ultimaCompetencia: internacoes.ultimaCompetenciaInternacoes,
          mostrarAno:
            internacoes.ano !== atendimentos?.ano || !periodoAtendimentos,
        })
      : null;
  const textoAtendimentos =
    atendimentos?.totalProcedimentosAmbulatoriais != null && periodoAtendimentos
      ? `${spellOutTotal(atendimentos.totalProcedimentosAmbulatoriais)} atendimentos`
      : null;
  const textoInternacoes =
    internacoes?.totalInternacoes != null && periodoInternacoes
      ? `${fmtNumber(internacoes.totalInternacoes)} ${internacoes.totalInternacoes === 1 ? "internação" : "internações"}`
      : null;
  const capitalize = (texto: string) =>
    texto.charAt(0).toUpperCase() + texto.slice(1);
  if (textoAtendimentos && textoInternacoes) {
    return `${capitalize(periodoAtendimentos ?? "")}, o SUS registrou ${textoAtendimentos} e, ${periodoInternacoes}, ${textoInternacoes} em unidades de saúde da cidade.`;
  }
  if (textoAtendimentos) {
    return `${capitalize(periodoAtendimentos ?? "")}, o SUS registrou ${textoAtendimentos} em unidades de saúde da cidade.`;
  }
  if (textoInternacoes) {
    return `${capitalize(periodoInternacoes ?? "")}, o SUS registrou ${textoInternacoes} em unidades de saúde da cidade.`;
  }
  return null;
}

interface MediaPorMes {
  valor: string;
  nota: string;
}

/** Média por mês dos meses carregados: dá escala ao total e não depende de o ano estar completo. */
function monthlyAverages(producao: SaudeProducaoSusDTO): {
  atendimentos: MediaPorMes | null;
  internacoes: MediaPorMes | null;
} {
  const { serie, referenciaAmbulatorial, referenciaInternacoes } = producao;
  const atendimentos = serie.find((a) => a.ano === referenciaAmbulatorial?.ano);
  const internacoes = serie.find((a) => a.ano === referenciaInternacoes?.ano);
  const nota = (periodo: string | null) =>
    periodo ? `média ${periodo}` : "média dos meses carregados";
  return {
    atendimentos:
      atendimentos?.totalProcedimentosAmbulatoriais != null &&
      atendimentos.competenciasAmbulatoriais
        ? {
            valor: spellOutTotal(
              Math.round(
                atendimentos.totalProcedimentosAmbulatoriais /
                  atendimentos.competenciasAmbulatoriais,
              ),
            ),
            nota: nota(
              describePeriod({
                ano: atendimentos.ano,
                competencias: atendimentos.competenciasAmbulatoriais,
                primeiraCompetencia:
                  atendimentos.primeiraCompetenciaAmbulatorial,
                ultimaCompetencia: atendimentos.ultimaCompetenciaAmbulatorial,
                mostrarAno: true,
              }),
            ),
          }
        : null,
    internacoes:
      internacoes?.totalInternacoes != null &&
      internacoes.competenciasInternacoes
        ? {
            valor: formatInpatientAverage(
              internacoes.totalInternacoes /
                internacoes.competenciasInternacoes,
            ),
            nota: nota(
              describePeriod({
                ano: internacoes.ano,
                competencias: internacoes.competenciasInternacoes,
                primeiraCompetencia: internacoes.primeiraCompetenciaInternacoes,
                ultimaCompetencia: internacoes.ultimaCompetenciaInternacoes,
                mostrarAno: true,
              }),
            ),
          }
        : null,
  };
}

function describeYear(ano: SaudeProducaoSusAnoDTO): string {
  const incompleto = ano.anoIncompleto ? " (ano incompleto)" : "";
  return `${ano.ano}${incompleto}`;
}

export function SaudeProducaoSus({ producao }: SaudeProducaoSusProps) {
  if (!producao) return null;

  const { serie, anoEmAndamento, semInternacoes } = producao;
  const temTraco = serie.some(
    (ano) =>
      ano.totalProcedimentosAmbulatoriais === null ||
      ano.totalInternacoes === null,
  );
  const dataColeta = serie
    .map((ano) => ano.dataColeta)
    .filter((data): data is string => data !== null)
    .sort()
    .at(-1);

  const medias = monthlyAverages(producao);

  return (
    <section className="space-y-6">
      <SectionHeader
        title="Quanto atendimento o SUS registra na cidade?"
        description={mainSentence(producao) ?? undefined}
      />
      <IndicatorPanel columns={2}>
        <Indicator
          label="Atendimentos por mês (média)"
          value={medias.atendimentos?.valor ?? "—"}
          note={medias.atendimentos?.nota ?? "sem dado nesta fonte"}
        />
        <Indicator
          label="Internações por mês (média)"
          value={medias.internacoes?.valor ?? "—"}
          note={medias.internacoes?.nota ?? "sem dado nesta fonte"}
        />
      </IndicatorPanel>
      <AlertBox type="info">
        <div className="space-y-2">
          <p>
            Inclui pessoas de outras cidades atendidas aqui. Não mostra tempo de
            espera nem se faltou vaga. Quem mora aqui e se trata em outra cidade
            não entra na conta daqui.
          </p>
          {semInternacoes ? (
            <p>
              Esta fonte não trouxe internações pagas pelo SUS para o município.
              Isso não diz quantas internações ocorrem na cidade: apenas que não
              há registro nesta base.
            </p>
          ) : null}
          {anoEmAndamento ? (
            <p>
              O ano de {anoEmAndamento.ano} está em andamento: a fonte tem dados
              só até{" "}
              {anoEmAndamento.ateCompetencia
                ? formatCompetencia(anoEmAndamento.ateCompetencia)
                : "agora"}{" "}
              e por isso ele não é comparado com anos completos.
            </p>
          ) : null}
          <SaudeDetalhesModal titulo="Detalhes de atendimentos e internações">
            <div className="space-y-4">
              {temTraco ? (
                <p className="caption">
                  O traço (—) indica que a fonte não trouxe o dado; não quer
                  dizer zero.
                </p>
              ) : null}
              <p className="caption">
                Cálculo do Portal: a média por mês é o total do período dividido
                pelo número de meses que a fonte trouxe. Atendimentos sem
                internação são os procedimentos ambulatoriais pagos pelo SUS
                (cada consulta, exame ou procedimento conta um); internações são
                as autorizações de internação hospitalar pagas pelo SUS.
                Consultas e exames particulares ou de planos de saúde não
                entram. Os números são os registrados pelo Ministério da Saúde,
                com atraso de 1 a 2 meses.
              </p>
              {serie.length > 1 ? (
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Ano</th>
                      <th scope="col" className="numeric">
                        Atendimentos sem internação
                      </th>
                      <th scope="col" className="numeric">
                        Internações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {maisRecentePrimeiro(serie).map((ano) => (
                      <tr key={ano.ano}>
                        <td>{describeYear(ano)}</td>
                        <td className="numeric">
                          {totalOuTraco(ano.totalProcedimentosAmbulatoriais)}
                        </td>
                        <td className="numeric">
                          {totalOuTraco(ano.totalInternacoes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </SaudeDetalhesModal>
        </div>
      </AlertBox>
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
