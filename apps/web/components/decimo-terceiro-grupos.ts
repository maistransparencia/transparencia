import type { DecimoTerceiroGrupoCodigo } from "@transparencia/db";

/** Rótulo ao cidadão de cada grupo do 13º; o código fica em `@transparencia/db`. */
export const ROTULO_GRUPO_DECIMO_TERCEIRO: Record<
  DecimoTerceiroGrupoCodigo,
  string
> = {
  ativos: "Servidores ativos",
  inativos_pensionistas: "Aposentados e pensionistas",
};
