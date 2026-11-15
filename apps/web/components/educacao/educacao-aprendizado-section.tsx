import type { EtapaEnsino } from "@transparencia/db";
import { SectionHeader } from "@transparencia/ui";
import type { EducacaoViewModel } from "@/app/[portalSlug]/educacao/view-model";
import { tituloDaSerie } from "@/lib/escopo-bloco";
import { EducacaoHistoricoSection } from "./educacao-historico-section";

export interface EducacaoAprendizadoSectionProps {
  aprendizado: EducacaoViewModel["aprendizado"];
  historico: EducacaoViewModel["historico"];
  initialEtapa: EtapaEnsino;
}

export function EducacaoAprendizadoSection({
  aprendizado,
  historico,
  initialEtapa,
}: EducacaoAprendizadoSectionProps) {
  return (
    <section
      id="aprendizado"
      aria-label="Aprendizado dos alunos"
      className="space-y-6"
    >
      <SectionHeader
        title={tituloDaSerie(
          "Aprendizado dos alunos",
          [
            ...historico.anosIniciais.pontos,
            ...historico.anosFinais.pontos,
          ].map((ponto) => ponto.ano),
        )}
        description="Nota do IDEB, de 0 a 10, medida a cada dois anos. Junta o que os alunos aprendem nas provas com quantos são aprovados."
      />
      <EducacaoHistoricoSection
        historico={historico}
        aprendizado={aprendizado}
        initialEtapa={initialEtapa}
      />
    </section>
  );
}
