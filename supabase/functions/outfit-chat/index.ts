import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, outfitContext } = await req.json();

    // Input validation
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: 'Invalid messages' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string' || msg.content.length > 2000) {
        return new Response(JSON.stringify({ error: 'Invalid message format' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    if (!outfitContext || typeof outfitContext.occasion !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid outfit context' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const outfitSummary = (outfitContext.items || []).slice(0, 20)
      .map((i: any, idx: number) => `${idx + 1}. "${String(i.name || '').slice(0, 100)}" (${i.category}, ${i.color}, ${i.fabric})`)
      .join('\n');

    const wardrobeSummary = (outfitContext.wardrobeItems || []).slice(0, 50)
      .map((i: any, idx: number) => `W${idx + 1}. "${String(i.name || '').slice(0, 100)}" (${i.category}, ${i.color}, ${i.fabric})`)
      .join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a world-class fashion stylist AI assistant. The user has just generated an outfit for "${String(outfitContext.occasion).slice(0, 200)}" consisting of:
${outfitSummary}

Original reasoning: ${String(outfitContext.reasoning || '').slice(0, 500)}
${outfitContext.styleTips ? `Style tips: ${String(outfitContext.styleTips).slice(0, 500)}` : ''}

${wardrobeSummary ? `The user's full wardrobe (available for swaps):\n${wardrobeSummary}` : ''}

Help the user refine this outfit. You can suggest color alternatives, item swaps, layering tips, accessory additions, or styling adjustments. Be specific and actionable. Be warm and encouraging.

IMPORTANT: Whenever you suggest a new or modified outfit combination, you MUST call the show_outfit tool with the indices of the items to display. Use the current outfit item indices (1-based) for items already in the outfit, and wardrobe item indices prefixed with "W" (e.g. "W3") for items from the full wardrobe. Always provide a brief explanation alongside the tool call.`,
          },
          ...messages.map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'show_outfit',
              description: 'Display a visual preview of a suggested outfit combination to the user. Call this whenever you suggest swapping, adding, or removing items.',
              parameters: {
                type: 'object',
                properties: {
                  outfit_item_indices: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'The 1-based indices of items from the CURRENT outfit to keep',
                  },
                  wardrobe_item_indices: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'The 1-based indices of items from the FULL WARDROBE to add (the W-prefixed numbers without the W)',
                  },
                  explanation: {
                    type: 'string',
                    description: 'Brief 1-2 sentence explanation of this outfit combination',
                  },
                },
                required: ['outfit_item_indices', 'wardrobe_item_indices', 'explanation'],
                additionalProperties: false,
              },
            },
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const text = await response.text();
      console.error('AI gateway error:', response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const message = aiData.choices?.[0]?.message;

    // Build response with both text content and any tool calls
    const result: any = {
      content: message?.content || '',
      toolCalls: [],
    };

    if (message?.tool_calls) {
      for (const tc of message.tool_calls) {
        if (tc.function?.name === 'show_outfit') {
          try {
            const args = JSON.parse(tc.function.arguments);
            result.toolCalls.push({
              name: 'show_outfit',
              args,
            });
          } catch {}
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('outfit-chat error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
