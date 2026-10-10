import type { CSSProperties, FC } from "react";
import { env } from "@/env";
import { getBrasaoDataUrl, resolveBrandDomain } from "@/lib/og-assets";

export interface MonitoredCity {
  slug: string;
  name: string;
  uf: string;
  brasaoAsset?: string;
}

export interface OGHomeCardTemplateProps {
  brandName?: string;
  brandDomain?: string;
  cities?: MonitoredCity[];
  title?: string;
  subtitle?: string;
}

export const OGHomeCardTemplate: FC<OGHomeCardTemplateProps> = ({
  brandName = env.NEXT_PUBLIC_SITE_NAME,
  brandDomain,
  cities = [],
  title = "Transparência Fiscal dos Municípios",
  subtitle = "Monitoramento cívico independente das contas públicas: receitas, despesas, folha salarial, licitações e detecção de anomalias contábeis.",
}) => {
  const finalBrandDomain = resolveBrandDomain(brandDomain);

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

  const platformBadgeStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    padding: "8px 18px",
    borderRadius: "9999px",
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
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

  const titleStyle: CSSProperties = {
    fontSize: "42px",
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: "-0.03em",
    lineHeight: 1.15,
    margin: 0,
    maxWidth: "1000px",
  };

  const subtitleStyle: CSSProperties = {
    fontSize: "18px",
    color: "#64748b",
    marginTop: "12px",
    marginBottom: "0px",
    lineHeight: 1.45,
    maxWidth: "960px",
  };

  const cardsRowStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: "18px",
    marginTop: "28px",
    width: "100%",
  };

  const cardStyle: CSSProperties = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "20px 22px",
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

  const hasCities = cities.length > 0;
  const displayedCities = cities.slice(0, 4);
  const extraCitiesCount = cities.length - displayedCities.length;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={brandBoxStyle}>
          {/* Logo Oficial MaisTransparencia */}
          <svg
            role="img"
            aria-label={brandName}
            width="40"
            height="40"
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

        <div style={platformBadgeStyle}>
          <div style={pulseDotStyle} />
          <span>Monitoramento Cívico Independente</span>
        </div>
      </div>

      {/* Body */}
      <div style={bodyStyle}>
        <h1 style={titleStyle}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>

        {/* 3 Value Pillars Cards */}
        <div style={cardsRowStyle}>
          {/* Card 1: Cidades com Brasões ou Fallback Neutro */}
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                  display: "flex",
                }}
              >
                Cidades Monitoradas
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                {hasCities ? (
                  <>
                    {displayedCities.map((city) => {
                      const dataUrl = getBrasaoDataUrl(city.brasaoAsset);
                      return (
                        <div
                          key={city.slug}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "44px",
                            height: "44px",
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "4px",
                          }}
                        >
                          {dataUrl ? (
                            /* biome-ignore lint/performance/noImgElement: og image asset */
                            <img
                              src={dataUrl}
                              alt={`Brasão de ${city.name}`}
                              width={34}
                              height={34}
                              style={{
                                width: "34px",
                                height: "34px",
                                objectFit: "contain",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#64748b",
                              }}
                            >
                              {city.uf}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {extraCitiesCount > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "44px",
                          height: "44px",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#64748b",
                        }}
                      >
                        +{extraCitiesCount}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "44px",
                      height: "44px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "4px",
                    }}
                  >
                    <svg
                      role="img"
                      aria-label="Municípios Integrados"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#5a72a8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                      <path d="M9 9h1" />
                      <path d="M9 13h1" />
                      <path d="M9 17h1" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#0f172a",
                display: "flex",
                marginTop: "4px",
              }}
            >
              {hasCities
                ? extraCitiesCount > 0
                  ? `${displayedCities.map((c) => c.name).join(" • ")} (+${extraCitiesCount})`
                  : displayedCities.map((c) => c.name).join(" • ")
                : "Municípios Integrados"}
            </div>
          </div>

          {/* Card 2: Radar Cívico */}
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#1d4ed8",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                  display: "flex",
                }}
              >
                Radar Cívico
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#0f172a",
                  letterSpacing: "-0.02em",
                  marginBottom: "6px",
                  display: "flex",
                }}
              >
                Detecção de Anomalias
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                display: "flex",
              }}
            >
              Alertas de Folha, Dispensas e Riscos LRF
            </div>
          </div>

          {/* Card 3: Dados Oficiais e Auditoria Cidadã */}
          <div style={cardStyle}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#059669",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "12px",
                  display: "flex",
                }}
              >
                Dados Oficiais
              </div>

              <div
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: "#059669",
                  letterSpacing: "-0.02em",
                  marginBottom: "6px",
                  display: "flex",
                }}
              >
                100% Auditável
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                display: "flex",
              }}
            >
              Informações Oficiais Direto das Prefeituras
            </div>
          </div>
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
            Plataforma Cívica Independente • Fiscalização e Transparência das
            Contas Públicas
          </span>
        </div>

        <div style={{ display: "flex", fontWeight: 600, color: "#5a72a8" }}>
          <span>{finalBrandDomain}</span>
        </div>
      </div>
    </div>
  );
};
