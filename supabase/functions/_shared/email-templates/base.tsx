/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://vestis-19-vrcl.vercel.app/vestis-logo.png'

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export const EmailLayout = ({ preview, children }: EmailLayoutProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </Head>
    <Preview>{preview}</Preview>
    <Body style={body}>
      <Container style={wrapper}>

        {/* Burgundy top accent bar */}
        <Section style={topBar} />

        {/* Logo header */}
        <Section style={header}>
          <Img
            src={LOGO_URL}
            width={160}
            height={56}
            alt="Vestis"
            style={logo}
          />
        </Section>

        {/* Content card */}
        <Section style={card}>
          {children}
        </Section>

        {/* Footer */}
        <Section style={footerSection}>
          <Hr style={footerDivider} />
          <Text style={footerText}>
            © 2026 Vestis · AI Wardrobe Stylist
          </Text>
          <Text style={footerText}>
            vestisapp.online
          </Text>
        </Section>

      </Container>
    </Body>
  </Html>
)

export const OTPCode = ({ code }: { code: string }) => (
  <Section style={codeWrapper}>
    <Text style={codeLabel}>Your verification code</Text>
    <Text style={codeText}>{code}</Text>
    <Text style={codeExpiry}>Expires in 1 hour — do not share this code</Text>
  </Section>
)

export const CtaButton = ({ href, label }: { href: string; label: string }) => (
  <Section style={{ textAlign: 'center' as const, margin: '32px 0' }}>
    <a href={href} style={ctaBtn}>
      {label}
    </a>
  </Section>
)

// ─── Styles ─────────────────────────────────────────────────────────────────

const body = {
  backgroundColor: '#F0E9DF',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  margin: '0',
  padding: '40px 16px',
}

const wrapper = {
  maxWidth: '540px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden' as const,
  boxShadow: '0 4px 32px rgba(26,4,7,0.12)',
}

const topBar = {
  backgroundColor: '#7B2432',
  height: '5px',
  display: 'block' as const,
}

const header = {
  backgroundColor: '#ffffff',
  padding: '32px 40px 24px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #F0E9DF',
}

const logo = {
  display: 'inline-block' as const,
}

const card = {
  padding: '40px 40px 32px',
}

const footerSection = {
  padding: '0 40px 32px',
}

const footerDivider = {
  borderColor: '#F0E9DF',
  margin: '0 0 20px',
}

const footerText = {
  fontSize: '12px',
  color: '#A08878',
  textAlign: 'center' as const,
  margin: '0 0 4px',
  lineHeight: '1.5',
}

const codeWrapper = {
  backgroundColor: '#FAF6F1',
  border: '1px solid #E8DDD5',
  borderRadius: '10px',
  padding: '28px 24px',
  margin: '28px 0',
  textAlign: 'center' as const,
}

const codeLabel = {
  fontSize: '11px',
  fontWeight: '600' as const,
  color: '#7B2432',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  margin: '0 0 14px',
}

const codeText = {
  fontFamily: "'Courier New', Courier, monospace",
  fontSize: '40px',
  fontWeight: '700' as const,
  color: '#1a0407',
  letterSpacing: '10px',
  margin: '0 0 14px',
  lineHeight: '1',
}

const codeExpiry = {
  fontSize: '12px',
  color: '#A08878',
  margin: '0',
}

const ctaBtn = {
  display: 'inline-block' as const,
  backgroundColor: '#7B2432',
  color: '#F8F1E7',
  fontFamily: "'Inter', sans-serif",
  fontSize: '14px',
  fontWeight: '600' as const,
  letterSpacing: '0.04em',
  padding: '14px 36px',
  borderRadius: '8px',
  textDecoration: 'none' as const,
}
