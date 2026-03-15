import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a professional nutritionist AI. Analyze food images and return nutritional information.
CRITICAL: FIRST verify if the image actually contains food.
- If the image is a LOGO, text, icon, or any non-food object, do NOT identify it as food. Return an empty array of foods.
- Be extremely precise. Identify specific foods (e.g. "Sardines in Oil" vs "Pizza"). Look for packaging labels or specific visual markers.
- If unsure, do not guess. Estimate macros only for items you are confident about.`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image. Identify all food items and their nutritional values per serving.",
              },
              {
                type: "image_url",
                image_url: { url: image },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_food_items",
              description: "Report the identified food items with their nutritional information",
              parameters: {
                type: "object",
                properties: {
                  foods: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Name of the food item" },
                        calories: { type: "number", description: "Calories per serving" },
                        protein: { type: "number", description: "Protein in grams per serving" },
                        carbs: { type: "number", description: "Carbohydrates in grams per serving" },
                        fats: { type: "number", description: "Fats in grams per serving" },
                        servingSize: { type: "string", description: "Estimated serving size (e.g., '1 cup', '150g')" },
                      },
                      required: ["name", "calories", "protein", "carbs", "fats", "servingSize"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["foods"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_food_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not analyze the image" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-food error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
