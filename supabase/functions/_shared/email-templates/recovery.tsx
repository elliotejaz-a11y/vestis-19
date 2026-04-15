/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
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
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <p style={text}>Your Vestis password reset code is: {token}</p>
        <p style={text}>Enter this 8-digit code in the Vestis app to reset your password. This code will expire in 1 hour.</p>
        <p style={footer}>If you did not request a password reset you can safely ignore this email.</p>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const text = {
  fontSize: '14px',
  color: 'hsl(30, 8%, 50%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
