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
import type * as React from "react";

export interface NewsletterConfirmationEmailProps {
  municipioNome?: string;
  projectName?: string;
  portalSubtitle?: string;
  logoUrl?: string;
  confirmationUrl: string;
  unsubscribeUrl: string;
}

export function NewsletterConfirmationEmail({
  municipioNome = "Porciúncula",
  projectName,
  portalSubtitle,
  logoUrl,
  confirmationUrl,
  unsubscribeUrl,
}: NewsletterConfirmationEmailProps) {
  const resolvedProjectName =
    projectName || process.env.NEXT_PUBLIC_PROJECT_NAME || "MaisTransparência";

  const resolvedSubtitle =
    portalSubtitle ||
    `Portal de Transparência Cívica e Controle Social — ${municipioNome}`;

  const previewText = `Confirme sua inscrição no Boletim Cívico de ${municipioNome} — ${resolvedProjectName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
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
            <Heading style={headerTitle}>{resolvedProjectName}</Heading>
            <Text style={headerSubtitle}>{resolvedSubtitle}</Text>
          </Section>

          {/* Body Content */}
          <Section style={contentSection}>
            <Heading as="h2" style={contentHeading}>
              Confirme sua inscrição
            </Heading>
            <Text style={paragraphStyle}>Olá,</Text>
            <Text style={paragraphStyle}>
              Você solicitou o recebimento de resumos periódicos e alertas
              fiscais sobre as contas públicas e despesas do município de{" "}
              <strong>{municipioNome}</strong>.
            </Text>
            <Text style={paragraphStyle}>
              Para confirmar que este e-mail pertence a você e ativar seu
              recebimento de forma segura (Double Opt-in), clique no botão
              abaixo:
            </Text>

            <Section style={buttonContainer}>
              <Button style={buttonStyle} href={confirmationUrl}>
                Confirmar Inscrição Cívica
              </Button>
            </Section>

            <Text style={disclaimerText}>
              Se você não fez essa solicitação ou não reconhece este cadastro,
              pode ignorar esta mensagem ou{" "}
              <Link href={unsubscribeUrl} style={linkStyle}>
                cancelar imediatamente aqui
              </Link>
              .
            </Text>
          </Section>

          <Hr style={dividerStyle} />

          {/* Footer LGPD / RFC 8058 */}
          <Section style={footerSection}>
            <Text style={footerText}>
              🔒 <strong>Compromisso com a Privacidade (LGPD):</strong> Seus
              dados são protegidos e nunca serão comercializados ou
              compartilhados com terceiros. Apenas comunicações de interesse
              público fiscal e cívico serão enviadas.
            </Text>
            <Text style={footerText}>
              Deseja não receber mais e-mails?{" "}
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

export default NewsletterConfirmationEmail;

const mainStyle: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: "0 auto",
  padding: "40px 20px",
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
  borderRadius: "10px",
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
  fontSize: "13px",
  margin: "0",
};

const contentSection: React.CSSProperties = {
  padding: "32px 28px",
};

const contentHeading: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "18px",
  fontWeight: "600",
  marginTop: "0",
  marginBottom: "16px",
};

const paragraphStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 16px 0",
};

const buttonContainer: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#5a72a8",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "15px",
  fontWeight: "600",
  padding: "12px 28px",
  textDecoration: "none",
};

const disclaimerText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  marginTop: "20px",
};

const linkStyle: React.CSSProperties = {
  color: "#5a72a8",
  textDecoration: "underline",
};

const dividerStyle: React.CSSProperties = {
  borderColor: "#e2e8f0",
  margin: "0",
};

const footerSection: React.CSSProperties = {
  backgroundColor: "#f8fafc",
  padding: "20px 28px",
};

const footerText: React.CSSProperties = {
  color: "#64748b",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "0 0 8px 0",
};

const footerLink: React.CSSProperties = {
  color: "#64748b",
  textDecoration: "underline",
};
