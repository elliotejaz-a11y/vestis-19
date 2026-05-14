import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email } = await req.json()
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Generate a Supabase recovery token without sending an email through Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (error) {
      console.error('generateLink error:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const otp = data.properties?.email_otp
    if (!otp) {
      console.error('No email_otp returned from generateLink')
      return new Response(JSON.stringify({ error: 'Could not generate reset code' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Vestis <noreply@vestisapp.online>',
        to: [email],
        subject: 'Reset your Vestis password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#ffffff">
            <img src="https://vestisapp.online/vestis-logo.png" alt="Vestis" style="height:40px;margin:0 0 24px" />
            <h2 style="font-size:22px;font-weight:700;color:#1a0407;margin:0 0 12px">Reset your password</h2>
            <p style="font-size:15px;color:#4A3728;line-height:1.65;margin:0 0 24px">
              We received a request to reset your Vestis password. Enter the code below in the app to continue.
            </p>
            <div style="background:#f9f1e8;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
              <p style="font-size:11px;color:#A08878;margin:0 0 10px;text-transform:uppercase;letter-spacing:.1em">Your reset code</p>
              <p style="font-size:40px;font-weight:700;color:#7B2432;letter-spacing:.2em;margin:0;font-family:monospace">${otp}</p>
              <p style="font-size:12px;color:#A08878;margin:10px 0 0">Expires in 1 hour — do not share this code</p>
            </div>
            <p style="font-size:13px;color:#A08878;line-height:1.6;margin:0">
              If you didn't request a password reset, your account is still secure — you can safely ignore this email.
            </p>
          </div>
        `,
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
    console.log('Password reset email sent:', email, resendData.id)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-password-reset error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
