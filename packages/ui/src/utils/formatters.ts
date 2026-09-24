export function fmtCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `R$ ${(value / 1_000_000_000).toFixed(1)}bi`;
  }
  if (abs >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1)}mil`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function fmtPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value))
    return "0,00%";
  return `${value.toFixed(2)}%`;
}

export function fmtNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function fmtDate(val: string | Date | null | undefined): string {
  if (!val) return "--/--/----";
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return "--/--/----";
    const dd = String(val.getUTCDate()).padStart(2, "0");
    const mm = String(val.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = val.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const dateStr = String(val).trim();
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
  }
  const parsed = new Date(dateStr);
  if (!Number.isNaN(parsed.getTime())) {
    const dd = String(parsed.getUTCDate()).padStart(2, "0");
    const mm = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = parsed.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}

export function fmtLicitacaoModalidade(
  modalidade: string | null | undefined,
): string {
  const MODALIDADE_LABELS: Record<string, string> = {
    pregao: "Pregão",
    pregao_eletronico: "Pregão Eletrônico",
    pregao_presencial: "Pregão Presencial",
    concorrencia: "Concorrência",
    concorrencia_eletronica: "Concorrência Eletrônica",
    concorrencia_presencial: "Concorrência Presencial",
    concurso: "Concurso",
    leilao: "Leilão",
    leilao_eletronico: "Leilão Eletrônico",
    leilao_presencial: "Leilão Presencial",
    dialogo_competitivo: "Diálogo Competitivo",
    dispensa: "Dispensa de Licitação",
    dispensa_eletronica: "Dispensa Eletrônica",
    dispensa_de_licitacao: "Dispensa de Licitação",
    inexigibilidade: "Inexigibilidade de Licitação",
    inexigibilidade_de_licitacao: "Inexigibilidade de Licitação",
    tomada_de_precos: "Tomada de Preços",
    tomada_precos: "Tomada de Preços",
    carta_convite: "Carta Convite",
    convite: "Convite",
    rdc: "Regime Diferenciado de Contratações (RDC)",
    regime_diferenciado_contratacoes:
      "Regime Diferenciado de Contratações (RDC)",
    adesao_ata: "Adesão a Ata",
    adesao_ata_registro_precos: "Adesão a Ata de Registro de Preços",
    adesao_ata_interna: "Adesão a Ata (Carona Interna)",
    adesao_ata_externa: "Adesão a Ata (Externa)",
    sem_licitacao: "Sem Licitação",
    gap_licitacao: "Sem Licitação",
    licitacao_propria: "Licitação Própria",
    outros: "Outros",
  };

  if (!modalidade?.trim()) return "Outros";
  const clean = modalidade.trim().toLowerCase();
  if (MODALIDADE_LABELS[clean]) {
    return MODALIDADE_LABELS[clean];
  }
  return clean
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function fmtLicitacaoSituacao(situacao?: string | null): string {
  if (!situacao) return "Em andamento";
  const s = situacao.toLowerCase().trim().replace(/_/g, " ");
  if (s === "aberta" || s === "em aberto") return "Aberta";
  if (s === "em andamento") return "Em andamento";
  if (s === "homologada" || s === "homologado") return "Homologada";
  if (s === "publicado" || s === "publicada") return "Publicada";
  if (s === "deserta") return "Deserta";
  if (s === "fracassada") return "Fracassada";
  if (s === "revogada" || s === "anulada") return "Cancelada";
  if (s === "encerrada" || s === "encerrado") return "Encerrada";
  if (s === "classificada") return "Classificada";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseReferenceDate(
  val: Date | string | null | undefined,
): Date | null {
  if (val === undefined) return new Date();
  if (val === null) return null;
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return null;
    if (
      val.getUTCHours() === 0 &&
      val.getUTCMinutes() === 0 &&
      val.getHours() !== 0
    ) {
      return new Date(
        val.getUTCFullYear(),
        val.getUTCMonth(),
        val.getUTCDate(),
      );
    }
    return val;
  }
  const str = String(val).trim();
  if (!str) return null;
  const isoPrefix = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) {
    const year = Number.parseInt(isoPrefix[1], 10);
    const month = Number.parseInt(isoPrefix[2], 10) - 1;
    const day = Number.parseInt(isoPrefix[3], 10);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPartialYearPeriod(
  referenceDate?: Date | string | null,
): string {
  const date = parseReferenceDate(referenceDate);
  if (!date) return "";

  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });

  const formatMonth = (idx: number) => {
    const raw = formatter.format(new Date(year, idx, 1)).replace(".", "");
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  };

  const jan = formatMonth(0);
  if (monthIndex === 0) return jan;

  const currentMonth = formatMonth(monthIndex);
  return `${jan}–${currentMonth}`;
}

export function fmtCpfCnpj(val: string | null | undefined): string {
  if (!val) return "";
  const trimmed = val.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5",
    );
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return trimmed;
}
