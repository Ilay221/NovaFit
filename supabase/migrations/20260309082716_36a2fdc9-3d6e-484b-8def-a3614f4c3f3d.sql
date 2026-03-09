ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS favorite_food text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dietary_weakness text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS daily_habits text NOT NULL DEFAULT '';