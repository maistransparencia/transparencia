import type {
  SaudeProducaoSusAnoDTO,
  SaudeProducaoSusDTO,
  SaudeProducaoSusReferenciaDTO,
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

import { rotuloPeriodoAnos } from "./periodo-anos";
import { SaudeDetalhesModal } from "./saude-detalhes-modal";

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
function descreverPeriodo({
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

/** Atendimentos em milhares por extenso ("344 mil"); internações são poucas e saem exatas. */
function totalPorExtenso(total: number): string {
  if (total >= 1_000_000)
    return `${(total / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} milhões`;
  if (total >= 1000) return `${Math.round(total / 1000)} mil`;
  return fmtNumber(total);
}

/** Frase em linguagem comum com o período de cada medida: internações podem ter menos meses que atendimentos. */
function frasePrincipal(producao: SaudeProducaoSusDTO): string | null {
  const { serie, referenciaAmbulatorial, referenciaInternacoes } = producao;
  const atendimentos = serie.find((a) => a.ano === referenciaAmbulatorial?.ano);
  const internacoes = serie.find((a) => a.ano === referenciaInternacoes?.ano);
  const periodoAtendimentos =
    atendimentos?.totalProcedimentosAmbulatoriais != null
      ? descreverPeriodo({
          ano: atendimentos.ano,
          competencias: atendimentos.competenciasAmbulatoriais,
          primeiraCompetencia: atendimentos.primeiraCompetenciaAmbulatorial,
          ultimaCompetencia: atendimentos.ultimaCompetenciaAmbulatorial,
          mostrarAno: true,
        })
      : null;
  const periodoInternacoes =
    internacoes?.totalInternacoes != null
      ? descreverPeriodo({
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
      ? `${totalPorExtenso(atendimentos.totalProcedimentosAmbulatoriais)} atendimentos`
      : null;
  const textoInternacoes =
    internacoes?.totalInternacoes != null && periodoInternacoes
      ? `${fmtNumber(internacoes.totalInternacoes)} ${internacoes.totalInternacoes === 1 ? "internação" : "internações"}`
      : null;
  const maiuscula = (texto: string) =>
    texto.charAt(0).toUpperCase() + texto.slice(1);
  if (textoAtendimentos && textoInternacoes) {
    return `${maiuscula(periodoAtendimentos ?? "")}, o SUS registrou ${textoAtendimentos} e, ${periodoInternacoes}, ${textoInternacoes} em unidades de saúde da cidade.`;
  }
  if (textoAtendimentos) {
    return `${maiuscula(periodoAtendimentos ?? "")}, o SUS registrou ${textoAtendimentos} em unidades de saúde da cidade.`;
  }
  if (textoInternacoes) {
    return `${maiuscula(periodoInternacoes ?? "")}, o SUS registrou ${textoInternacoes} em unidades de saúde da cidade.`;
  }
  return null;
}

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
  const temTraco = [
    valorDaReferencia(serie, referenciaAmbulatorial, atendimentosPorMil),
    valorDaReferencia(serie, referenciaInternacoes, internacoesPorMil),
  ].some((valor) => valor === null || valor === undefined);
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
        title="Quanto atendimento o SUS registra na cidade?"
        eyebrow={
          producao.anoMin === producao.anoMax
            ? undefined
            : rotuloPeriodoAnos(producao.anoMin, producao.anoMax)
        }
        description={frasePrincipal(producao) ?? undefined}
      />
      <IndicatorPanel columns={2}>
        <Indicator
          label="Atendimentos (consultas, exames e outros) por mil moradores"
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
          label="Internações por mil moradores"
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
      <AlertBox type="info">
        <div className="space-y-2">
          <p>
            Inclui pessoas de outras cidades atendidas aqui. Não mostra tempo de
            espera nem se faltou vaga. Quem mora aqui e se trata em outra cidade
            não entra na conta daqui.
          </p>
          <p>
            Por mil moradores quer dizer: para cada 1.000 pessoas que moram no
            município.
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
          {temTraco ? (
            <p>
              O traço (—) indica que a fonte não trouxe o dado; não quer dizer
              zero.
              {anoEstimado
                ? ` A população de ${anoEstimado.ano} ainda não foi divulgada: o cálculo usa a de ${anoEstimado.anoPopulacaoReferencia}, por isso o resultado é uma estimativa.`
                : ""}
              {anoSemPopulacao
                ? ` Em ${anoSemPopulacao.ano} não há população divulgada para o município, por isso não foi possível calcular por mil moradores.`
                : ""}
            </p>
          ) : null}
          <SaudeDetalhesModal titulo="Detalhes de atendimentos e internações">
            <div className="space-y-4">
              <p className="caption">
                Cálculo do Portal: total de atendimentos (ou de internações)
                dividido pela população do município, vezes mil. Atendimentos
                sem internação são os procedimentos ambulatoriais pagos pelo SUS
                (cada consulta, exame ou procedimento conta um); internações são
                as AIH, autorizações de internação hospitalar, pagas pelo SUS.
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
                          {porMilOuTraco(
                            ano.procedimentosAmbulatoriaisPorMilMoradores,
                          )}
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
