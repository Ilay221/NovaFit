
-- Add calorie_banking_enabled column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calorie_banking_enabled BOOLEAN DEFAULT TRUE;
