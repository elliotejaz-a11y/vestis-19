/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, OTPCode } from './base.tsx'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout preview="Your Vestis identity verification code">
    <Heading style={heading}>Confirm your identity</Heading>
    <Text style={body}>
      To continue, enter this code to verify it's really you.
    </Text>
    <OTPCode code={token} />
    <Text style={note}>
      If you didn't request this, your account may be at risk — please
      change your password immediately.
    </Text>
  </EmailLayout>
)

export default ReauthenticationEmail

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
