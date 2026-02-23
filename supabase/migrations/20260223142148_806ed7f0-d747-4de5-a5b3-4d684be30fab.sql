
-- Add game_mode column to high_scores to distinguish campaign vs boss_rush entries
ALTER TABLE public.high_scores ADD COLUMN game_mode text DEFAULT 'campaign';
