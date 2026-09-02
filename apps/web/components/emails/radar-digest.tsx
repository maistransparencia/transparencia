import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { RadarDigestMetricsDTO } from "@transparencia/db";
import type * as React from "react";
import { env } from "@/env";

export interface RadarDigestEmailProps {
  portalSlug: string;
  municipioNome?: string;
  ano: number;
  projectName?: string;
  portalSubtitle?: string;
  logoUrl?: string;
  portalBaseUrl: string;
  unsubscribeUrl: string;
  metrics: RadarDigestMetricsDTO;
  dataEdicao?: string;
}

function formatCurrency(value?: number | null): string {
  const val = value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(val);
}

function formatPercent(value?: number | null): string {
  const val = value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(val / 100);
}

function getRiscoBadgeInfo(risco?: "normal" | "atencao" | "critico" | null) {
  if (risco === "critico") {
    return {
      bg: "#fef2f2",
      color: "#dc2626",
      border: "#fecaca",
      label: "Risco Crítico",
      descricao: "Mais de 20% das despesas em subitens genéricos (.99)",
    };
  }
  if (risco === "atencao") {
    return {
      bg: "#fffbeb",
      color: "#d97706",
      border: "#fde68a",
      label: "Risco Atenção",
      descricao: "Entre 10% e 20% das despesas em subitens genéricos (.99)",
    };
  }
  return {
    bg: "#f0fdf4",
    color: "#16a34a",
    border: "#bbf7d0",
    label: "Risco Normal",
    descricao: "Menos de 10% das despesas em subitens genéricos (.99)",
  };
}

function formatStatusExecucao(status: string): string {
  if (status === "em_execucao") return "Em execução";
  if (status === "concluido") return "Concluído";
  if (status === "inexecutado") return "Inexecutado";
  return status;
}

function formatCategoriaCredor(cat: string): string {
  if (cat === "combustivel_frota") return "Combustíveis e Frotas";
  if (cat === "locacao_maquinas_veiculos")
    return "Locação de Veículos / Máquinas";
  if (cat === "locacao_imoveis") return "Locação de Imóveis";
  if (cat === "eventos_festas") return "Eventos e Festividades";
  if (cat === "diarias_viagens") return "Diárias e Viagens";
  if (cat === "obras_infraestrutura") return "Obras e Infraestrutura";
  if (cat === "limpeza_residuos") return "Limpeza Urbana / Resíduos";
  if (cat === "plantoes_medicos") return "Plantões Médicos";
  if (cat === "terceirizacao_mao_obra") return "Terceirização de Mão de Obra";
  if (cat === "consorcios_publicos") return "Consórcios Públicos";
  if (cat === "consultoria_tecnica") return "Consultoria Técnica";
  if (cat === "bloqueios_sentencas") return "Bloqueios Judiciais / Sentenças";
  if (cat === "previdencia") return "Previdência / RPPS";
  if (cat === "sem_classificacao_especifica")
    return "Outros Subitens Residuais";
  return "Outros Subitens Residuais";
}

export function RadarDigestEmail({
  portalSlug,
  municipioNome = "Porciúncula",
  ano,
  projectName,
  portalSubtitle,
  logoUrl,
  portalBaseUrl,
  unsubscribeUrl,
  metrics,
  dataEdicao,
}: RadarDigestEmailProps) {
  const resolvedProjectName = projectName || env.NEXT_PUBLIC_PROJECT_NAME;

  const resolvedSubtitle =
    portalSubtitle || `Boletim Cívico Municipal • Exercício ${ano}`;

  const previewText = `🚨 Radar ${municipioNome}: Balanço fiscal, contratos e opacidade (${ano})`;

  const cleanBaseUrl = portalBaseUrl.replace(/\/+$/, "");
  const despesasUrl = `${cleanBaseUrl}/${portalSlug}/despesas?utm_source=radar_digest&utm_medium=email&utm_campaign=radar_municipal`;
  const licitacoesUrl = `${cleanBaseUrl}/${portalSlug}/licitacoes?utm_source=radar_digest&utm_medium=email&utm_campaign=radar_municipal`;

  const riscoInfo = getRiscoBadgeInfo(metrics.opacidade?.classificacaoRisco);

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header Institucional */}
          <Section style={headerSection}>
            {logoUrl && (
              <Img
                src={logoUrl}
                alt={resolvedProjectName}
                width="48"
                height="48"
                style={headerLogo}
              />
            )}
            <Heading style={headerTitle}>Radar {municipioNome}</Heading>
            <Text style={headerSubtitle}>{resolvedSubtitle}</Text>
            {dataEdicao && (
              <Text style={headerEditionBadge}>Publicado em {dataEdicao}</Text>
            )}
          </Section>

          {/* Intro Text */}
          <Section style={introSection}>
            <Text style={paragraphStyle}>
              Olá, cidadão e cidadã de <strong>{municipioNome}</strong>!
            </Text>
            <Text style={paragraphStyle}>
              Confira os destaques mais recentes das contas públicas, balanço
              orçamentário, índice de opacidade fiscal e principais contratos
              processados pelo nosso pipeline cívico automatizado.
            </Text>
          </Section>

          {/* Card: Balanço Fiscal */}
          <Section style={cardSection}>
            <Heading as="h3" style={cardHeading}>
              📊 Balanço Fiscal & Execução ({ano})
            </Heading>
            {metrics.posicaoFiscal ? (
              <table style={metricsTableStyle}>
                <tbody>
                  <tr>
                    <td style={metricLabelCell}>Receitas Arrecadadas:</td>
                    <td style={metricValueCellGreen}>
                      {formatCurrency(metrics.posicaoFiscal.totalArrecadado)}
                    </td>
                  </tr>
                  <tr>
                    <td style={metricLabelCell}>Despesas Pagas:</td>
                    <td style={metricValueCellRed}>
                      {formatCurrency(metrics.posicaoFiscal.despesasPagas)}
                    </td>
                  </tr>
                  <tr>
                    <td style={metricLabelCell}>Restos a Pagar Pagos:</td>
                    <td style={metricValueCell}>
                      {formatCurrency(metrics.posicaoFiscal.restosPagosNoAno)}
                    </td>
                  </tr>
                  <tr>
                    <td style={metricLabelCellBold}>
                      {(metrics.posicaoFiscal.saldoEstimado ?? 0) < 0
                        ? "Déficit Estimado em Caixa:"
                        : "Saldo Estimado em Caixa:"}
                    </td>
                    <td
                      style={
                        (metrics.posicaoFiscal.saldoEstimado ?? 0) < 0
                          ? metricValueCellRedBold
                          : metricValueCellBold
                      }
                    >
                      {formatCurrency(metrics.posicaoFiscal.saldoEstimado)}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <Text style={emptyText}>
                Dados de posição fiscal em consolidação para este exercício.
              </Text>
            )}
          </Section>

          {/* Card: Termômetro de Opacidade Fiscal */}
          <Section style={cardSection}>
            <Heading as="h3" style={cardHeading}>
              🔍 Termômetro de Opacidade Orçamentária
            </Heading>
            {metrics.opacidade ? (
              <>
                <Section
                  style={{
                    ...riskBadgeContainer,
                    backgroundColor: riscoInfo.bg,
                    borderColor: riscoInfo.border,
                  }}
                >
                  <Text style={{ ...riskBadgeText, color: riscoInfo.color }}>
                    {riscoInfo.label} —{" "}
                    <strong>
                      {formatPercent(metrics.opacidade.taxaValorOpacidadePct)}
                    </strong>
                  </Text>
                  <Text style={riskBadgeSubtext}>{riscoInfo.descricao}</Text>
                </Section>

                <Text style={annotationText}>
                  Gastos em subitens residuais (.99):{" "}
                  <strong>
                    {formatCurrency(metrics.opacidade.pagoResidual99)}
                  </strong>
                  . Desvios sensíveis que requerem acompanhamento:{" "}
                  <strong>
                    {formatCurrency(metrics.opacidade.pagoDesvioSensivel99)}
                  </strong>
                  .
                </Text>

                {metrics.destaquesCredoresOpacidade.length > 0 && (
                  <Section style={{ marginTop: "12px" }}>
                    <Text style={subheadingText}>
                      Credores com maior volume em subitens residuais:
                    </Text>
                    <table style={dataTableStyle}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Credor</th>
                          <th style={thStyle}>Categoria Predominante</th>
                          <th style={thStyleRight}>Total Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.destaquesCredoresOpacidade.map((credor) => (
                          <tr
                            key={`${credor.credorNome}-${credor.categoriaPredominante}-${credor.totalPago}`}
                          >
                            <td style={tdStyle}>{credor.credorNome}</td>
                            <td style={tdStyleMuted}>
                              {formatCategoriaCredor(
                                credor.categoriaPredominante,
                              )}
                            </td>
                            <td style={tdStyleRight}>
                              {formatCurrency(credor.totalPago)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Section>
                )}
              </>
            ) : (
              <Text style={emptyText}>
                Dados de opacidade contábil não disponíveis para este exercício.
              </Text>
            )}
          </Section>

          {/* Card: Principais Contratos & Fornecedores */}
          <Section style={cardSection}>
            <Heading as="h3" style={cardHeading}>
              📑 Principais Contratos & Fornecedores
            </Heading>
            {metrics.destaquesContratos.length > 0 ? (
              <table style={dataTableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Fornecedor / Objeto</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyleRight}>Total Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.destaquesContratos.map((contrato) => (
                    <tr
                      key={`${contrato.fornecedorNome}-${contrato.objetoDescricao}-${contrato.totalPago}`}
                    >
                      <td style={tdStyle}>
                        <strong>{contrato.fornecedorNome}</strong>
                        <div style={objectDescriptionText}>
                          {contrato.objetoDescricao}
                        </div>
                      </td>
                      <td style={tdStyleMuted}>
                        {formatStatusExecucao(contrato.statusExecucao)}
                      </td>
                      <td style={tdStyleRight}>
                        {formatCurrency(contrato.totalPago)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <Text style={emptyText}>
                Nenhum contrato de serviço registrado para este exercício.
              </Text>
            )}
          </Section>

          {/* Chamadas de Ação (CTAs) */}
          <Section style={ctaSection}>
            <Text style={ctaTitle}>
              Explore todos os dados abertos no portal:
            </Text>
            <div style={buttonRowStyle}>
              <Button style={buttonPrimaryStyle} href={despesasUrl}>
                Ver Painel de Despesas
              </Button>
              <span style={{ display: "inline-block", width: "12px" }} />
              <Button style={buttonSecondaryStyle} href={licitacoesUrl}>
                Ver Contratos e Licitações
              </Button>
            </div>
          </Section>

          <Hr style={dividerStyle} />

          {/* Rodapé Normativo LGPD & RFC 8058 */}
          <Section style={footerSection}>
            <Text style={footerText}>
              🔒 <strong>Compromisso com a Privacidade (LGPD):</strong> Você
              está recebendo este boletim porque confirmou sua inscrição no
              Radar Cívico de {municipioNome}. Seus dados nunca serão
              compartilhados ou comercializados.
            </Text>
            <Text style={footerText}>
              Deseja parar de receber este boletim?{" "}
              <Link href={unsubscribeUrl} style={footerLink}>
                Descadastrar com 1 clique
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default RadarDigestEmail;

const mainStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: "0 auto",
  padding: "40px 16px",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "600px",
  overflow: "hidden",
};

const headerSection: React.CSSProperties = {
  backgroundColor: "#5a72a8",
  padding: "28px 24px",
  textAlign: "center",
};

const headerLogo: React.CSSProperties = {
  borderRadius: "8px",
  display: "block",
  margin: "0 auto 12px auto",
};

const headerTitle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 6px 0",
};

const headerSubtitle: React.CSSProperties = {
  color: "#e2e8f0",
  fontSize: "14px",
  margin: "0",
};

const headerEditionBadge: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "12px",
  marginTop: "6px",
  marginBottom: "0",
};

const introSection: React.CSSProperties = {
  padding: "24px 24px 12px 24px",
};

const paragraphStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 12px 0",
};

const cardSection: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "6px",
  margin: "12px 24px",
  padding: "16px 20px",
};

const cardHeading: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "15px",
  fontWeight: "600",
  marginTop: "0",
  marginBottom: "12px",
};

const metricsTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const metricLabelCell: React.CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  padding: "4px 0",
};

const metricLabelCellBold: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "13px",
  fontWeight: "600",
  padding: "6px 0 2px 0",
};

const metricValueCell: React.CSSProperties = {
  color: "#334155",
  fontSize: "13px",
  fontWeight: "500",
  textAlign: "right",
  padding: "4px 0",
};

const metricValueCellGreen: React.CSSProperties = {
  color: "#16a34a",
  fontSize: "13px",
  fontWeight: "600",
  textAlign: "right",
  padding: "4px 0",
};

const metricValueCellRed: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "13px",
  fontWeight: "600",
  textAlign: "right",
  padding: "4px 0",
};

const metricValueCellBold: React.CSSProperties = {
  color: "#0f172a",
  fontSize: "14px",
  fontWeight: "700",
  textAlign: "right",
  padding: "6px 0 2px 0",
};

const metricValueCellRedBold: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "700",
  textAlign: "right",
  padding: "6px 0 2px 0",
};

const riskBadgeContainer: React.CSSProperties = {
  border: "1px solid",
  borderRadius: "6px",
  padding: "10px 14px",
  marginBottom: "10px",
};

const riskBadgeText: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px 0",
};

const riskBadgeSubtext: React.CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  margin: "0",
};

const annotationText: React.CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "8px 0 0 0",
};

const subheadingText: React.CSSProperties = {
  color: "#334155",
  fontSize: "12px",
  fontWeight: "600",
  margin: "10px 0 6px 0",
};

const dataTableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "12px",
};

const thStyle: React.CSSProperties = {
  borderBottom: "1px solid #cbd5e1",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "600",
  textAlign: "left",
  padding: "6px 4px",
};

const thStyleRight: React.CSSProperties = {
  borderBottom: "1px solid #cbd5e1",
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "600",
  textAlign: "right",
  padding: "6px 4px",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  color: "#1e293b",
  padding: "8px 4px",
};

const tdStyleMuted: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  color: "#64748b",
  padding: "8px 4px",
};

const tdStyleRight: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontWeight: "500",
  textAlign: "right",
  padding: "8px 4px",
};

const objectDescriptionText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  marginTop: "2px",
};

const emptyText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "13px",
  fontStyle: "italic",
  margin: "0",
};

const ctaSection: React.CSSProperties = {
  padding: "16px 24px 24px 24px",
  textAlign: "center",
};

const ctaTitle: React.CSSProperties = {
  color: "#334155",
  fontSize: "13px",
  fontWeight: "500",
  marginBottom: "12px",
};

const buttonRowStyle: React.CSSProperties = {
  textAlign: "center",
};

const buttonPrimaryStyle: React.CSSProperties = {
  backgroundColor: "#5a72a8",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "13px",
  fontWeight: "600",
  padding: "10px 18px",
  textDecoration: "none",
};

const buttonSecondaryStyle: React.CSSProperties = {
  backgroundColor: "#f1f5f9",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  color: "#334155",
  display: "inline-block",
  fontSize: "13px",
  fontWeight: "600",
  padding: "9px 18px",
  textDecoration: "none",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "0",
};

const footerSection: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  padding: "20px 24px",
};

const footerText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px 0",
};

const footerLink: React.CSSProperties = {
  color: "#5a72a8",
  textDecoration: "underline",
};
