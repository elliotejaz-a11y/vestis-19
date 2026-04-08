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
  token: string
}

export const RecoveryEmail = ({
  siteName,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your 8-digit password reset code for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Enter
          this 8-digit code in the app to continue.
        </Text>
        <Text style={codeLabel}>Your reset code</Text>
        <Text style={code}>{token}</Text>
        <Text style={footer}>
          This code can only be used once. If you didn&apos;t request a password
          reset, you can safely ignore this email.
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
const codeLabel = {
  fontSize: '12px',
  color: 'hsl(30, 8%, 50%)',
  margin: '0 0 8px',
}
const code = {
  fontSize: '32px',
  lineHeight: '1',
  letterSpacing: '0.35em',
  fontWeight: 'bold' as const,
  color: 'hsl(350, 55%, 31%)',
  margin: '0 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
