-- 1. Create Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  height_cm NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  target_weight_kg NUMERIC NOT NULL,
  activity_level TEXT NOT NULL,
  goal TEXT NOT NULL,
  bmr NUMERIC NOT NULL,
  tdee NUMERIC NOT NULL,
  daily_calorie_target NUMERIC NOT NULL,
  protein_target NUMERIC NOT NULL,
  carbs_target NUMERIC NOT NULL,
  fats_target NUMERIC NOT NULL,
  is_premium BOOLEAN DEFAULT false NOT NULL,
  target_date DATE,
  favorite_food TEXT,
  dietary_weakness TEXT,
  daily_habits TEXT,
  medical_conditions TEXT,
  chat_harshness TEXT DEFAULT 'בינוני',
  coach_name TEXT DEFAULT 'NovaFit AI',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- 2. Create daily_logs
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  base_calorie_target NUMERIC NOT NULL,
  spread_days INTEGER NOT NULL DEFAULT 1,
  rollover_calories NUMERIC NOT NULL DEFAULT 0,
  calorie_balance NUMERIC NOT NULL DEFAULT 0,
  water_ml numeric NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own logs" ON daily_logs FOR ALL USING (auth.uid() = user_id);

-- 3. Create meal_entries
CREATE TABLE meal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  daily_log_id UUID REFERENCES daily_logs(id) NOT NULL,
  food_name TEXT NOT NULL,
  category TEXT NOT NULL,
  serving_size TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL,
  carbs NUMERIC NOT NULL,
  fats NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL,
  meal_type TEXT NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own meals" ON meal_entries FOR ALL USING (auth.uid() = user_id);

-- 4. Create weight_entries
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  weight_kg NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own weight" ON weight_entries FOR ALL USING (auth.uid() = user_id);

-- 5. Create chat_sessions
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sessions" ON chat_sessions FOR ALL USING (auth.uid() = user_id);

-- 6. Create chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own messages" ON chat_messages FOR ALL USING (auth.uid() = user_id);

-- 7. Add Storage bucket (if needed for the AI)
insert into storage.buckets (id, name, public) values ('chat_images', 'chat_images', true);
create policy "Public images" on storage.objects for select using ( bucket_id = 'chat_images' );
create policy "Authenticated uploads" on storage.objects for insert with check ( bucket_id = 'chat_images' AND auth.role() = 'authenticated' );
