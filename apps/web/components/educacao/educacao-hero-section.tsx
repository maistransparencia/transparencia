export interface EducacaoHeroSectionProps {
  ano: number;
  isCurrentYear: boolean;
  partialPeriod: string;
}

export function EducacaoHeroSection({
  ano,
  isCurrentYear,
  partialPeriod,
}: EducacaoHeroSectionProps) {
  return (
    <div className="space-y-4">
      <p className="eyebrow text-brand-text!">
        EDUCAÇÃO · EXERCÍCIO {ano}
        {isCurrentYear && partialPeriod ? ` (PARCIAL, ${partialPeriod})` : ""}
      </p>

      <h1>
        Educação em {ano}: o mínimo exigido, o valor por aluno e se as crianças
        estão aprendendo.
      </h1>

      <p className="lead">
        Três respostas para começar. Abaixo, o detalhe de cada uma, na mesma
        ordem, e depois de onde vem o dinheiro, quem o recebe e como mudou ao
        longo dos anos.
      </p>
    </div>
  );
}
