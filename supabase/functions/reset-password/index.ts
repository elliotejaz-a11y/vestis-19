import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyToken(token: string, secret: string): Promise<{ email: string; otp: string; exp: number } | null> {
  try {
    const [payloadB64, sig] = token.split('.')
    if (!payloadB64 || !sig) return null

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const payloadStr = atob(payloadB64)
    const expectedSigBytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadStr))
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(expectedSigBytes)))

    // Timing-safe compare
    if (sig.length !== expectedSig.length) return null
    let diff = 0
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
    if (diff !== 0) return null

    return JSON.parse(payloadStr)
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { email, otp, token, newPassword } = await req.json()

    if (!email || !otp || !token || !newPassword) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const payload = await verifyToken(token, secret)

    if (!payload) {
      return new Response(JSON.stringify({ error: 'Invalid or tampered reset token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (Date.now() > payload.exp) {
      return new Response(JSON.stringify({ error: 'Reset code has expired. Please request a new one.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payload.email !== email.toLowerCase() || payload.otp !== otp) {
      return new Response(JSON.stringify({ error: 'Incorrect reset code. Please try again.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update password using admin API
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Search by email via REST API to avoid pagination limits
    const searchResp = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users?search=${encodeURIComponent(email.toLowerCase())}&per_page=10`,
      {
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        },
      }
    )
    const searchData = await searchResp.json()
    const user = searchData?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      console.error('User not found in auth.users for email:', email)
      return new Response(JSON.stringify({ error: 'No account found with that email.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      console.error('Password update error:', updateError.message)
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('Password reset successful for:', email)
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('reset-password error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
