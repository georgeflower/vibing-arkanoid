-- Drop old conflicting constraints on high_scores
ALTER TABLE public.high_scores DROP CONSTRAINT IF EXISTS player_name_length;
ALTER TABLE public.high_scores DROP CONSTRAINT IF EXISTS player_name_format;

-- Drop and re-add new constraint to match edge function validation (1-10 alphanumeric)
ALTER TABLE public.high_scores DROP CONSTRAINT IF EXISTS high_scores_player_name_length;
ALTER TABLE public.high_scores ADD CONSTRAINT high_scores_player_name_check CHECK (char_length(player_name) BETWEEN 1 AND 10 AND player_name ~ '^[A-Za-z0-9]+$');

-- Add matching constraint on boss_rush_scores
ALTER TABLE public.boss_rush_scores DROP CONSTRAINT IF EXISTS boss_rush_player_name_length;
ALTER TABLE public.boss_rush_scores ADD CONSTRAINT boss_rush_player_name_check CHECK (char_length(player_name) BETWEEN 1 AND 10 AND player_name ~ '^[A-Za-z0-9]+$');