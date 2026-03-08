import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for completed payments for this product
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customers.data[0].id,
        limit: 100,
      });
      
      const hasPaid = sessions.data.some(
        s => s.payment_status === "paid" && s.mode === "payment"
      );

      if (hasPaid) {
        // Update profile to premium
        await supabaseClient
          .from("profiles")
          .update({ is_premium: true })
          .eq("id", user.id);

        return new Response(JSON.stringify({ is_premium: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ is_premium: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
