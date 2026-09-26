import * as React from 'react';
import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface QuoteEmailProps {
  quoteNumber: string;
  clientName: string;
  contactName: string;
  amount: string;
  publicUrl: string;
}

export const QuoteEmail = ({
  quoteNumber = "FCG-2026",
  clientName = "Cliente",
  contactName = "Contacto",
  amount = "$ 0",
  publicUrl = "https://fusion.app/c/token"
}: QuoteEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Nueva cotización de Fusion Graphics: {quoteNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={logo}>FUSION.</Text>
          </Section>
          <Text style={heading}>Hola {contactName},</Text>
          <Text style={paragraph}>
            Hemos preparado la cotización <strong>{quoteNumber}</strong> para <strong>{clientName}</strong> por un valor total de <strong>{amount}</strong>.
          </Text>
          <Text style={paragraph}>
            Puedes revisar el detalle completo, descargar el PDF y aprobarla directamente en nuestro portal seguro haciendo clic en el siguiente botón:
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={publicUrl}>
              Ver y Aprobar Cotización
            </Button>
          </Section>
          <Text style={paragraph}>
            También hemos adjuntado una copia en PDF a este correo para tus archivos. Si tienes alguna duda, responde a este correo o contáctanos por WhatsApp.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            Fusion Graphics S.A.S. • Impresión & Empaques<br />
            Bogotá, Colombia • NIT: 900.123.456-7
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '0 48px',
  borderBottom: '1px solid #e6ebf1',
  marginBottom: '24px',
};

const logo = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#1e3a8a',
  letterSpacing: '-1px',
};

const heading = {
  fontSize: '20px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '0 48px',
};

const paragraph = {
  margin: '0 0 15px',
  fontSize: '15px',
  lineHeight: '1.4',
  color: '#3c4149',
  padding: '0 48px',
};

const buttonContainer = {
  padding: '24px 48px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#1e3a8a', // primary
  borderRadius: '4px',
  color: '#fff',
  fontSize: '15px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  width: '100%',
  padding: '14px 7px',
  fontWeight: 'bold',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  padding: '0 48px',
};

export default QuoteEmail;
