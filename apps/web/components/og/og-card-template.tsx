import type { CSSProperties, FC } from "react";

export type MetricVariant = "default" | "warning" | "success" | "danger";

export interface OGMetricItem {
  label: string;
  value: string;
  detail?: string;
  variant?: MetricVariant;
}

export interface OGCardTemplateProps {
  portalDisplayName: string;
  portalUf?: string;
  pageTitle: string;
  subtitle?: string;
  badgeText?: string;
  metrics: OGMetricItem[];
  footerNote?: string;
  lastExtractionDate?: string;
  brandName?: string;
  brandDomain?: string;
}

function getVariantColor(variant?: MetricVariant): string {
  if (variant === "success") return "#059669";
  if (variant === "warning") return "#d97706";
  if (variant === "danger") return "#dc2626";
  return "#0f172a";
}

function formatExtractionDate(val?: string): string {
  if (!val) return "";
  const trimmed = val.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}/${brMatch[3]}`;
  }
  return trimmed;
}

function formatPortalSource(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Dados Abertos Extraídos";
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("prefeitura") ||
    lower.startsWith("câmara") ||
    lower.startsWith("camara")
  ) {
    return `Dados Abertos Extraídos da ${trimmed}`;
  }
  if (
    lower.startsWith("governo") ||
    lower.startsWith("município") ||
    lower.startsWith("municipio") ||
    lower.startsWith("portal")
  ) {
    return `Dados Abertos Extraídos do ${trimmed}`;
  }
  return `Dados Abertos Extraídos • ${trimmed}`;
}

function resolveBrandDomain(customDomain?: string): string {
  if (customDomain?.trim()) return customDomain.trim();
  const envDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN?.trim();
  if (envDomain) return envDomain;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envAppUrl) {
    try {
      const formatted = envAppUrl.startsWith("http")
        ? envAppUrl
        : `https://${envAppUrl}`;
      return new URL(formatted).host;
    } catch {
      return envAppUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    }
  }
  return "maistransparencia.com";
}

export const OGCardTemplate: FC<OGCardTemplateProps> = ({
  portalDisplayName,
  portalUf,
  pageTitle,
  subtitle,
  badgeText,
  metrics,
  footerNote,
  lastExtractionDate,
  brandName = process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "MaisTransparencia",
  brandDomain,
}) => {
  const finalBrandDomain = resolveBrandDomain(brandDomain);
  const formattedExtractionDate = formatExtractionDate(lastExtractionDate);
  const portalSourceText = formatPortalSource(portalDisplayName);

  const containerStyle: CSSProperties = {
    width: "1200px",
    height: "630px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "44px 52px",
    backgroundColor: "#f8fafc",
    backgroundImage:
      "linear-gradient(180deg, #ffffff 0%, #f8fafc 60%, #f1f5f9 100%)",
    color: "#0f172a",
    fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };

  const headerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  };

  const brandBoxStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
  };

  const brandTextStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    fontSize: "24px",
    fontWeight: 700,
    color: "#0f172a",
    letterSpacing: "-0.02em",
  };

  const municipalityBadgeStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "8px 18px",
    borderRadius: "9999px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#334155",
  };

  const pulseDotStyle: CSSProperties = {
    width: "8px",
    height: "8px",
    borderRadius: "9999px",
    backgroundColor: "#10b981",
  };

  const bodyStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    flex: 1,
    marginTop: "20px",
    marginBottom: "20px",
  };

  const titleRowStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "16px",
    marginBottom: "4px",
  };

  const titleStyle: CSSProperties = {
    fontSize: "40px",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.03em",
    margin: 0,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "18px",
    color: "#64748b",
    marginTop: "8px",
    marginBottom: "0px",
  };

  const metricsGridStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    marginTop: "28px",
    width: "100%",
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderTop: "1px solid #e2e8f0",
    paddingTop: "18px",
    fontSize: "14px",
    color: "#64748b",
  };

  const municipalityText = portalUf
    ? `${portalDisplayName} • ${portalUf}`
    : portalDisplayName;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={brandBoxStyle}>
          {/* Logo Oficial do Portal (svg/favicon.svg em alta definição) */}
          <svg
            role="img"
            aria-label={brandName}
            width="38"
            height="38"
            viewBox="0 0 120 120"
            fill="none"
          >
            <rect width="120" height="120" rx="30" fill="#5a72a8" />
            <g fill="#ffffff">
              <rect x="30" y="30" width="12" height="60" rx="4" />
              <rect x="30" y="42" width="30" height="12" rx="4" />
              <rect x="52" y="60" width="12" height="30" rx="4" />
              <rect x="74" y="48" width="12" height="42" rx="4" />
            </g>
          </svg>
          <div style={brandTextStyle}>
            <span>{brandName}</span>
          </div>
        </div>

        <div style={municipalityBadgeStyle}>
          <div style={pulseDotStyle} />
          <span>{municipalityText}</span>
        </div>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <div style={titleRowStyle}>
          <h1 style={titleStyle}>{pageTitle}</h1>
          {badgeText ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                fontSize: "13px",
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {badgeText}
            </div>
          ) : null}
        </div>

        {subtitle ? <p style={subtitleStyle}>{subtitle}</p> : null}

        {/* Metrics Cards */}
        <div style={metricsGridStyle}>
          {metrics.map((metric) => {
            const cardBg = "#ffffff";
            const valueColor = getVariantColor(metric.variant);

            return (
              <div
                key={metric.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: cardBg,
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "18px 22px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "8px",
                    display: "flex",
                  }}
                >
                  {metric.label}
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: 800,
                    color: valueColor,
                    letterSpacing: "-0.02em",
                    display: "flex",
                  }}
                >
                  {metric.value}
                </div>
                {metric.detail ? (
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      marginTop: "6px",
                      display: "flex",
                    }}
                  >
                    {metric.detail}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <svg
            role="img"
            aria-label="Dados Abertos Extraídos"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>
            {portalSourceText}
            {formattedExtractionDate
              ? ` • Extração em ${formattedExtractionDate}`
              : ""}
            {footerNote ? ` • ${footerNote}` : ""}
          </span>
        </div>

        <div style={{ display: "flex", fontWeight: 600, color: "#5a72a8" }}>
          <span>{finalBrandDomain}</span>
        </div>
      </div>
    </div>
  );
};
