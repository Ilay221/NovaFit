
-- Add weekly_pace_kg to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS weekly_pace_kg NUMERIC DEFAULT 0.5;

-- Update existing profiles to have the default value if null
UPDATE profiles SET weekly_pace_kg = 0.5 WHERE weekly_pace_kg IS NULL;
