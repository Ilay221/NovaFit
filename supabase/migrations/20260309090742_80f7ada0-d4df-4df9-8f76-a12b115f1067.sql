
-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.chat_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.chat_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.chat_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.chat_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);
CREATE INDEX idx_chat_sessions_user ON public.chat_sessions(user_id, updated_at DESC);
