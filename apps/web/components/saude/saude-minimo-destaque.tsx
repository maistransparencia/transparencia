"use client";

import type { SaudeMinimoConstitucionalDTO } from "@transparencia/db";
import {
  AlertBox,
  fmtCurrency,
  fmtDate,
  fmtPercent,
  ModalDialog,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import { useState } from "react";
import { LeiLink, LinhaLeiEFonte } from "@/components/educacao/educacao-textos";
import { VerDetalhesLink } from "@/components/educacao/ver-detalhes-link";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";

export interface SaudeMinimoDestaqueProps {
  minimoSaude: SaudeMinimoConstitucionalDTO;
}

const formatarLimite = (limite: number) =>
  `${limite.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

const valorOuTraco = (valor: number | null, formatar: (n: number) => string) =>
  valor === null ? "—" : formatar(valor);

/** Mensagem abaixo da barra: só descreve o que o SIOPS registra e a régua legal. */
function descreverResultado(minimoSaude: SaudeMinimoConstitucionalDTO): string {
  const { atual, minimo, ano } = minimoSaude;
  const aplicado = valorOuTraco(minimo.percentualAplicado, fmtPercent);
  switch (minimo.resultado) {
    case "parcial":
      return `Valor parcial de ${ano}${atual ? `, até o ${atual.periodo}º bimestre (${atual.periodo * 2} primeiros meses)` : ""}. O mínimo vale para o ano inteiro; só dá para conferir quando o ano fecha.`;
    case "abaixo":
      return `O SIOPS registra ${aplicado} em ${ano}, abaixo dos ${minimo.limite === null ? "" : formatarLimite(minimo.limite)} exigidos. É um indício a ser esclarecido pela Prefeitura.`;
    case "indeterminado":
      return `O SIOPS registra ${aplicado} em ${ano}, mas o portal ainda não confirmou esse valor e por isso não o compara com o mínimo.`;
    case "sem_dado":
      return `O SIOPS não tem dado de saúde publicado para ${ano}.`;
    default:
      return "";
  }
}

/** `warning` só para o que a Prefeitura precisa esclarecer; parcial e em conferência são `info`. */
const ALERTAS: Partial<
  Record<
    SaudeMinimoConstitucionalDTO["minimo"]["resultado"],
    { tipo: "warning" | "info"; titulo: string }
  >
> = {
  parcial: { tipo: "info", titulo: "Ano em andamento" },
  abaixo: { tipo: "warning", titulo: "Abaixo do mínimo" },
  indeterminado: { tipo: "info", titulo: "Valor em conferência" },
};

/** Topo de /saude: o percentual do SIOPS frente ao mínimo, com lei, fonte e data da última transmissão. */
export function SaudeMinimoDestaque({ minimoSaude }: SaudeMinimoDestaqueProps) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);
  const { ano, atual, minimo, serie, anoInicial, anoFinal } = minimoSaude;
  const { limite, percentualAplicado, resultado, baseLegal, urlBaseLegal } =
    minimo;
  const temValor = percentualAplicado !== null && resultado !== "sem_dado";
  const comparavel =
    temValor &&
    limite !== null &&
    (resultado === "cumpriu" || resultado === "abaixo");
  const abaixo = resultado === "abaixo";
  const leis =
    baseLegal && urlBaseLegal ? [{ label: baseLegal, url: urlBaseLegal }] : [];
  const mensagem = descreverResultado(minimoSaude);
  const alerta = ALERTAS[resultado];

  return (
    <section
      aria-label="Mínimo constitucional da saúde"
      data-testid="saude-minimo-destaque"
      className="space-y-4"
    >
      <SectionHeader title="A Prefeitura aplica o mínimo exigido em saúde?" />
      <div className="space-y-3">
        <p className="eyebrow">Aplicado em saúde em {ano}</p>
        <p className="flex flex-wrap items-baseline gap-x-4">
          <span
            className={`stat-value-lg ${abaixo ? "text-warn-text" : "text-brand-text"}`}
          >
            {temValor ? fmtPercent(percentualAplicado) : "—"}
          </span>
          {limite !== null && (
            <span className="font-semibold text-sm">
              A lei exige pelo menos {formatarLimite(limite)}
            </span>
          )}
        </p>
        {comparavel && (
          <ThresholdMeter
            value={percentualAplicado}
            threshold={limite}
            tone={abaixo ? "warn" : "brand"}
            label="Aplicado em saúde"
            valueText={`${fmtPercent(percentualAplicado)} aplicado; mínimo de ${formatarLimite(limite)}${resultado === "cumpriu" ? "; cumpriu o mínimo" : ""}`}
          />
        )}
        {mensagem && alerta && (
          <AlertBox type={alerta.tipo} title={alerta.titulo}>
            {mensagem}
          </AlertBox>
        )}
        {mensagem && !alerta && <p className="caption">{mensagem}</p>}
        <p className="caption">
          Calculado pelo SIOPS (Ministério da Saúde) com dados enviados pela
          Prefeitura.
          {atual?.coletadoEm
            ? ` Última transmissão: ${fmtDate(atual.coletadoEm)}.`
            : ""}
        </p>
      </div>
      <LinhaLeiEFonte
        laws={leis}
        source={
          <LeiLink
            label={FONTES_OFICIAIS.siops.nome}
            url={FONTES_OFICIAIS.siops.url}
          />
        }
      />
      {atual && (
        <VerDetalhesLink
          onClick={() => setDetalhesAbertos(true)}
          context="mínimo da saúde"
          testId="saude-minimo-ver-detalhes"
        />
      )}
      {atual && (
        <ModalDialog
          isOpen={detalhesAbertos}
          onClose={() => setDetalhesAbertos(false)}
          title="Detalhes do mínimo da saúde"
          subtitle={`Exercício ${ano}`}
          maxWidth="2xl"
          showShareButton={false}
          footer={
            <LinhaLeiEFonte laws={leis} source={FONTES_OFICIAIS.siops.nome} />
          }
        >
          <div className="space-y-6">
            <dl className="space-y-3">
              <LinhaDetalhe
                rotulo="Receita de impostos e transferências (base do cálculo)"
                valor={valorOuTraco(
                  atual.receitaImpostosTransferenciasConstitucionais,
                  fmtCurrency,
                )}
              />
              <LinhaDetalhe
                rotulo="Despesa com recursos próprios em saúde"
                valor={valorOuTraco(atual.despesaRecursosProprios, fmtCurrency)}
              />
              <LinhaDetalhe
                rotulo="Despesa total com saúde"
                valor={valorOuTraco(atual.despesaTotalSaude, fmtCurrency)}
              />
              <LinhaDetalhe
                rotulo="Despesa com saúde por habitante"
                valor={valorOuTraco(
                  atual.despesaSaudePorHabitante,
                  fmtCurrency,
                )}
              />
            </dl>
            <p className="caption">
              Como o SIOPS conta a despesa: soma o que foi reservado (empenhado)
              e desconta os restos a pagar sem dinheiro em caixa para cobri-los.
              A lei manda contar o que foi entregue e pago no ano, mais os
              restos a pagar até o dinheiro disponível em caixa (
              {urlBaseLegal ? (
                <LeiLink
                  label="art. 24 da Lei Complementar 141/2012"
                  url={`${urlBaseLegal}#art24`}
                />
              ) : (
                "art. 24 da Lei Complementar 141/2012"
              )}
              ).
            </p>
            {serie.length > 0 && anoInicial !== null && anoFinal !== null && (
              <div className="space-y-2">
                <p className="eyebrow">
                  Anos fechados, {anoInicial}–{anoFinal}
                </p>
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th scope="col">Ano</th>
                      <th scope="col" className="numeric">
                        Aplicado em saúde
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serie.map((item) => (
                      <tr key={item.ano}>
                        <td>{item.ano}</td>
                        <td className="numeric">
                          {valorOuTraco(
                            item.percentualAplicadoSaude,
                            fmtPercent,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </ModalDialog>
      )}
    </section>
  );
}

function LinhaDetalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
      <dt>{rotulo}</dt>
      <dd className="font-semibold tabular-nums">{valor}</dd>
    </div>
  );
}
