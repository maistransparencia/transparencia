import type { RadarCivicoAlertaDTO, TipoAnomalia } from "@transparencia/db";

export interface BuildAlertaUrlOptions {
  portalSlug?: string;
  entidade?: string;
}

export type AlertaUrlInput = Pick<RadarCivicoAlertaDTO, "tipoAnomalia"> &
  Partial<Pick<RadarCivicoAlertaDTO, "portalSlug" | "ano" | "licitacaoNumero">>;

interface AnomalyRouteConfig {
  path: string;
  anchor?: string;
  isLicitacaoItem?: boolean;
}

function getAnomalyRouteConfig(tipoAnomalia: TipoAnomalia): AnomalyRouteConfig {
  switch (tipoAnomalia) {
    case "pico_despesa_homologa":
      return { path: "/despesas" };
    case "opacidade_gastos_genericos":
      return { path: "/despesas", anchor: "#gastos-genericos" };
    case "explosao_comissionados":
      return { path: "/pessoal", anchor: "#comissionados" };
    case "inconsistencia_vinculo_pessoal":
      return { path: "/pessoal", anchor: "#regime" };
    case "rombo_caixa":
      return { path: "/receitas", anchor: "#saldo-caixa" };
    case "dependencia_transferencias":
      return { path: "/receitas" };
    case "inadimplencia_aporte_rpps":
      return { path: "/caprem", anchor: "#atuarial" };
    case "retencao_patronal_rpps":
      return { path: "/caprem", anchor: "#patronal" };
    case "desidratacao_patrimonio_rpps":
      return { path: "/caprem", anchor: "#patrimonio" };
    case "concentracao_dispensa":
      return { path: "/licitacoes" };
    case "desconto_nulo_pregao":
      return { path: "/licitacoes", anchor: "#itens", isLicitacaoItem: true };
    case "desagio_extremo_inexequibilidade":
      return { path: "/licitacoes", anchor: "#itens", isLicitacaoItem: true };
    default:
      return { path: "" };
  }
}

/**
 * Constrói a URL canônica para navegação de alertas fiscais do Radar Cívico.
 */
export function buildAlertaUrl(
  alerta: AlertaUrlInput,
  opts?: BuildAlertaUrlOptions,
): string {
  const config = getAnomalyRouteConfig(alerta.tipoAnomalia);
  const optSlug = opts?.portalSlug?.trim();
  const alertSlug = alerta.portalSlug?.trim();
  const cleanSlug = (optSlug || alertSlug || "").replace(/^\/+|\/+$/g, "");

  const basePath = (() => {
    if (cleanSlug) {
      if (config.path) {
        return `/${cleanSlug}${config.path}`;
      }
      return `/${cleanSlug}`;
    }
    return config.path || "/";
  })();

  const queryParams: string[] = [];

  if (
    alerta.ano !== undefined &&
    alerta.ano !== null &&
    Number.isInteger(alerta.ano) &&
    alerta.ano > 0
  ) {
    queryParams.push(`ano=${alerta.ano}`);
  }

  if (config.isLicitacaoItem) {
    const cleanNumero = alerta.licitacaoNumero?.trim();
    if (cleanNumero) {
      queryParams.push(`numero=${encodeURIComponent(cleanNumero)}`);
    }
  }

  const cleanEntidade = opts?.entidade?.trim();
  if (cleanEntidade) {
    queryParams.push(`entidade=${encodeURIComponent(cleanEntidade)}`);
  }

  const queryString = queryParams.length > 0 ? `?${queryParams.join("&")}` : "";
  const anchor = config.anchor ?? "";

  return `${basePath}${queryString}${anchor}`;
}
