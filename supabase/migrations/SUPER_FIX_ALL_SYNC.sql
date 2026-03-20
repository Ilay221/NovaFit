
-- UNIVERSAL SCHEMA REFRESH & COLUMN FIX
-- Run this in the Supabase SQL Editor (SQL Tools -> New Query) to resolve "column not found" / PGRST204 errors.

DO $$ 
BEGIN
    -- 1. Ensure theme_color column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme_color') THEN
        ALTER TABLE public.profiles ADD COLUMN theme_color TEXT DEFAULT NULL;
    END IF;

    -- 2. Ensure calorie_banking_enabled column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'calorie_banking_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN calorie_banking_enabled BOOLEAN DEFAULT TRUE;
    END IF;

    -- 3. Ensure dietary_preferences column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'dietary_preferences') THEN
        ALTER TABLE public.profiles ADD COLUMN dietary_preferences TEXT[] DEFAULT '{}';
    END IF;

    -- 3. Ensure other_dietary column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'other_dietary') THEN
        ALTER TABLE public.profiles ADD COLUMN other_dietary TEXT DEFAULT '';
    END IF;

    -- 4. Ensure weekly_pace_kg column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'weekly_pace_kg') THEN
        ALTER TABLE public.profiles ADD COLUMN weekly_pace_kg DOUBLE PRECISION DEFAULT 0.5;
    END IF;

    -- 5. Ensure calorie_spread_days column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'calorie_spread_days') THEN
        ALTER TABLE public.profiles ADD COLUMN calorie_spread_days INTEGER DEFAULT 5;
    END IF;

    -- 6. Ensure unique_code column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'unique_code') THEN
        ALTER TABLE public.profiles ADD COLUMN unique_code TEXT;
    END IF;

    -- 7. Ensure last_seen column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ;
    END IF;

    -- 8. Ensure chat_harshness column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chat_harshness') THEN
        ALTER TABLE public.profiles ADD COLUMN chat_harshness TEXT DEFAULT 'בינוני';
    END IF;

    -- 9. Ensure coach_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'coach_name') THEN
        ALTER TABLE public.profiles ADD COLUMN coach_name TEXT DEFAULT 'NovaFit AI';
    END IF;

    -- CRITICAL: Force a schema cache reload for PostgREST
    -- This fixes the PGRST204 error where the API doesn't know about new columns
    PERFORM pg_notify('pgrst', 'reload schema');
    
    RAISE NOTICE 'Universal sync complete. All columns checked and schema reload triggered.';
END $$;
