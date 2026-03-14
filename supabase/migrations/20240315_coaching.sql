-- Add share_code to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Create coaching_relationships table
CREATE TABLE IF NOT EXISTS coaching_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coach_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(coach_id, client_id)
);

-- Enable RLS
ALTER TABLE coaching_relationships ENABLE ROW LEVEL SECURITY;

-- Policies for coaching_relationships
CREATE POLICY "Coaches can view their own relationships"
    ON coaching_relationships FOR SELECT
    USING (auth.uid() = coach_id);

CREATE POLICY "Clients can view their own relationships"
    ON coaching_relationships FOR SELECT
    USING (auth.uid() = client_id);

CREATE POLICY "Coaches can create requests"
    ON coaching_relationships FOR INSERT
    WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Clients can update status"
    ON coaching_relationships FOR UPDATE
    USING (auth.uid() = client_id)
    WITH CHECK (auth.uid() = client_id);

-- Policies for viewing client data
-- We need to extend daily_logs and meal_entries policies to allow coaches
-- Since I don't have the full original migration, I'll add new policies

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

CREATE POLICY "Coaches can view client profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coaching_relationships
            WHERE coach_id = auth.uid()
            AND client_id = profiles.id
            AND status = 'approved'
        )
    );
