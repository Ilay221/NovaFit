-- Migration for adding chat_harshness and coach_name
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS chat_harshness TEXT DEFAULT 'בינוני',
ADD COLUMN IF NOT EXISTS coach_name TEXT DEFAULT 'NovaFit AI';
