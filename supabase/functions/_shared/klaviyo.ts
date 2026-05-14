const KLAVIYO_BASE = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2024-02-15";

function headers(apiKey: string): Record<string, string> {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    revision: KLAVIYO_REVISION,
  };
}

export function getApiKey(): string {
  const key =
    Deno.env.get("KLAVIYO_API_KEY") ??
    Deno.env.get("Klaviyo Onboard Key");
  if (!key) throw new Error("Klaviyo API key not configured");
  return key;
}

export interface KlaviyoProfileAttrs {
  email: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  properties?: Record<string, unknown>;
}

/** Creates or updates a Klaviyo profile. Returns the profile ID. */
export async function createOrUpdateProfile(
  apiKey: string,
  attrs: KlaviyoProfileAttrs,
): Promise<string | null> {
  const { email, first_name, last_name, username, avatar_url, properties } = attrs;

  const body = {
    data: {
      type: "profile",
      attributes: {
        email,
        ...(first_name ? { first_name } : {}),
        ...(last_name ? { last_name } : {}),
        properties: {
          ...(username ? { username } : {}),
          ...(avatar_url ? { avatar_url } : {}),
          ...properties,
        },
      },
    },
  };

  const res = await fetch(`${KLAVIYO_BASE}/profiles/`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (res.ok) {
    const json = await res.json();
    return json?.data?.id ?? null;
  }

  if (res.status === 409) {
    const json = await res.json().catch(() => null);
    const existingId = json?.errors?.[0]?.meta?.duplicate_profile_id ?? null;

    // Patch the existing profile with latest attrs
    if (existingId) {
      await fetch(`${KLAVIYO_BASE}/profiles/${existingId}/`, {
        method: "PATCH",
        headers: headers(apiKey),
        body: JSON.stringify({
          data: { type: "profile", id: existingId, attributes: body.data.attributes },
        }),
      });
    }
    return existingId;
  }

  const text = await res.text();
  throw new Error(`Klaviyo createOrUpdateProfile failed [${res.status}]: ${text}`);
}

/** Subscribes a profile to a Klaviyo list with email marketing consent. */
export async function subscribeToList(
  apiKey: string,
  listId: string,
  email: string,
  profileId?: string | null,
): Promise<void> {
  const res = await fetch(`${KLAVIYO_BASE}/profile-subscription-bulk-create-jobs/`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                ...(profileId ? { id: profileId } : {}),
                attributes: {
                  email,
                  subscriptions: {
                    email: { marketing: { consent: "SUBSCRIBED" } },
                  },
                },
              },
            ],
          },
        },
        relationships: {
          list: { data: { type: "list", id: listId } },
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo subscribeToList failed [${res.status}]: ${text}`);
  }
}

export interface KlaviyoEventPayload {
  metric: string;
  email: string;
  properties?: Record<string, unknown>;
  value?: number;
}

/** Tracks a custom event in Klaviyo. */
export async function trackEvent(
  apiKey: string,
  payload: KlaviyoEventPayload,
): Promise<void> {
  const { metric, email, properties, value } = payload;

  const res = await fetch(`${KLAVIYO_BASE}/events/`, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: { data: { type: "metric", attributes: { name: metric } } },
          profile: { data: { type: "profile", attributes: { email } } },
          properties: properties ?? {},
          ...(value !== undefined ? { value } : {}),
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo trackEvent failed [${res.status}]: ${text}`);
  }
}
