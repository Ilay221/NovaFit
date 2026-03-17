import { createClient } from '@supabase/supabase-js';

const oldUrl = 'https://wwbbdsvkdswnptmnsxjc.supabase.co';
const oldKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3YmJkc3ZrZHN3bnB0bW5zeGpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDQ2OTcsImV4cCI6MjA4ODU4MDY5N30.rDC7G3mjUcfWhSinctmN6CwQ3yFzT1x2ks6YNS0UT9Q';

const supabase = createClient(oldUrl, oldKey);

async function check() {
  // Test reading without auth
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.error("CANNOT READ PROFILES. RLS IS ENABLED.");
  } else {
    console.log("CAN READ PROFILES WITHOUT AUTH:", data?.length);
  }
}

check();
