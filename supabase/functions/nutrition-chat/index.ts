import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 30000;

/** Fetch with timeout */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Exponential backoff retry for transient errors (429, 5xx, network) */
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);

      // Retry on 429 or 5xx
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 10000)
          : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;

        console.warn(`AI gateway returned ${response.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms`);
        // Consume body to avoid leak
        await response.text();
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        console.warn(`Request timed out (${REQUEST_TIMEOUT_MS}ms), retry ${attempt + 1}/${MAX_RETRIES}`);
      } else {
        console.warn(`Network error: ${lastError.message}, retry ${attempt + 1}/${MAX_RETRIES}`);
      }

      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("All retry attempts failed");
}

/** Sanitize messages to ensure valid payload */
function sanitizeMessages(messages: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: any) => m && typeof m === "object" && typeof m.content === "string" && typeof m.role === "string")
    .map((m: any) => ({
      role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 10000), // Cap message length
    }))
    .slice(-30); // Keep last 30 messages max for context window safety
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = sanitizeMessages(body?.messages);
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "AI service is not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user context
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let systemPrompt = "You are NovaFit AI, a warm, expert nutrition coach. Be concise, actionable, and encouraging. Use emojis sparingly.";

    try {
      const token = authHeader.replace("Bearer ", "");
      if (token && token !== "null" && token.length > 10) {
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          const today = new Date().toISOString().slice(0, 10);
          const { data: todayLog } = await supabase
            .from("daily_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", today)
            .maybeSingle();

          let mealsInfo = "No meals logged today.";
          let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;

          if (todayLog) {
            const { data: meals } = await supabase
              .from("meal_entries")
              .select("*")
              .eq("daily_log_id", todayLog.id);

            if (meals && meals.length > 0) {
              totalCalories = meals.reduce((s, m) => s + m.calories * m.quantity, 0);
              totalProtein = meals.reduce((s, m) => s + m.protein * m.quantity, 0);
              totalCarbs = meals.reduce((s, m) => s + m.carbs * m.quantity, 0);
              totalFats = meals.reduce((s, m) => s + m.fats * m.quantity, 0);
              mealsInfo = `Today's meals: ${meals.map(m => `${m.food_name} (${Math.round(m.calories * m.quantity)} kcal)`).join(", ")}`;
            }
          }

          const { data: latestWeight } = await supabase
            .from("weight_entries")
            .select("weight_kg")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(1);

          const currentWeight = latestWeight?.[0]?.weight_kg ?? profile?.weight_kg ?? "unknown";

          if (profile) {
            const remainingCal = Math.round(profile.daily_calorie_target - totalCalories);
            const remainingProtein = Math.round(profile.protein_target - totalProtein);
            const remainingCarbs = Math.round(profile.carbs_target - totalCarbs);
            const remainingFats = Math.round(profile.fats_target - totalFats);

            systemPrompt = `You are NovaFit AI, a warm, expert, and hyper-personalized nutrition coach. You know everything about this user:

## User Profile
- Name: ${profile.name}
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${profile.height_cm}cm
- Current weight: ${currentWeight}kg
- Target weight: ${profile.target_weight_kg}kg
- Goal: ${profile.goal === 'lose' ? 'Lose weight' : profile.goal === 'gain' ? 'Build muscle' : 'Maintain weight'}
- Activity level: ${profile.activity_level}
${profile.target_date ? `- Target date: ${profile.target_date}` : ''}

## Nutrition Targets
- Daily calorie target: ${Math.round(profile.daily_calorie_target)} kcal
- Protein: ${Math.round(profile.protein_target)}g | Carbs: ${Math.round(profile.carbs_target)}g | Fats: ${Math.round(profile.fats_target)}g

## Today's Progress
- ${mealsInfo}
- Calories consumed: ${Math.round(totalCalories)} kcal | Remaining: ${remainingCal} kcal
- Protein remaining: ${remainingProtein}g | Carbs remaining: ${remainingCarbs}g | Fats remaining: ${remainingFats}g
- Water intake: ${todayLog?.water_ml ?? 0}ml

## Personal Preferences
- Favorite food: ${profile.favorite_food || 'Not specified'}
- Dietary weakness/craving: ${profile.dietary_weakness || 'Not specified'}
- Daily habits: ${profile.daily_habits || 'Not specified'}

## Instructions
- Always call the user by their name (${profile.name}).
- Reference their specific goals, remaining calories, and macros in responses.
- If they ask for food suggestions, consider their remaining macros AND their preferences/weaknesses.
- If their weakness is something specific (e.g., ice cream, pizza), proactively suggest healthier alternatives or portion-controlled versions when relevant.
- Be encouraging but realistic. Use a friendly, coaching tone.
- Keep responses concise (2-4 paragraphs max).
- Use metric units (kg, cm).`;
          }
        }
      }
    } catch (authErr) {
      console.warn("Failed to load user context (non-fatal):", authErr);
      // Continue with generic system prompt
    }

    const response = await fetchWithRetry(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const bodyText = await response.text();
      console.error(`AI gateway final error: ${status} ${bodyText}`);

      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please try again later.", code: "CREDITS_EXHAUSTED" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again.", code: "RATE_LIMITED" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service is temporarily unavailable. Please try again.", code: "SERVICE_ERROR" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nutrition-chat critical error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const isTimeout = msg.includes("abort") || msg.includes("timeout");
    return new Response(JSON.stringify({
      error: isTimeout
        ? "The AI took too long to respond. Please try again."
        : "Something went wrong. Please try again in a moment.",
      code: isTimeout ? "TIMEOUT" : "INTERNAL_ERROR",
    }), {
      status: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
