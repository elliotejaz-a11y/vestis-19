/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Heading, Text } from 'npm:@react-email/components@0.0.22'
import { EmailLayout, OTPCode } from './base.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token: string
}

export const SignupEmail = ({ recipient, token }: SignupEmailProps) => (
  <EmailLayout preview="Your 8-digit Vestis verification code">
    <Heading style={heading}>Welcome to Vestis</Heading>
    <Text style={body}>
      Thanks for creating your account. Enter the code below to verify your
      email address and start building your digital wardrobe.
    </Text>
    <OTPCode code={token} />
    <Text style={note}>
      Verifying <strong>{recipient}</strong>. If you didn't sign up for Vestis,
      you can safely ignore this email.
    </Text>
  </EmailLayout>
)

export default SignupEmail

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
