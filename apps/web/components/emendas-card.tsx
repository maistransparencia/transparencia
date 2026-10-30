import { cn, fmtCompact } from "@transparencia/ui";

export interface EmendasCardProps {
  totalEmendas: number;
  pctDoArrecadado: number;
  emendasPix: number;
  emendasIndividuais: number;
  emendasTotalEmpenhado: number;
  className?: string;
}

interface LinhaEmendaProps {
  rotulo: string;
  valor: number;
  percentual: number;
  corBarra: string;
}

function LinhaEmenda({
  rotulo,
  valor,
  percentual,
  corBarra,
}: LinhaEmendaProps) {
  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{rotulo}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{fmtCompact(valor)}</span>
          <span className="caption font-medium">
            ({percentual.toFixed(1).replace(".", ",")}% do total)
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden bg-track">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            corBarra,
          )}
          style={{ width: `${Math.min(100, Math.max(0, percentual))}%` }}
        />
      </div>
    </div>
  );
}

export function EmendasCard({
  totalEmendas,
  emendasPix,
  emendasIndividuais,
  emendasTotalEmpenhado,
  className,
}: EmendasCardProps) {
  const percentualPix =
    totalEmendas > 0 ? (emendasPix / totalEmendas) * 100 : 0;
  const percentualIndividuais =
    totalEmendas > 0 ? (emendasIndividuais / totalEmendas) * 100 : 0;

  return (
    <section
      className={cn(
        "grid grid-cols-1 items-start gap-6 border-line border-y py-6 lg:grid-cols-12 lg:gap-0",
        className,
      )}
    >
      <div className="space-y-3 lg:col-span-6 lg:pr-6">
        <p className="eyebrow">Recebido por emendas parlamentares</p>

        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="stat-value">{fmtCompact(totalEmendas)}</span>
          <span className="text-mute2 text-sm">/</span>
          <span className="font-semibold text-base text-mute2">
            {fmtCompact(emendasTotalEmpenhado)}
          </span>
          <span className="caption font-medium">empenhados</span>
        </div>

        <p className="text-mute text-xs leading-relaxed">
          Recurso extraordinário/político, separado dos repasses constitucionais
          automáticos (FPM, ICMS). Mostra quanto entrou por articulação
          parlamentar.
        </p>
      </div>

      <div className="divide-y divide-line lg:col-span-6 lg:border-line lg:border-l lg:pl-6">
        <LinhaEmenda
          rotulo="Emendas Individuais / de Bancada"
          valor={emendasIndividuais}
          percentual={percentualIndividuais}
          corBarra="bg-brand-fill"
        />
        <LinhaEmenda
          rotulo="Emendas PIX / Transf. Especiais"
          valor={emendasPix}
          percentual={percentualPix}
          corBarra="bg-ok-fill"
        />
      </div>
    </section>
  );
}
