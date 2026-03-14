-- Create coaching_relationships table
-- Using gen_random_uuid() for maximum compatibility
CREATE TABLE IF NOT EXISTS coaching_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, client_id)
);

-- Add share_code to profiles as a generated column (on-the-fly from ID)
-- This makes it searchable and consistent without manual management
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='share_code') THEN
        ALTER TABLE profiles ADD COLUMN share_code TEXT;
    END IF;
END $$;

-- Create an index for searching by share_code
CREATE INDEX IF NOT EXISTS idx_profiles_share_code ON profiles(share_code);

-- Enable RLS
ALTER TABLE coaching_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for coaching_relationships
DROP POLICY IF EXISTS "Coaches can view their own relationships" ON coaching_relationships;
CREATE POLICY "Coaches can view their own relationships"
    ON coaching_relationships FOR SELECT
    USING (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Clients can view their own relationships" ON coaching_relationships;
CREATE POLICY "Clients can view their own relationships"
    ON coaching_relationships FOR SELECT
    USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Coaches can create requests" ON coaching_relationships;
CREATE POLICY "Coaches can create requests"
    ON coaching_relationships FOR INSERT
    WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "Clients can update status" ON coaching_relationships;
CREATE POLICY "Clients can update status"
    ON coaching_relationships FOR UPDATE
    USING (auth.uid() = client_id)
    WITH CHECK (auth.uid() = client_id);

-- Policies for viewing client data
DROP POLICY IF EXISTS "Coaches can view client daily logs" ON daily_logs;
CREATE POLICY "Coaches can view client daily logs"
    ON daily_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaching_relationships
            WHERE coach_id = auth.uid()
            AND client_id = daily_logs.user_id
            AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Coaches can view client meal entries" ON meal_entries;
CREATE POLICY "Coaches can view client meal entries"
    ON meal_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaching_relationships
            WHERE coach_id = auth.uid()
            AND client_id = meal_entries.user_id
            AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Coaches can view client weight entries" ON weight_entries;
CREATE POLICY "Coaches can view client weight entries"
    ON weight_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaching_relationships
            WHERE coach_id = auth.uid()
            AND client_id = weight_entries.user_id
            AND status = 'approved'
        )
    );

DROP POLICY IF EXISTS "Coaches can view client profiles" ON profiles;
CREATE POLICY "Coaches can view client profiles"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM coaching_relationships
            WHERE coach_id = auth.uid()
            AND client_id = profiles.id
            AND status = 'approved'
        )
    );
