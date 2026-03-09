import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get("authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extract user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    let systemPrompt = "You are NovaFit AI, a warm, expert nutrition coach. Be concise, actionable, and encouraging. Use emojis sparingly. Always address the user by name.";

    if (user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      // Fetch today's meals
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

      // Fetch latest weight
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("nutrition-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
