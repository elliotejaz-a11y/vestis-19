/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, CtaButton } from './base.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout preview="You've been invited to Vestis">
    <Heading style={heading}>You're invited to Vestis</Heading>
    <Text style={body}>
      Someone has invited you to join Vestis — the world's first free
      AI wardrobe stylist. Build your digital wardrobe, plan outfits,
      and discover your personal style.
    </Text>
    <CtaButton href={confirmationUrl} label="Accept Invitation" />
    <Text style={note}>
      If you weren't expecting this invitation, you can safely ignore
      this email.
    </Text>
  </EmailLayout>
)

export default InviteEmail

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
  margin: '0 0 4px',
}
const note = {
  fontSize: '13px',
  color: '#A08878',
  lineHeight: '1.6',
  margin: '0',
}
