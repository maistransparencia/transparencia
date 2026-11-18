import type {
  DecimoTerceiroExecucaoMetricsDTO,
  DecimoTerceiroGrupoDTO,
} from "@transparencia/db";
import {
  Badge,
  fmtCompact,
  fmtCurrency,
  SectionHeader,
} from "@transparencia/ui";
import { ChevronDown } from "lucide-react";
import { ROTULO_GRUPO_DECIMO_TERCEIRO } from "./decimo-terceiro-grupos";

interface DecimoTerceiroCardProps {
  decimo13: DecimoTerceiroExecucaoMetricsDTO;
}

/** Barra visível mesmo quando o valor é minúsculo perto da escala. */
const LARGURA_MINIMA_BARRA = 2;

const nomeDoMes = (mes: number) =>
  new Date(2000, mes - 1, 1).toLocaleDateString("pt-BR", { month: "long" });

interface LinhaBarraProps {
  rotulo: string;
  valor: number;
  escala: number;
  tom: "atual" | "anterior";
}

function LinhaBarra({ rotulo, valor, escala, tom }: LinhaBarraProps) {
  const largura =
    valor > 0 && escala > 0
      ? Math.max(LARGURA_MINIMA_BARRA, (valor / escala) * 100)
      : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="eyebrow">{rotulo}</dt>
        <dd className="text-ink text-sm font-semibold tabular-nums">
          <span title={fmtCurrency(valor)}>{fmtCompact(valor)}</span>
        </dd>
      </div>
      <div className="bg-track mt-1 h-3 w-full overflow-hidden" aria-hidden>
        <div
          className={
            tom === "atual" ? "bg-brand-fill h-full" : "bg-mute2 h-full"
          }
          style={{ width: `${largura}%` }}
        />
      </div>
    </div>
  );
}

interface GrupoPainelProps {
  grupo: DecimoTerceiroGrupoDTO;
  ano: number;
  anoAnterior: number | null;
  mesNome: string | null;
}

function GrupoPainel({ grupo, ano, anoAnterior, mesNome }: GrupoPainelProps) {
  const { pago, pagoAnoAnterior, pagoAnoAnteriorAteMesmoMes } = grupo;
  const escala = Math.max(pago, pagoAnoAnteriorAteMesmoMes ?? 0);
  const temRegua = anoAnterior !== null && pagoAnoAnteriorAteMesmoMes !== null;
  const semPagamentoNosDoisPeriodos = pago === 0 && !pagoAnoAnteriorAteMesmoMes;

  return (
    <div
      className={`panel panel-top space-y-3 ${grupo.abaixoDoMesmoPeriodo ? "panel-warn" : ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3>{ROTULO_GRUPO_DECIMO_TERCEIRO[grupo.grupo]}</h3>
        {grupo.abaixoDoMesmoPeriodo ? (
          <Badge variant="warning">
            Abaixo de {anoAnterior} no mesmo período
          </Badge>
        ) : null}
      </div>

      {semPagamentoNosDoisPeriodos ? (
        <p className="text-sm">
          Nenhum pagamento registrado{mesNome ? ` até ${mesNome}` : ""} em {ano}
          {temRegua ? ` nem em ${anoAnterior}` : ""}.
          {temRegua && pagoAnoAnterior ? (
            <>
              {" "}
              Em {anoAnterior}, os{" "}
              <span title={fmtCurrency(pagoAnoAnterior)}>
                {fmtCompact(pagoAnoAnterior)}
              </span>{" "}
              foram pagos depois disso.
            </>
          ) : null}
        </p>
      ) : (
        <dl className="space-y-3">
          <LinhaBarra
            rotulo={`${ano}${mesNome ? ` (até ${mesNome})` : ""}`}
            valor={pago}
            escala={escala}
            tom="atual"
          />
          {temRegua ? (
            <LinhaBarra
              rotulo={`${anoAnterior} (até ${mesNome})`}
              valor={pagoAnoAnteriorAteMesmoMes}
              escala={escala}
              tom="anterior"
            />
          ) : null}
        </dl>
      )}

      {pagoAnoAnterior !== null && !semPagamentoNosDoisPeriodos ? (
        <p className="caption">
          Em {anoAnterior} inteiro, foram pagos{" "}
          <span title={fmtCurrency(pagoAnoAnterior)}>
            {fmtCompact(pagoAnoAnterior)}
          </span>
          .
        </p>
      ) : null}
    </div>
  );
}

export function DecimoTerceiroCard({ decimo13 }: DecimoTerceiroCardProps) {
  const {
    ano,
    anoAnterior,
    mesReferencia,
    pago,
    pagoAnoAnterior,
    pagoAnoAnteriorAteMesmoMes,
    grupos,
  } = decimo13;
  const mesNome = mesReferencia !== null ? nomeDoMes(mesReferencia) : null;

  return (
    <section id="decimo-terceiro" className="scroll-mt-20 space-y-6">
      <SectionHeader
        title={`A Prefeitura já pagou o 13º salário de ${ano}?`}
        description="Valores pagos a aposentados, pensionistas e servidores ativos, na comparação com o mesmo período do ano anterior."
      />

      <div className="panel">
        <dl>
          <dt className="eyebrow mb-1">Total pago em {ano}</dt>
          <dd className="stat-value" title={fmtCurrency(pago)}>
            {fmtCompact(pago)}
          </dd>
          {anoAnterior !== null &&
          pagoAnoAnteriorAteMesmoMes !== null &&
          mesNome ? (
            <dd className="caption mt-1">
              {pagoAnoAnteriorAteMesmoMes === 0 && pagoAnoAnterior ? (
                <>
                  Em {anoAnterior}, nada tinha sido pago até {mesNome}: os{" "}
                  <span title={fmtCurrency(pagoAnoAnterior)}>
                    {fmtCompact(pagoAnoAnterior)}
                  </span>{" "}
                  foram pagos depois.
                </>
              ) : (
                <>
                  Até {mesNome} de {anoAnterior}, foram pagos{" "}
                  <span title={fmtCurrency(pagoAnoAnteriorAteMesmoMes)}>
                    {fmtCompact(pagoAnoAnteriorAteMesmoMes)}
                  </span>
                  .
                </>
              )}
            </dd>
          ) : null}
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {grupos.map((grupo) => (
          <GrupoPainel
            key={grupo.grupo}
            grupo={grupo}
            ano={ano}
            anoAnterior={anoAnterior}
            mesNome={mesNome}
          />
        ))}
      </div>

      <details className="group">
        <summary className="text-mute2 hover:text-ink flex min-h-11 cursor-pointer items-center gap-1 text-xs font-medium select-none">
          Ver detalhes
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="caption mt-2 space-y-2">
          <p>
            Os valores são contados pelo mês em que a Prefeitura reservou o
            dinheiro (o empenho), que serve de aproximação para o mês do
            pagamento. A comparação vai até o último mês com despesa registrada
            em {ano}.
          </p>
          <p>
            A divisão em grupos vem do tipo de despesa registrado, não do cargo
            da pessoa. Só vale o que a Prefeitura publicou: não aparecer
            pagamento aqui não quer dizer que ele não tenha sido feito.
          </p>
        </div>
      </details>
    </section>
  );
}
