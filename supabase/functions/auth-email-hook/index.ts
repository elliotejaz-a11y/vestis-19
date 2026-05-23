import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.12'
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

// Returns true if valid, false if headers present but sig wrong, null if no headers (skip check).
async function verifySignature(secret: string, body: string, headers: Headers): Promise<boolean | null> {
  try {
    const msgId = headers.get('webhook-id') ?? ''
    const msgTimestamp = headers.get('webhook-timestamp') ?? ''
    const msgSignature = headers.get('webhook-signature') ?? ''

    // If Supabase didn't send Standard Webhooks headers, skip verification.
    if (!msgId && !msgTimestamp && !msgSignature) return null

    const rawSecret = secret.startsWith('v1,whsec_') ? secret.slice('v1,whsec_'.length) : secret
    const secretBytes = Uint8Array.from(atob(rawSecret), c => c.charCodeAt(0))

    const signedContent = `${msgId}.${msgTimestamp}.${body}`
    const key = await crypto.subtle.importKey(
      'raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedContent))
    const computed = btoa(String.fromCharCode(...new Uint8Array(sig)))

    return msgSignature.split(' ').some(s => s === `v1,${computed}`)
  } catch (e) {
    console.error('Signature verification error:', e)
    // Verification failed due to an exception — treat as skip (don't block auth).
    return null
  }
}

// Always return 200 to Supabase so auth never gets blocked by this hook.
// Errors are logged for debugging; email failures are non-fatal.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const ok = (msg?: string) =>
    new Response(JSON.stringify({ success: true, msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const rawBody = await req.text()

    const HOOK_SECRET = Deno.env.get('HOOK_SECRET')
    if (HOOK_SECRET) {
      const result = await verifySignature(HOOK_SECRET, rawBody, req.headers)
      if (result === false) {
        // Headers were present but signature was wrong — genuine security violation.
        console.error('auth-email-hook: signature mismatch — possible replay attack, skipping email send')
        return ok('signature_mismatch')
      }
      // null = no headers sent, skip verification silently
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('auth-email-hook: RESEND_API_KEY not configured — email not sent')
      return ok('no_resend_key')
    }

    const body = JSON.parse(rawBody)

    const emailActionType: string = body?.email_data?.email_action_type ?? body?.type ?? ''
    const recipientEmail: string = body?.user?.email ?? body?.email ?? ''
    const token: string = body?.email_data?.token ?? body?.token ?? ''
    const confirmationUrl: string = body?.email_data?.redirect_to ?? body?.confirmation_url ?? SITE_URL

    if (!recipientEmail) {
      console.error('auth-email-hook: missing recipient email in payload')
      return ok('no_recipient')
    }

    const EmailTemplate = EMAIL_TEMPLATES[emailActionType]
    if (!EmailTemplate) {
      console.error('auth-email-hook: unknown email action type:', emailActionType)
      return ok('unknown_type')
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
    const html = render(element)
    const text = render(element, { plainText: true })

    const subject = EMAIL_SUBJECTS[emailActionType] ?? 'Vestis Notification'

    const resendBody = JSON.stringify({
      from: FROM_ADDRESS,
      to: [recipientEmail],
      subject,
      html,
      text,
    })

    let resendResp: Response | null = null
    for (let attempt = 1; attempt <= 3; attempt++) {
      resendResp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: resendBody,
      })
      if (resendResp.ok) break
      if (attempt < 3) await new Promise(r => setTimeout(r, 500 * attempt))
    }

    if (!resendResp || !resendResp.ok) {
      const errText = await resendResp?.text() ?? 'no response'
      console.error('auth-email-hook: Resend failed after 3 attempts', resendResp?.status, errText)
      return ok('resend_error')
    }

    const resendData = await resendResp.json()
    console.log('auth-email-hook: email sent', emailActionType, recipientEmail, resendData.id)
    return ok()
  } catch (error) {
    console.error('auth-email-hook: unhandled error:', error)
    return ok('exception')
  }
})
