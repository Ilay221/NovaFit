
-- 1. Update Profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS unique_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 2. Create function to generate unique code
CREATE OR REPLACE FUNCTION generate_unique_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Omit 0, 1, I, O for clarity
  result TEXT := '';
  i INTEGER := 0;
  found_code TEXT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    SELECT unique_code INTO found_code FROM profiles WHERE unique_code = result;
    IF NOT FOUND THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to assign unique code on insert
CREATE OR REPLACE FUNCTION set_unique_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_code IS NULL THEN
    NEW.unique_code := generate_unique_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_set_unique_code ON profiles;
CREATE TRIGGER tr_set_unique_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_unique_code();

-- 4. Assign codes to existing users
UPDATE profiles SET unique_code = generate_unique_code() WHERE unique_code IS NULL;

-- 5. Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trainee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(coach_id, trainee_id)
);

-- 6. Enable RLS
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connections"
  ON user_connections FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = trainee_id);

CREATE POLICY "Coaches can request connection"
  ON user_connections FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Trainees can update status"
  ON user_connections FOR UPDATE
  USING (auth.uid() = trainee_id)
  WITH CHECK (auth.uid() = trainee_id);

CREATE POLICY "Users can delete their connections"
  ON user_connections FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = trainee_id);

-- 7. Grant access to profiles for coaches (to view trainee data)
-- Coaches should be able to read profiles of their accepted trainees
CREATE POLICY "Coaches can view trainee profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.coach_id = auth.uid() 
      AND user_connections.trainee_id = profiles.id
      AND user_connections.status = 'accepted'
    )
    OR auth.uid() = id
  );

-- Also need to allow viewing daily logs, meals, and weight for trainees
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coaches can view trainee logs" ON daily_logs;
CREATE POLICY "Coaches can view trainee logs"
  ON daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.coach_id = auth.uid() 
      AND user_connections.trainee_id = daily_logs.user_id
      AND user_connections.status = 'accepted'
    )
    OR auth.uid() = user_id
  );

ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coaches can view trainee meals" ON meal_entries;
CREATE POLICY "Coaches can view trainee meals"
  ON meal_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.coach_id = auth.uid() 
      AND user_connections.trainee_id = meal_entries.user_id
      AND user_connections.status = 'accepted'
    )
    OR auth.uid() = user_id
  );

ALTER TABLE weight_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Coaches can view trainee weight" ON weight_entries;
CREATE POLICY "Coaches can view trainee weight"
  ON weight_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_connections 
      WHERE user_connections.coach_id = auth.uid() 
      AND user_connections.trainee_id = weight_entries.user_id
      AND user_connections.status = 'accepted'
    )
    OR auth.uid() = user_id
  );
