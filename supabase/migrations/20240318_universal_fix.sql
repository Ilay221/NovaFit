
-- UNIVERSAL FIX: Run this in Supabase SQL Editor to ensure ALL tables, columns, and policies are perfectly synced.

-- 1. UTILS (Unique Code Generator)
CREATE OR REPLACE FUNCTION generate_unique_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  found_code TEXT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    SELECT unique_code INTO found_code FROM public.profiles WHERE unique_code = result;
    IF NOT FOUND THEN RETURN result; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. TABLES (Create if missing)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    water_ml INTEGER DEFAULT 0,
    calories_consumed REAL DEFAULT 0,
    protein_consumed REAL DEFAULT 0,
    carbs_consumed REAL DEFAULT 0,
    fats_consumed REAL DEFAULT 0,
    base_calorie_target REAL DEFAULT 2000,
    calorie_balance REAL DEFAULT 0,
    rollover_calories REAL DEFAULT 0,
    spread_days INTEGER DEFAULT 1,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.meal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL NOT NULL,
    carbs REAL NOT NULL,
    fats REAL NOT NULL,
    serving_size TEXT,
    category TEXT,
    quantity REAL DEFAULT 1,
    meal_type TEXT,
    logged_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weight_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight_kg REAL NOT NULL,
    UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS public.meal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_json JSONB NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, subscription_json)
);

CREATE TABLE IF NOT EXISTS public.user_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trainee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(coach_id, trainee_id)
);

-- 3. COLUMNS (Ensure all exist in profiles)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS unique_code TEXT UNIQUE DEFAULT generate_unique_code(),
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
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- 4. RLS MASTER RESET
DO $$ 
DECLARE
  tables TEXT[] := ARRAY['profiles', 'daily_logs', 'meal_entries', 'weight_entries', 'meal_templates', 'chat_sessions', 'chat_messages', 'push_subscriptions', 'user_connections'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Standard catch-all policy removal
    EXECUTE format('DROP POLICY IF EXISTS owner_full_access ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS public_read_basic ON public.%I', t);
    
    -- Table-specific policy removals (to be safe)
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own connections" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own profile" ON public.%I', t);
    -- ... (add more as needed if specific names exist)
  END LOOP;
END $$;

-- Define clean policies
CREATE POLICY "owner_full_access" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "public_read_basic" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "owner_full_access" ON public.daily_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.meal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.weight_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.meal_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.chat_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.chat_messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owner_full_access" ON public.user_connections FOR ALL TO authenticated USING (auth.uid() = coach_id OR auth.uid() = trainee_id) WITH CHECK (auth.uid() = coach_id OR auth.uid() = trainee_id);

-- 5. REPAIR FUNCTIONS
CREATE OR REPLACE FUNCTION public.hard_reset_user() RETURNS void AS $$
DECLARE uid UUID := auth.uid();
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

-- 6. TRIGGER CACHE REFRESH
COMMENT ON TABLE public.profiles IS 'NovaFit Final Sync - 2024-03-18';
