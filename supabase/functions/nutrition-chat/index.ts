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

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, REQUEST_TIMEOUT_MS);
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = response.headers.get("retry-after");
        const delay = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 10000)
          : BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        console.warn(`AI gateway returned ${response.status}, retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay)}ms`);
        await response.text();
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error("All retry attempts failed");
}

function sanitizeMessages(messages: unknown): Array<{ role: string; content: string }> {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: any) => m && typeof m === "object" && typeof m.content === "string" && typeof m.role === "string")
    .map((m: any) => ({
      role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 10000),
    }))
    .slice(-30);
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

async function getUserFromToken(supabase: any, authHeader: string) {
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token.length < 10) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

async function buildSystemPrompt(supabase: any, user: any): Promise<string> {
  const defaultPrompt = "You are NovaFit AI, a warm, expert nutrition coach. Be concise, actionable, and encouraging. Use emojis sparingly.";
  if (!user) return defaultPrompt;

  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (!profile) return defaultPrompt;

    const today = new Date().toISOString().slice(0, 10);
    const { data: todayLog } = await supabase.from("daily_logs").select("*").eq("user_id", user.id).eq("date", today).maybeSingle();

    let mealsBreakdown = "No meals logged today.";
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
    let mealsByType: Record<string, string[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };

    if (todayLog) {
      const { data: meals } = await supabase.from("meal_entries").select("*").eq("daily_log_id", todayLog.id).order("logged_at", { ascending: true });
      if (meals && meals.length > 0) {
        for (const m of meals) {
          const cal = Math.round(m.calories * m.quantity);
          const p = Math.round(m.protein * m.quantity);
          const c = Math.round(m.carbs * m.quantity);
          const f = Math.round(m.fats * m.quantity);
          totalCalories += cal;
          totalProtein += p;
          totalCarbs += c;
          totalFats += f;
          const type = m.meal_type || 'snack';
          if (!mealsByType[type]) mealsByType[type] = [];
          mealsByType[type].push(`${m.food_name} (${cal} kcal, P:${p}g C:${c}g F:${f}g)`);
        }
        const parts: string[] = [];
        for (const [type, items] of Object.entries(mealsByType)) {
          if (items.length > 0) parts.push(`  ${type.charAt(0).toUpperCase() + type.slice(1)}: ${items.join(", ")}`);
        }
        mealsBreakdown = `Today's meals:\n${parts.join("\n")}`;
      }
    }

    const { data: latestWeight } = await supabase.from("weight_entries").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: false }).limit(5);
    const currentWeight = latestWeight?.[0]?.weight_kg ?? profile.weight_kg ?? "unknown";
    const weightTrend = latestWeight && latestWeight.length >= 2
      ? `Weight trend (last ${latestWeight.length} entries): ${latestWeight.map((w: any) => `${w.weight_kg}kg (${w.date})`).reverse().join(" → ")}`
      : "No weight trend data yet.";

    const remainingCal = Math.round(profile.daily_calorie_target - totalCalories);
    const remainingProtein = Math.round(profile.protein_target - totalProtein);
    const remainingCarbs = Math.round(profile.carbs_target - totalCarbs);
    const remainingFats = Math.round(profile.fats_target - totalFats);

    const calorieStatus = totalCalories > profile.daily_calorie_target
      ? `⚠️ OVER TARGET by ${Math.abs(remainingCal)} kcal!`
      : remainingCal < 200
        ? `Almost at target — only ${remainingCal} kcal remaining.`
        : `${remainingCal} kcal remaining.`;

    const proteinPct = Math.round((totalProtein / profile.protein_target) * 100);
    const carbsPct = Math.round((totalCarbs / profile.carbs_target) * 100);
    const fatsPct = Math.round((totalFats / profile.fats_target) * 100);

    return `You are NovaFit AI, a warm, expert, and hyper-personalized nutrition coach. You know everything about this user:

## User Profile
- Name: ${profile.name}
- Age: ${profile.age}, Gender: ${profile.gender}
- Height: ${profile.height_cm}cm
- Current weight: ${currentWeight}kg
- Target weight: ${profile.target_weight_kg}kg
- Goal: ${profile.goal === 'lose' ? 'Lose weight' : profile.goal === 'gain' ? 'Build muscle' : 'Maintain weight'}
- Activity level: ${profile.activity_level}
${profile.target_date ? `- Target date: ${profile.target_date}` : ''}

## Medical Conditions & Allergies
${profile.medical_conditions ? profile.medical_conditions : 'None specified.'}
⚠️ CRITICAL: If the user has medical conditions or allergies listed above, NEVER suggest foods that could be harmful. Always consider these when giving advice.

## Nutrition Targets
- Daily calorie target: ${Math.round(profile.daily_calorie_target)} kcal
- Protein: ${Math.round(profile.protein_target)}g | Carbs: ${Math.round(profile.carbs_target)}g | Fats: ${Math.round(profile.fats_target)}g

## Today's Progress (${today})
- ${mealsBreakdown}
- Calories consumed: ${Math.round(totalCalories)} kcal — ${calorieStatus}
- Protein: ${totalProtein}g / ${Math.round(profile.protein_target)}g (${proteinPct}%) | Carbs: ${totalCarbs}g / ${Math.round(profile.carbs_target)}g (${carbsPct}%) | Fats: ${totalFats}g / ${Math.round(profile.fats_target)}g (${fatsPct}%)
- Remaining: Protein ${remainingProtein}g | Carbs ${remainingCarbs}g | Fats ${remainingFats}g
- Water intake: ${todayLog?.water_ml ?? 0}ml

## Weight History
- ${weightTrend}

## Personal Preferences (NFP)
- Favorite food: ${profile.favorite_food || 'Not specified'}
- Dietary weakness/craving: ${profile.dietary_weakness || 'Not specified'}
- Daily habits: ${profile.daily_habits || 'Not specified'}

## Instructions
- Always call the user by their name (${profile.name}).
- Reference their specific goals, remaining calories, and macros in responses.
- If they ask for food suggestions, consider their remaining macros AND their preferences/weaknesses AND medical conditions.
- If they exceeded their calorie target today, acknowledge it compassionately and suggest how to handle the rest of the day.
- Be encouraging but realistic. Use a friendly, coaching tone.
- Keep responses concise (2-4 paragraphs max).
- Use metric units (kg, cm).
- If the user asks about their progress today, give them a full breakdown.`;
  } catch (err) {
    console.warn("Failed to build system prompt:", err);
    return defaultPrompt;
  }
}

/** Generate a short chat title from the first few messages */
async function generateTitle(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  try {
    const resp = await fetchWithTimeout(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Generate a very short title (max 5 words, in the language of the conversation) for this chat conversation. Return ONLY the title text, nothing else." },
          ...messages.slice(0, 4),
        ],
      }),
    }, 10000);

    if (!resp.ok) { await resp.text(); return "New Chat"; }
    const data = await resp.json();
    const title = data.choices?.[0]?.message?.content?.trim();
    return title ? title.slice(0, 60) : "New Chat";
  } catch {
    return "New Chat";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service is not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();
    const authHeader = req.headers.get("authorization") ?? "";

    // === ACTION: generate-title ===
    if (body?.action === "generate-title") {
      const messages = sanitizeMessages(body?.messages);
      const title = await generateTitle(messages, LOVABLE_API_KEY);
      return new Response(JSON.stringify({ title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === ACTION: chat (default) ===
    const messages = sanitizeMessages(body?.messages);
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let user = null;
    try { user = await getUserFromToken(supabase, authHeader); } catch {}
    const systemPrompt = await buildSystemPrompt(supabase, user);

    const response = await fetchWithRetry(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const bodyText = await response.text();
      console.error(`AI gateway final error: ${status} ${bodyText}`);
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached.", code: "CREDITS_EXHAUSTED" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests.", code: "RATE_LIMITED" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable.", code: "SERVICE_ERROR" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      error: isTimeout ? "The AI took too long to respond." : "Something went wrong.",
      code: isTimeout ? "TIMEOUT" : "INTERNAL_ERROR",
    }), {
      status: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
