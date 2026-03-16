-- Add calorie_spread_days to profiles table to enable cross-device syncing
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS calorie_spread_days INTEGER NOT NULL DEFAULT 5;
