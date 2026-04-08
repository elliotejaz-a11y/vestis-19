/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  token?: string
  confirmationUrl?: string
}

export const RecoveryEmail = ({
  siteName,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your password reset code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Enter
          the following 8-digit code in the app to set a new password:
        </Text>
        <Text style={codeBox}>{token || '--------'}</Text>
        <Text style={text}>
          This code will expire shortly. If you didn't request a password
          reset, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          Do not share this code with anyone.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(30, 10%, 15%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(30, 8%, 50%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeBox = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  fontFamily: 'monospace',
  letterSpacing: '6px',
  textAlign: 'center' as const,
  color: 'hsl(350, 55%, 31%)',
  backgroundColor: '#f5f5f5',
  borderRadius: '12px',
  padding: '16px 20px',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
