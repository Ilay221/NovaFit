
-- Function to perform a hard reset for a user
-- This runs in a single transaction and wipes all user-related data
CREATE OR REPLACE FUNCTION public.hard_reset_user()
RETURNS void AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from all related tables
  -- Order: children first, then parents (though CASCADE should handle it, this is safer)
  
  -- 1. Chat
  DELETE FROM public.chat_messages WHERE user_id = uid;
  DELETE FROM public.chat_sessions WHERE user_id = uid;
  
  -- 2. Nutrition and Logs
  DELETE FROM public.meal_entries WHERE user_id = uid;
  DELETE FROM public.daily_logs WHERE user_id = uid;
  
  -- 3. Measurement and Stats
  DELETE FROM public.weight_entries WHERE user_id = uid;
  
  -- 4. Templates
  DELETE FROM public.meal_templates WHERE user_id = uid;
  
  -- 5. Infrastructure
  DELETE FROM public.push_subscriptions WHERE user_id = uid;
  
  -- 6. Connections (Coach/Trainee)
  DELETE FROM public.user_connections WHERE coach_id = uid OR trainee_id = uid;
  
  -- 7. Finally the profile
  DELETE FROM public.profiles WHERE id = uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.hard_reset_user() TO authenticated;
