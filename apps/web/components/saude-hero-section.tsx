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
        <p className="eyebrow text-brand-text!">
          SAÚDE · EXERCÍCIO {ano}
          {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
        </p>
        <h1>Saúde em {ano}</h1>
        <p className="lead">
          Quanto a Prefeitura aplicou em saúde, de onde vem esse dinheiro e o
          que a população encontra: atendimento, leitos e remédios.
        </p>
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
        aria-label="Resumo da saúde"
        data-testid="saude-resumo-destaque"
        className="grid grid-cols-1 gap-8 md:grid-cols-2"
      >
        <SaudeMinimoDestaque minimoSaude={minimoSaude} />
        <SaudeDestaqueOrigem fontes={fontesReceita} ano={ano} />
        <SaudeDestaqueRede rede={redePorMilMoradores} />
        <SaudeDestaqueFarmacia farmacia={farmacia} portalSlug={portalSlug} />
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
