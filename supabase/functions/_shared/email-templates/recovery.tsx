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
    <Preview>Reset your password</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={text}>Your Vestis password reset code is:</Text>
        <Text style={code}>{token}</Text>
        <Text style={text}>
          Enter this 8-digit code in the Vestis app to reset your password.
        </Text>
        <Text style={text}>This code will expire in 1 hour.</Text>
        <Text style={footer}>
          If you did not request a password reset you can safely ignore this
          email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const text = {
  fontSize: '14px',
  color: '#333333',
  lineHeight: '1.5',
  margin: '0 0 16px',
}
const code = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#1a1a1a',
  letterSpacing: '4px',
  margin: '8px 0 24px',
  textAlign: 'center' as const,
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
