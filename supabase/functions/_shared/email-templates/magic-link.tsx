/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CtaButton } from './base.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout preview="Your Vestis sign-in link">
    <Heading style={heading}>Sign in to Vestis</Heading>
    <Text style={body}>
      Click the button below to sign in to your account. This link is
      single-use and expires in 1 hour.
    </Text>
    <CtaButton href={confirmationUrl} label="Sign In to Vestis" />
    <Text style={note}>
      If you didn't request this link, your account remains secure — you can
      safely ignore this email.
    </Text>
  </EmailLayout>
)

export default MagicLinkEmail

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
  margin: '0',
}
