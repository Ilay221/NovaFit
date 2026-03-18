
-- 1. Reset and standardize RLS for ALL core tables
-- This ensures that 'authenticated' users have full CRUD on their own data, and nothing else.

DO $$ 
DECLARE
  tables TEXT[] := ARRAY['profiles', 'daily_logs', 'meal_entries', 'weight_entries', 'meal_templates', 'chat_sessions', 'chat_messages', 'push_subscriptions'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop all existing policies for the table
    EXECUTE format('DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own profile" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own profile" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own profile" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own profile" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own logs" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own logs" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own logs" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own logs" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own meals" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own meals" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own meals" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own weight" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own weight" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own weight" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own templates" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own templates" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own templates" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own templates" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own sessions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own sessions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own sessions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own sessions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own messages" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own messages" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own messages" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view their own subscriptions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Coaches can view trainee profiles" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Coaches can view trainee logs" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Coaches can view trainee meals" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Coaches can view trainee weight" ON %I', t);
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 2. Define Clean, Standardized Policies

-- PROFILES
CREATE POLICY "owner_full_access" ON profiles FOR ALL TO authenticated 
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "public_read_basic" ON profiles FOR SELECT TO authenticated 
  USING (true); -- Required for coach lookup and social features

-- DAILY_LOGS
CREATE POLICY "owner_full_access" ON daily_logs FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MEAL_ENTRIES
CREATE POLICY "owner_full_access" ON meal_entries FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEIGHT_ENTRIES
CREATE POLICY "owner_full_access" ON weight_entries FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- MEAL_TEMPLATES
CREATE POLICY "owner_full_access" ON meal_templates FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT_SESSIONS
CREATE POLICY "owner_full_access" ON chat_sessions FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CHAT_MESSAGES
CREATE POLICY "owner_full_access" ON chat_messages FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- PUSH_SUBSCRIPTIONS
CREATE POLICY "owner_full_access" ON push_subscriptions FOR ALL TO authenticated 
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Coach viewing policies (READ ONLY)
-- We re-add these because they are essential for the coach functionality
CREATE POLICY "coach_read_trainee_profiles" ON profiles FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_connections WHERE coach_id = auth.uid() AND trainee_id = profiles.id AND status = 'accepted'));

CREATE POLICY "coach_read_trainee_logs" ON daily_logs FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_connections WHERE coach_id = auth.uid() AND trainee_id = daily_logs.user_id AND status = 'accepted'));

CREATE POLICY "coach_read_trainee_meals" ON meal_entries FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_connections WHERE coach_id = auth.uid() AND trainee_id = meal_entries.user_id AND status = 'accepted'));

CREATE POLICY "coach_read_trainee_weight" ON weight_entries FOR SELECT TO authenticated 
  USING (EXISTS (SELECT 1 FROM user_connections WHERE coach_id = auth.uid() AND trainee_id = weight_entries.user_id AND status = 'accepted'));

-- 4. Constraint Optimization
-- Make unique_code easier to handle by giving it a DB-level default
ALTER TABLE public.profiles ALTER COLUMN unique_code SET DEFAULT generate_unique_code();
