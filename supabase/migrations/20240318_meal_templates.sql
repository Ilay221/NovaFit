-- Create meal_templates table
CREATE TABLE public.meal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    items JSONB NOT NULL, -- Array of { foodItem, quantity }
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own templates" ON public.meal_templates
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON public.meal_templates
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.meal_templates
    FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.meal_templates
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meal_templates_updated_at
    BEFORE UPDATE ON public.meal_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
