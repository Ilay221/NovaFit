
-- Enable DELETE policies for hard reset
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can delete own logs" ON public.daily_logs
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight entries" ON public.weight_entries
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Ensure chat sessions and messages can be deleted
-- (They might already have policies, but let's be sure for hard reset)
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own chat sessions" ON public.chat_sessions
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Note: user_connections already has a delete policy from 20240318_coach_trainee.sql
-- meal_templates already has a delete policy from 20240318_meal_templates.sql
-- push_subscriptions already has a delete policy from 20240314_push_subs.sql
