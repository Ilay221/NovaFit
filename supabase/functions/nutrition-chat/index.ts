import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

const AI_GATEWAY = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
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

function sanitizeMessages(messages: unknown): Array<{ role: string; content: any }> {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter((m: any) => m && typeof m === "object" && (typeof m.content === "string" || Array.isArray(m.content)) && typeof m.role === "string")
    .map((m: any) => {
      let content = m.content;
      if (m.image_url) {
        content = [
          { type: "text", text: m.content || "Analyze this image." },
          { type: "image_url", image_url: { url: m.image_url } }
        ];
      }
      return {
        role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "user",
        content: content,
      };
    })
    .slice(-30);
}

function getSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
}

async function getUserFromToken(supabase: any, authHeader: string) {
  const token = authHeader.replace("Bearer ", "");
  if (!token || token === "null" || token.length < 10) {
    console.warn("Invalid or missing auth token in header");
    return null;
  }
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      console.error("Supabase auth.getUser error:", error);
      return null;
    }
    return data?.user || null;
  } catch (err) {
    console.error("Critical error in getUserFromToken:", err);
    return null;
  }
}

async function buildSystemPrompt(supabase: any, user: any, bodySettings?: any, bodyUserId?: string): Promise<string> {
  const targetUserId = user?.id || bodyUserId;
  let defaultPrompt = "You are NovaFit AI, a warm, expert nutrition coach. Be concise, actionable, and encouraging. Use emojis sparingly.";
  if (!targetUserId) return defaultPrompt;

  try {
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", targetUserId).maybeSingle();
    
    // Prioritize bodySettings from frontend for "bulletproof" sync
    const coachName = bodySettings?.coachName || profile?.coach_name || "NovaFit AI";
    const chatHarshness = bodySettings?.chatHarshness || profile?.chat_harshness || "בינוני";
    const userName = bodySettings?.userName || profile?.name || "User";
    
    let harshnessInstructions = "";
    if (chatHarshness === "קשוח מאוד") {
      harshnessInstructions = "You MUST be EXTREMELY HARSH, STRICT, and UNCOMPROMISING. Do NOT be warm or overly polite. Speak like a tough-love drill sergeant. Demand excellence and do not accept excuses for failing to meet macro/calorie goals. Be brutally honest.";
    } else if (chatHarshness === "עדין") {
      harshnessInstructions = "You MUST be EXTREMELY GENTLE, COMPASSIONATE, and UNDERSTANDING. Speak like a loving, supportive friend or a gentle therapist. Never scold or be harsh, always validate the user's feelings and celebrate tiny wins.";
    } else {
      harshnessInstructions = "Be a balanced, warm, and expert nutrition coach. Be encouraging but realistic, providing constructive feedback when necessary.";
    }
    
    defaultPrompt = `You are ${coachName}, an expert nutrition coach. ${harshnessInstructions}`;

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

    // Fetch last 7 days of meal history (excluding today)
    const pastDays: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      pastDays.push(d.toISOString().slice(0, 10));
    }
    const { data: pastLogs } = await supabase.from("daily_logs").select("id, date, water_ml").eq("user_id", user.id).in("date", pastDays);
    let pastMealsHistory = "";
    if (pastLogs && pastLogs.length > 0) {
      const logIds = pastLogs.map((l: any) => l.id);
      const { data: pastMeals } = await supabase.from("meal_entries").select("*").in("daily_log_id", logIds).order("logged_at", { ascending: true });
      if (pastMeals && pastMeals.length > 0) {
        const byDate: Record<string, { meals: string[], cal: number, p: number, c: number, f: number, water: number }> = {};
        for (const log of pastLogs) {
          byDate[log.date] = { meals: [], cal: 0, p: 0, c: 0, f: 0, water: log.water_ml || 0 };
        }
        for (const m of pastMeals) {
          const log = pastLogs.find((l: any) => l.id === m.daily_log_id);
          if (!log) continue;
          const cal = Math.round(m.calories * m.quantity);
          const p = Math.round(m.protein * m.quantity);
          const c = Math.round(m.carbs * m.quantity);
          const f = Math.round(m.fats * m.quantity);
          byDate[log.date].cal += cal;
          byDate[log.date].p += p;
          byDate[log.date].c += c;
          byDate[log.date].f += f;
          const type = m.meal_type || 'snack';
          byDate[log.date].meals.push(`[${type}] ${m.food_name} (${cal} kcal, P:${p}g C:${c}g F:${f}g)`);
        }
        const sortedDates = Object.keys(byDate).sort();
        const parts: string[] = [];
        for (const date of sortedDates) {
          const d = byDate[date];
          if (d.meals.length === 0) continue;
          const overUnder = d.cal > profile.daily_calorie_target ? `⚠️ OVER by ${d.cal - Math.round(profile.daily_calorie_target)} kcal` : `${Math.round(profile.daily_calorie_target) - d.cal} kcal under target`;
          parts.push(`### ${date}\n  Total: ${d.cal} kcal (${overUnder}) | P:${d.p}g C:${d.c}g F:${d.f}g | Water: ${d.water}ml\n  ${d.meals.join("\n  ")}`);
        }
        if (parts.length > 0) pastMealsHistory = parts.join("\n");
      }
    }

    const { data: latestWeight } = await supabase.from("weight_entries").select("weight_kg, date").eq("user_id", user.id).order("date", { ascending: false }).limit(5);
    const currentWeight = latestWeight?.[0]?.weight_kg ?? profile.weight_kg ?? "unknown";
    const weightTrend = latestWeight && latestWeight.length >= 2
      ? `Weight trend (last ${latestWeight.length} entries): ${latestWeight.map((w: any) => `${w.weight_kg}kg (${w.date})`).reverse().join(" → ")}`
      : "No weight trend data yet.";

    const baseTarget = profile.daily_calorie_target;
    const rollover = todayLog?.rollover_calories || 0;
    const spreadDays = todayLog?.spread_days || 0;
    const effectiveTarget = Math.max(profile.gender === 'female' ? 800 : 1000, Math.round(baseTarget + rollover));

    let bankingContext = "";
    if (rollover > 0) {
      bankingContext = `(Smart Balance: User has a BONUS of +${Math.round(rollover)} kcal saved from yesterday! The target is temporarily increased from ${Math.round(baseTarget)} to ${effectiveTarget}.)`;
    } else if (rollover < 0) {
      if (spreadDays > 0) {
        bankingContext = `(Smart Balance: User exceeded their target previously. The debt is being spread over ${spreadDays} days. Their target is temporarily reduced by ${Math.abs(Math.round(rollover))} kcal today from ${Math.round(baseTarget)} to ${effectiveTarget}.)`;
      } else {
        bankingContext = `(Smart Balance: User exceeded their target yesterday. Their target is temporarily reduced by ${Math.abs(Math.round(rollover))} kcal today from ${Math.round(baseTarget)} to ${effectiveTarget}.)`;
      }
    } else {
      bankingContext = `(Smart Balance is neutral. Base target remains ${Math.round(baseTarget)}.)`;
    }

    const remainingCal = Math.round(effectiveTarget - totalCalories);
    const remainingProtein = Math.round(profile.protein_target - totalProtein);
    const remainingCarbs = Math.round(profile.carbs_target - totalCarbs);
    const remainingFats = Math.round(profile.fats_target - totalFats);

    const calorieStatus = totalCalories > effectiveTarget
      ? `⚠️ OVER TARGET by ${Math.abs(remainingCal)} kcal!`
      : remainingCal < 200
        ? `Almost at target — only ${remainingCal} kcal remaining.`
        : `${remainingCal} kcal remaining.`;

    const proteinPct = Math.round((totalProtein / profile.protein_target) * 100);
    const carbsPct = Math.round((totalCarbs / profile.carbs_target) * 100);
    const fatsPct = Math.round((totalFats / profile.fats_target) * 100);

    const dietaryLabel = (profile.dietary_preferences && profile.dietary_preferences.length > 0) 
      ? profile.dietary_preferences.join(', ') 
      : 'None';
    const otherDietary = profile.other_dietary || 'None';

    return `## MANDATORY DIETARY CONSTRAINTS
- User is: ${dietaryLabel}
- Additional Info: ${otherDietary}
- RULES: You MUST ALWAYS respect these dietary constraints. If the user is KOSHER, do NOT suggest non-kosher foods (e.g. pork, shellfish, or mixing milk and meat). If the user is VEGETARIAN, do NOT suggest meat. These constraints ARE HIGHER PRIORITY than any macro goals.

## Visual Analysis Instructions
- When the user provides an image, act as a "Critical Visual Nutritionist".
- FIRST, identify if the image contains actual food.
- If the image is a logo, text, a person, or any non-food object, STATE THIS CLEARLY and do NOT provide nutritional data or a FOOD_ADD tag for it.
- If it is food, identify it with high precision. Look for textures, shapes, and colors.
- Be honest: if an image is blurry or ambiguous (like the sardines/pizza case), ask for clarification rather than guessing wildly.
- Do NOT hallucinate popular foods (like pizza) if they aren't clearly visible.
- CONSIDER the mandatory dietary constraints above when analyzing images.

## Today's Progress (${today})
- ${mealsBreakdown}
- Calories consumed: ${Math.round(totalCalories)} kcal — ${calorieStatus}
- Protein: ${totalProtein}g / ${Math.round(profile.protein_target)}g (${proteinPct}%) | Carbs: ${totalCarbs}g / ${Math.round(profile.carbs_target)}g (${carbsPct}%) | Fats: ${totalFats}g / ${Math.round(profile.fats_target)}g (${fatsPct}%)
- Remaining: Protein ${remainingProtein}g | Carbs ${remainingCarbs}g | Fats ${remainingFats}g
- Water intake: ${todayLog?.water_ml ?? 0}ml

## Weight History
- ${weightTrend}

## Meal History (Last 7 Days)
${pastMealsHistory || "No meal history from previous days."}
When the user asks about what they ate on a specific day (e.g. "yesterday", "2 days ago"), use this history to give a detailed breakdown.

## Personal Preferences (NFP)
- Favorite food: ${profile.favorite_food || 'Not specified'}
- Dietary weakness/craving: ${profile.dietary_weakness || 'Not specified'}
- Daily habits: ${profile.daily_habits || 'Not specified'}
- Dietary preferences: ${profile.dietary_preferences?.join(', ') || 'None specified'}
- Additional dietary info: ${profile.other_dietary || 'None'}

## Instructions
- Your name is ${profile.coach_name || 'NovaFit AI'}. Always refer to yourself by this name if asked.
- Your personality/harshness setting is: "${profile.chat_harshness || 'בינוני'}". YOU MUST FOLLOW THESE GUIDELINES STRICTLY:
  ${profile.chat_harshness === "קשוח מאוד" 
    ? "BE EXTREMELY HARSH AND STRICT. NO EXCUSES ALLOWED. Scold the user if they miss their targets." 
    : profile.chat_harshness === "עדין" 
      ? "BE EXTREMELY GENTLE AND SUPPORTIVE. Validate their feelings, be careful with your words, and never sound disappointed." 
      : "Be a balanced, helpful, and warm coach."}
- Always call the user by their name (${userName}).
- Reference their specific goals, remaining calories, and macros in responses.
- If they ask for food suggestions, consider their remaining macros AND their preferences/weaknesses AND medical conditions.
- If they exceeded their calorie target today, react according to your harshness setting.
- When the user asks about meals from a previous day, give a full detailed breakdown from the meal history above.
- Keep responses concise (2-4 paragraphs max).
- Use metric units (kg, cm).
- If the user asks about their progress today, give them a full breakdown.

## Food Logging from Chat
When the user mentions they ATE or DRANK something (past tense, e.g. "אכלתי אורז", "שתיתי קפה", "I had rice"), you MUST include a special hidden tag at the END of your response with nutritional data for logging.
Format (JSON inside HTML comment, MUST be valid JSON):
<!--FOOD_ADD:{"foods":[{"name":"אורז לבן","calories":206,"protein":4,"carbs":45,"fats":0.4,"serving_size":"כוס אחת","quantity":1,"meal_type":"lunch"}]}-->

Rules for the FOOD_ADD tag:
- Only include it when the user explicitly says they ate/drank something NOW or TODAY
- Do NOT include it for hypothetical questions ("what should I eat?", "is rice healthy?")
- Estimate realistic nutritional values per serving
- Use the most appropriate meal_type based on context or time: "breakfast", "lunch", "dinner", or "snack"
- If user mentions quantity (e.g. "2 cups of rice"), set quantity accordingly
- If multiple foods are mentioned ("אכלתי אורז ועוף"), include all in the foods array
- The tag must be the LAST thing in your response
- Always respond naturally BEFORE the tag (acknowledge what they ate, give tips, etc.)`;

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
        model: "gemini-3-flash-preview",
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
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] Incoming request: ${req.method} ${new URL(req.url).pathname}`);
  
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Log important headers (sanitized)
  const authHeader = req.headers.get("authorization") ?? "";
  const apikeyHeader = req.headers.get("apikey") ?? "";
  console.log(`[${requestId}] Headers check - Auth length: ${authHeader.length}, API Key length: ${apikeyHeader.length}`);

  try {
    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service is not configured (Missing GEMINI_API_KEY)" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseClient();
    const authHeader = req.headers.get("authorization") ?? "";

    // === ACTION: generate-title ===
    if (body?.action === "generate-title") {
      const messages = sanitizeMessages(body?.messages);
      const title = await generateTitle(messages, GEMINI_API_KEY);
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
    const systemPrompt = await buildSystemPrompt(supabase, user, body?.settings, body?.userId);

    const response = await fetchWithRetry(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-3-flash-preview",
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
