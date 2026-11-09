import type {
  FontesReceitaSaudeDTO,
  SaudeFarmaciaResumoDTO,
  SaudeMinimoConstitucionalDTO,
  SaudeRedePorMilMoradoresDTO,
} from "@transparencia/db";
import { fmtDate } from "@transparencia/ui";
import { LeiLink, LinhaLeiEFonte } from "@/components/lei-e-fonte";
import { FONTES_OFICIAIS } from "@/lib/constants/fontes-oficiais";
import {
  SaudeDestaqueFarmacia,
  SaudeDestaqueOrigem,
  SaudeDestaqueRede,
} from "./saude/saude-destaques";
import { SaudeMemoriaCalculo } from "./saude/saude-memoria-calculo";
import { SaudeMinimoDestaque } from "./saude/saude-minimo-destaque";

export interface SaudeHeroOrcamentoProps {
  dotacao: number;
  empenhado: number;
  liquidado: number;
  pago: number;
  taxaExecucao: number;
}

export interface SaudeHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
  portalSlug: string;
  orcamento: SaudeHeroOrcamentoProps;
  minimoSaude: SaudeMinimoConstitucionalDTO;
  fontesReceita: FontesReceitaSaudeDTO;
  redePorMilMoradores: SaudeRedePorMilMoradoresDTO | null;
  farmacia: SaudeFarmaciaResumoDTO;
  /** Portal de transparência da Prefeitura (do banco); sem ele a fonte fica sem link. */
  portalUrl: string | null;
  /** Data (AAAA-MM-DD) da coleta no portal da Prefeitura. */
  dataColeta: string | null;
  /** Resumo de "Para fiscalizar", calculado em `@transparencia/db`. */
  resumoFiscalizacao: string[];
}

/** Topo: o mínimo exigido, de onde vem o dinheiro e o que a população encontra (atendimento, leitos e remédios). */
export function SaudeHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
  portalSlug,
  orcamento,
  minimoSaude,
  fontesReceita,
  redePorMilMoradores,
  farmacia,
  portalUrl,
  dataColeta,
  resumoFiscalizacao,
}: SaudeHeroSectionProps) {
  const { baseLegal, urlBaseLegal } = minimoSaude.minimo;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h1>Saúde: quanto a Prefeitura aplica e o que a população encontra</h1>
        {isCurrentYear && (
          <p
            role="note"
            className="caption border-brand-fill border-l-[3px] pl-3"
          >
            <strong className="font-semibold text-ink">
              Ano em andamento:
            </strong>{" "}
            os números são parciais e não dá para compará-los com anos já
            fechados.
          </p>
        )}
      </div>

      <section
        aria-label={`Resumo da saúde em ${ano}`}
        data-testid="saude-resumo-destaque"
        className="space-y-4"
      >
        <p className="eyebrow">
          Dados de {ano}
          {isCurrentYear && partialPeriod ? ` (parcial, ${partialPeriod})` : ""}
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <SaudeMinimoDestaque
            minimoSaude={minimoSaude}
            isCurrentYear={isCurrentYear}
          />
          <SaudeDestaqueOrigem
            fontes={fontesReceita}
            ano={ano}
            isCurrentYear={isCurrentYear}
          />
        </div>
      </section>

      <section
        aria-label="Retrato da saúde hoje"
        data-testid="saude-retrato-hoje"
        className="space-y-4"
      >
        <p className="eyebrow">
          Hoje, não muda com o ano escolhido
          {dataColeta ? ` · coletado em ${fmtDate(dataColeta)}` : ""}
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <SaudeDestaqueRede rede={redePorMilMoradores} />
          <SaudeDestaqueFarmacia farmacia={farmacia} portalSlug={portalSlug} />
        </div>
      </section>

      <LinhaLeiEFonte
        laws={
          baseLegal && urlBaseLegal
            ? [{ label: baseLegal, url: urlBaseLegal }]
            : []
        }
        source={
          <>
            <LeiLink
              label={FONTES_OFICIAIS.siops.nome}
              url={FONTES_OFICIAIS.siops.url}
            />
            {" · "}
            <LeiLink
              label={FONTES_OFICIAIS.dadosAbertosSaude.nome}
              url={FONTES_OFICIAIS.dadosAbertosSaude.url}
            />
          </>
        }
        extra={dataColeta ? `Coletado em ${fmtDate(dataColeta)}` : undefined}
      />

      <SaudeMemoriaCalculo
        ano={ano}
        isCurrentYear={isCurrentYear}
        orcamento={orcamento}
        portalUrl={portalUrl}
      />

      <p className="caption" data-testid="saude-resumo-fiscalizar">
        <strong className="font-semibold text-ink">Para fiscalizar:</strong>{" "}
        {resumoFiscalizacao.join(" · ")}{" "}
        <a href="#para-fiscalizar" className="font-semibold">
          Ver seção
        </a>
      </p>
    </div>
  );
}
