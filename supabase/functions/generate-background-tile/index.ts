import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `Design a seamless, tileable 64×64 pixel art game tile with a sci-fi / Turrican vibe. Keep a 5×5 block grid feel but sharpen pixels and clean up noise for crisp retro display. Palette: muted greys and dark greys with a desaturated Amiga blue accent and overall faded colors (limited 10–14 color palette). Medium texture level: clear panel edges, small tech details, subtle bevel highlights, and short neon conduit lines in Amiga blue. Make edges match exactly so the tile repeats seamlessly horizontally and vertically. Visual elements: angular metallic plates, tiny vent/grate pixels, short circuit traces, and a few small glowing nodes; avoid organic speckle. Strong, readable contrast at small sizes; no text or logos. Output as a PNG-ready tile with solid background (no transparency).

Critical requirements for seamless tiling:
- Every pixel on the left edge must be identical to the corresponding pixel on the right edge
- Every pixel on the top edge must be identical to the corresponding pixel on the bottom edge
- Blue conduit lines touching an edge must continue at the exact same position on the opposite edge
- Bevel highlights and shadows must match across edges
- Panel borders reaching an edge should meet an identical border on the opposite edge
- Keep glowing nodes 2-3 pixels inside edges to avoid seam issues
- Use exact same color indices at matching edge pixels`;

    console.log('Generating background tile with Lovable AI...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data));
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({ 
      success: true,
      imageUrl: imageUrl,
      message: data.choices?.[0]?.message?.content || 'Image generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating background tile:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
