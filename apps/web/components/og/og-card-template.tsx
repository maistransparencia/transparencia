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
}

function getVariantColor(variant?: MetricVariant): string {
  if (variant === "success") return "#34d399";
  if (variant === "warning") return "#fbbf24";
  if (variant === "danger") return "#f87171";
  return "#38bdf8";
}

export const OGCardTemplate: FC<OGCardTemplateProps> = ({
  portalDisplayName,
  portalUf,
  pageTitle,
  subtitle,
  badgeText,
  metrics,
  footerNote,
}) => {
  const containerStyle: CSSProperties = {
    width: "1200px",
    height: "630px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "40px 48px",
    backgroundColor: "#090d16",
    backgroundImage:
      "radial-gradient(circle at 90% 10%, rgba(30, 41, 59, 0.7) 0%, #090d16 65%)",
    color: "#f8fafc",
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

  const logoCircleStyle: CSSProperties = {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "#10b981",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#090d16",
  };

  const brandTextStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    fontSize: "22px",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.02em",
  };

  const municipalityBadgeStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    padding: "8px 16px",
    borderRadius: "9999px",
    fontSize: "15px",
    fontWeight: 600,
    color: "#e2e8f0",
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
    marginTop: "16px",
    marginBottom: "16px",
  };

  const titleRowStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "14px",
    marginBottom: "4px",
  };

  const titleStyle: CSSProperties = {
    fontSize: "40px",
    fontWeight: 800,
    color: "#ffffff",
    letterSpacing: "-0.03em",
    margin: 0,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "18px",
    color: "#94a3b8",
    marginTop: "6px",
    marginBottom: "0px",
  };

  const metricsGridStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: "16px",
    marginTop: "24px",
    width: "100%",
  };

  const footerStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    paddingTop: "16px",
    fontSize: "14px",
    color: "#94a3b8",
  };

  const municipalityText = portalUf
    ? `${portalDisplayName} • ${portalUf}`
    : portalDisplayName;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={brandBoxStyle}>
          <div style={logoCircleStyle}>
            <svg
              role="img"
              aria-label="MaisTransparencia"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#090d16"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>MaisTransparencia</title>
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <div style={brandTextStyle}>
            <span>MaisTransparencia</span>
            <span style={{ color: "#10b981" }}>.com</span>
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
                backgroundColor: "rgba(251, 191, 36, 0.15)",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                color: "#fbbf24",
                fontSize: "13px",
                fontWeight: 700,
                padding: "4px 10px",
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
            const cardBg = "rgba(15, 23, 42, 0.85)";
            const valueColor = getVariantColor(metric.variant);

            return (
              <div
                key={metric.label}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: cardBg,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "14px",
                  padding: "16px 20px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "6px",
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
                      color: "#cbd5e1",
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
            aria-label="Auditoria Contábil"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Auditoria Contábil</title>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>Auditoria Contábil Automatizada (STN/MCASP)</span>
          {footerNote ? <span>• {footerNote}</span> : null}
        </div>

        <div style={{ display: "flex", fontWeight: 600, color: "#10b981" }}>
          <span>maistransparencia.com</span>
        </div>
      </div>
    </div>
  );
};
