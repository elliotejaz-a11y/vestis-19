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
  confirmationUrl: string
  token: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your password reset code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Use the
          code below to verify your identity and set a new password.
        </Text>
        <Container style={codeContainer}>
          <Text style={codeText}>{token || '00000000'}</Text>
        </Container>
        <Text style={text}>
          Enter this code in the app to continue. The code will expire shortly.
        </Text>
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
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
const codeContainer = {
  backgroundColor: '#f4f4f5',
  borderRadius: '16px',
  padding: '16px 24px',
  margin: '0 0 25px',
  textAlign: 'center' as const,
}
const codeText = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.3em',
  color: 'hsl(350, 55%, 31%)',
  fontFamily: 'monospace',
  margin: '0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
