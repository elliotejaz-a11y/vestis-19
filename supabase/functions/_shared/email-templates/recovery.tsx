/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, OTPCode } from './base.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token: string
}

export const RecoveryEmail = ({ token }: RecoveryEmailProps) => (
  <EmailLayout preview="Your Vestis password reset code">
    <Heading style={heading}>Reset your password</Heading>
    <Text style={body}>
      We received a request to reset your Vestis password. Enter the code
      below to continue. This code is valid for 1 hour.
    </Text>
    <OTPCode code={token} />
    <Text style={note}>
      If you didn't request a password reset, your account is still secure —
      you can safely ignore this email.
    </Text>
  </EmailLayout>
)

export default RecoveryEmail

const heading = {
  fontSize: '26px',
  fontWeight: '700' as const,
  color: '#1a0407',
  margin: '0 0 16px',
  lineHeight: '1.2',
}
const body = {
  fontSize: '15px',
  color: '#4A3728',
  lineHeight: '1.65',
  margin: '0',
}
const note = {
  fontSize: '13px',
  color: '#A08878',
  lineHeight: '1.6',
  margin: '8px 0 0',
}
