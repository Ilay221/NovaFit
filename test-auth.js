import { createClient } from "npm:@supabase/supabase-js";

const SUPABASE_URL = "https://wqcmowenkrutbbaovrka.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxY21vd2Vua3J1dGJiYW92cmthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDEzMTQsImV4cCI6MjA4OTA3NzMxNH0.HS0YqM46OcTfNm_r9JBnax8ymIFqBtFi87HsyjT8AfE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log("Signing in...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: "ilaycohen832@gmail.com",
    password: "TemporaryPassword123!",
  });
  
  if (error || !data.user) {
    console.error("Login failed:", error);
    return;
  }
  
  const token = data.session.access_token;
  console.log("Got token length:", token.length);
  
  console.log("Hitting Edge Function...");
  const res = await fetch(`${SUPABASE_URL}/functions/v1/nutrition-chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      messages: [{role: "user", content: "test"}]
    })
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.text());
}
main();
