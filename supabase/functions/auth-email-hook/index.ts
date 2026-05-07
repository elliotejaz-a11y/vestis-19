import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { SignupEmail } from '../_shared/email-templates/signup.tsx'
import { InviteEmail } from '../_shared/email-templates/invite.tsx'
import { MagicLinkEmail } from '../_shared/email-templates/magic-link.tsx'
import { RecoveryEmail } from '../_shared/email-templates/recovery.tsx'
import { EmailChangeEmail } from '../_shared/email-templates/email-change.tsx'
import { ReauthenticationEmail } from '../_shared/email-templates/reauthentication.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_NAME = 'Vestis'
const SITE_URL = 'https://vestisapp.online'
const FROM_ADDRESS = 'Vestis <noreply@vestisapp.online>'

const EMAIL_SUBJECTS: Record<string, string> = {
  signup: 'Your Vestis verification code',
  invite: "You've been invited to Vestis",
  magiclink: 'Your Vestis sign-in link',
  recovery: 'Reset your Vestis password',
  email_change: 'Confirm your Vestis email change',
  reauthentication: 'Your Vestis identity code',
}

const EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
}

async function verifySignature(secret: string, body: string, headers: Headers): Promise<boolean> {
  try {
    // Supabase uses Standard Webhooks format: v1,whsec_<base64>
    const rawSecret = secret.startsWith('v1,whsec_') ? secret.slice('v1,whsec_'.length) : secret
    const secretBytes = Uint8Array.from(atob(rawSecret), c => c.charCodeAt(0))

    const msgId = headers.get('webhook-id') ?? ''
    const msgTimestamp = headers.get('webhook-timestamp') ?? ''
    const msgSignature = headers.get('webhook-signature') ?? ''

    if (!msgId || !msgTimestamp || !msgSignature) return false

    const signedContent = `${msgId}.${msgTimestamp}.${body}`
    const key = await crypto.subtle.importKey(
      'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))

    return msgSignature.split(' ').some(s => s === `v1,${computed}`)
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Read body once — needed for both signature verification and JSON parsing
    const rawBody = await req.text()

    // Verify Standard Webhooks signature if HOOK_SECRET is configured
    const HOOK_SECRET = Deno.env.get('HOOK_SECRET')
    if (HOOK_SECRET) {
      const valid = await verifySignature(HOOK_SECRET, rawBody, req.headers)
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured')
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = JSON.parse(rawBody)

    // Supabase auth hook payload shape:
    // { user: { email }, email_data: { token, token_hash, redirect_to, email_action_type, site_url } }
    const emailActionType: string = body?.email_data?.email_action_type ?? body?.type ?? ''
    const recipientEmail: string = body?.user?.email ?? body?.email ?? ''
    const token: string = body?.email_data?.token ?? body?.token ?? ''
    const confirmationUrl: string = body?.email_data?.redirect_to ?? body?.confirmation_url ?? SITE_URL

    if (!recipientEmail) {
      return new Response(JSON.stringify({ error: 'Missing recipient email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const EmailTemplate = EMAIL_TEMPLATES[emailActionType]
    if (!EmailTemplate) {
      console.error('Unknown email action type:', emailActionType)
      return new Response(JSON.stringify({ error: `Unknown email type: ${emailActionType}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const templateProps = {
      siteName: SITE_NAME,
      siteUrl: SITE_URL,
      recipient: recipientEmail,
      confirmationUrl,
      token,
      email: recipientEmail,
      newEmail: body?.email_data?.new_email ?? '',
    }

    const element = React.createElement(EmailTemplate, templateProps)
    const [html, text] = await Promise.all([
      renderAsync(element),
      renderAsync(element, { plainText: true }),
    ])

    const subject = EMAIL_SUBJECTS[emailActionType] ?? 'Vestis Notification'

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [recipientEmail],
        subject,
        html,
        text,
      }),
    })

    if (!resendResp.ok) {
      const errText = await resendResp.text()
      console.error('Resend error:', resendResp.status, errText)
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendData = await resendResp.json()
    console.log('Email sent via Resend:', emailActionType, recipientEmail, resendData.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('auth-email-hook error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
