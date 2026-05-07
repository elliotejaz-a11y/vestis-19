/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CtaButton } from './base.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <EmailLayout preview="Confirm your Vestis email change">
    <Heading style={heading}>Confirm your new email</Heading>
    <Text style={body}>
      You requested to change your Vestis email address from{' '}
      <strong>{email}</strong> to <strong>{newEmail}</strong>.
    </Text>
    <Text style={body2}>
      Click below to confirm and complete the change.
    </Text>
    <CtaButton href={confirmationUrl} label="Confirm Email Change" />
    <Text style={note}>
      If you didn't request this change, please secure your account
      immediately by resetting your password.
    </Text>
  </EmailLayout>
)

export default EmailChangeEmail

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
  margin: '0 0 12px',
}
const body2 = {
  fontSize: '15px',
  color: '#4A3728',
  lineHeight: '1.65',
  margin: '0',
}
const note = {
  fontSize: '13px',
  color: '#A08878',
  lineHeight: '1.6',
  margin: '0',
}
