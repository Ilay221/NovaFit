import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Real VAPID keys
const VAPID_PUBLIC_KEY = 'BJe8CCJOnAVwmTHMFeqwHsaOc2AdS4KCieEna4ohb0P6DjO_UA1timqJQrG9ImwibxYg3a9ehfo0rxTi_ZjJHzc';
const VAPID_PRIVATE_KEY = 'IoINZ3ftcXjA8Q0rdDt9rjSPpPhuvsGxWrpbDurkthI';

webpush.setVapidDetails(
  'mailto:support@novafit.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, title, body, delay_ms = 0 } = await req.json();

    if (delay_ms > 0) {
      console.log(`Delaying push by ${delay_ms}ms...`);
      await new Promise(r => setTimeout(r, delay_ms));
    }

    // Get subscriptions for the user
    const { data: subscriptions, error: subError } = await (supabase
      .from('push_subscriptions' as any) as any)
      .select('subscription_json')
      .eq('user_id', user_id);

    if (subError) throw subError;
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for user ${user_id}`);
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending push to ${subscriptions.length} devices for user ${user_id}`);
    
    const results = await Promise.allSettled(
      subscriptions.map((sub: any) => 
        webpush.sendNotification(
          sub.subscription_json,
          JSON.stringify({ title, body, url: '/' })
        )
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Pushed to ${successCount}/${subscriptions.length} devices`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("send-push error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
