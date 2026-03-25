/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

const LOGO_URL = 'https://kvulebsvnmlxuhgtrney.supabase.co/storage/v1/object/public/email-assets/vestis-logo.png'

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Vestis verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="Vestis" height="36" style={logo} />
        <Heading style={h1}>Confirm reauthentication</Heading>
        <Text style={text}>Use the code below to confirm your identity:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          This code will expire shortly. If you didn't request this, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { padding: '40px 25px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#2b2723', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#8a827a', lineHeight: '1.6', margin: '0 0 25px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '22px', fontWeight: 'bold' as const, color: '#7a2332', margin: '0 0 30px' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
