import type { EducacaoFiscalizacaoResumoDTO } from "@transparencia/db";
import {
  fmtCompact,
  fmtPercent,
  SectionHeader,
  ThresholdMeter,
} from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { urlLegislacao } from "@/lib/constants/legislacao";

export interface EducacaoEmendasResumoProps {
  emendas: EducacaoFiscalizacaoResumoDTO["emendas"];
  /** Âncora da seção completa de emendas, em "Para fiscalizar". */
  hrefSecaoCompleta: string;
  /** Portal de transparência da Prefeitura (do banco); sem ele a fonte fica sem link. */
  portalUrl?: string | null;
}

const FONTE_EMENDAS = "portal de transparência da Prefeitura";

/** Resumo das emendas no topo: só o que o portal tem (autorizado, confirmada na receita, empenho). */
export function EducacaoEmendasResumo({
  emendas,
  hrefSecaoCompleta,
  portalUrl = null,
}: EducacaoEmendasResumoProps) {
  const linhas = [
    {
      chave: "autorizado",
      rotulo: "Autorizado em emendas",
      valor: emendas.totalAutorizado,
      percentual: 100,
      nota: undefined,
    },
    {
      chave: "confirmada",
      rotulo: "Confirmada na receita",
      valor: emendas.totalConfirmadaNaReceita,
      percentual: emendas.percentualConfirmadaNaReceita,
      nota: "do autorizado, pelo número da proposta",
    },
    {
      chave: "empenhado",
      rotulo: "Empenhado no cadastro",
      valor: emendas.totalEmpenhado,
      percentual: emendas.percentualEmpenhado,
      nota: "do autorizado, como informado pelo portal",
    },
  ];

  return (
    <section
      aria-label="Resumo das emendas na educação"
      className="space-y-5"
      data-testid="emendas-resumo-educacao"
    >
      <SectionHeader
        title="Quanto os deputados e senadores destinaram à educação?"
        description="Dinheiro que deputados e senadores destinam ao município. Sem registro da Prefeitura, o empenho aparece como zero."
        action={<a href={hrefSecaoCompleta}>Ver emendas</a>}
      />
      <dl className="space-y-5">
        {linhas.map((linha) => (
          <div key={linha.chave} className="space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="eyebrow">{linha.rotulo}</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3">
                <span className="stat-value-sm">{fmtCompact(linha.valor)}</span>
                {linha.nota && (
                  <span className="caption">
                    {fmtPercent(linha.percentual)} {linha.nota}
                  </span>
                )}
              </dd>
            </div>
            <ThresholdMeter
              value={linha.percentual}
              label={linha.rotulo}
              valueText={`${fmtCompact(linha.valor)}, ${fmtPercent(linha.percentual)} do autorizado`}
            />
          </div>
        ))}
      </dl>
      <LinhaLeiEFonte
        laws={[
          {
            label: "Constituição Federal, arts. 166 e 166-A",
            url: urlLegislacao("constituicao"),
          },
        ]}
        source={
          portalUrl ? (
            <LeiLink label={FONTE_EMENDAS} url={portalUrl} />
          ) : (
            FONTE_EMENDAS
          )
        }
      />
    </section>
  );
}
