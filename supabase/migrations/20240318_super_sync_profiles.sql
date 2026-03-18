
-- SUPER SYNC: Run this in Supabase SQL Editor to fix ALL schema/RLS issues at once.

-- 1. Ensure all columns exist in profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS other_dietary TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS chat_harshness TEXT DEFAULT 'בינוני',
  ADD COLUMN IF NOT EXISTS coach_name TEXT DEFAULT 'NovaFit AI',
  ADD COLUMN IF NOT EXISTS weekly_pace_kg REAL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS height_cm REAL,
  ADD COLUMN IF NOT EXISTS weight_kg REAL,
  ADD COLUMN IF NOT EXISTS target_weight_kg REAL,
  ADD COLUMN IF NOT EXISTS activity_level TEXT,
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS bmr REAL,
  ADD COLUMN IF NOT EXISTS tdee REAL,
  ADD COLUMN IF NOT EXISTS daily_calorie_target REAL,
  ADD COLUMN IF NOT EXISTS protein_target REAL,
  ADD COLUMN IF NOT EXISTS carbs_target REAL,
  ADD COLUMN IF NOT EXISTS fats_target REAL,
  ADD COLUMN IF NOT EXISTS target_date DATE,
  ADD COLUMN IF NOT EXISTS unique_code TEXT UNIQUE;

-- 2. Repair Unique Code Default
ALTER TABLE public.profiles ALTER COLUMN unique_code SET DEFAULT generate_unique_code();

-- 3. Standardize RLS for ALL tables (Drop and Re-create)
DO $$ 
DECLARE
  tables TEXT[] := ARRAY['profiles', 'daily_logs', 'meal_entries', 'weight_entries', 'meal_templates', 'chat_sessions', 'chat_messages', 'push_subscriptions'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop potential conflicting policies
    EXECUTE format('DROP POLICY IF EXISTS owner_full_access ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS public_read_basic ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS coach_read_trainee_profiles ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS coach_read_trainee_logs ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS coach_read_trainee_meals ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS coach_read_trainee_weight ON %I', t);
    
    -- Re-enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Define clean policies
-- profiles
CREATE POLICY "owner_full_access" ON profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "public_read_basic" ON profiles FOR SELECT TO authenticated USING (true);
-- others
CREATE POLICY "owner_full_access" ON daily_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON meal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON weight_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON meal_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON chat_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Ensure hard_reset_user is present and correct
CREATE OR REPLACE FUNCTION public.hard_reset_user()
RETURNS void AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM public.chat_messages WHERE user_id = uid;
  DELETE FROM public.chat_sessions WHERE user_id = uid;
  DELETE FROM public.meal_entries WHERE user_id = uid;
  DELETE FROM public.daily_logs WHERE user_id = uid;
  DELETE FROM public.weight_entries WHERE user_id = uid;
  DELETE FROM public.meal_templates WHERE user_id = uid;
  DELETE FROM public.push_subscriptions WHERE user_id = uid;
  DELETE FROM public.user_connections WHERE coach_id = uid OR trainee_id = uid;
  DELETE FROM public.profiles WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.hard_reset_user() TO authenticated;

-- 5. TRIGGER CACHE REFRESH
-- Any structural change or comment change tells PostgREST to reload its schema cache.
COMMENT ON TABLE public.profiles IS 'NovaFit User Profiles - Last Synced 2024-03-18';
