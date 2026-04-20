// Klaviyo subscription edge function
// Creates a profile in Klaviyo, then subscribes it to the configured list.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const KLAVIYO_LIST_ID = 'V26uMy';
const KLAVIYO_REVISION = '2024-02-15';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KLAVIYO_API_KEY = Deno.env.get('KLAVIYO_API_KEY');
    if (!KLAVIYO_API_KEY) {
      console.error('KLAVIYO_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email: string | undefined = body.email;
    const firstName: string | undefined = body.first_name || body.firstName || body.display_name;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const klaviyoHeaders = {
      Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      'Content-Type': 'application/json',
      revision: KLAVIYO_REVISION,
      Accept: 'application/json',
    };

    // Step 1: Create the profile in Klaviyo
    const profileBody = {
      data: {
        type: 'profile',
        attributes: {
          email,
          ...(firstName ? { first_name: firstName } : {}),
        },
      },
    };

    let profileId: string | undefined;

    const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: klaviyoHeaders,
      body: JSON.stringify(profileBody),
    });

    const profileText = await profileRes.text();
    let profileJson: any = null;
    try {
      profileJson = JSON.parse(profileText);
    } catch {
      // ignore parse error; raw text is logged below
    }

    if (profileRes.ok && profileJson?.data?.id) {
      profileId = profileJson.data.id;
      console.log('Klaviyo profile created', { email, profileId });
    } else if (profileRes.status === 409) {
      // Profile already exists — extract the existing profile ID from the conflict response
      profileId =
        profileJson?.errors?.[0]?.meta?.duplicate_profile_id ||
        profileJson?.errors?.[0]?.source?.pointer;
      console.log('Klaviyo profile already exists', { email, profileId });
    } else {
      console.error('Failed to create Klaviyo profile', {
        status: profileRes.status,
        body: profileText,
      });
      return new Response(
        JSON.stringify({ error: 'Failed to create Klaviyo profile', details: profileText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profileId) {
      console.error('No Klaviyo profile ID resolved', { email });
      return new Response(JSON.stringify({ error: 'No profile ID returned from Klaviyo' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Subscribe the profile to the list
    const subscribeBody = {
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          profiles: {
            data: [
              {
                type: 'profile',
                id: profileId,
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: 'SUBSCRIBED',
                      },
                    },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: {
            data: { type: 'list', id: KLAVIYO_LIST_ID },
          },
        },
      },
    };

    const subRes = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers: klaviyoHeaders,
        body: JSON.stringify(subscribeBody),
      }
    );

    if (!subRes.ok && subRes.status !== 202) {
      const subText = await subRes.text();
      console.error('Failed to subscribe profile to Klaviyo list', {
        status: subRes.status,
        body: subText,
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to subscribe profile to list',
          profileId,
          details: subText,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Klaviyo subscription succeeded', { email, profileId, listId: KLAVIYO_LIST_ID });

    return new Response(
      JSON.stringify({ success: true, profileId, listId: KLAVIYO_LIST_ID }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('klaviyo-subscribe handler error', { error: message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
