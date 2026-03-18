-- Add dietary preference fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS other_dietary TEXT DEFAULT '';
