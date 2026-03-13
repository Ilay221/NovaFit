
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS calorie_balance real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_calorie_target real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rollover_calories real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spread_days integer NOT NULL DEFAULT 0;
