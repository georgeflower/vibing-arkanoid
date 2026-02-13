
-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "Anyone can submit high scores" ON public.high_scores;
DROP POLICY IF EXISTS "Anyone can submit a boss rush score" ON public.boss_rush_scores;

-- Create restrictive INSERT policies that only allow service_role (edge functions)
CREATE POLICY "Only backend can insert high scores"
ON public.high_scores
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only backend can insert boss rush scores"
ON public.boss_rush_scores
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add constraints for input validation
ALTER TABLE public.high_scores ADD CONSTRAINT high_scores_player_name_length CHECK (char_length(player_name) BETWEEN 1 AND 10);
ALTER TABLE public.high_scores ADD CONSTRAINT high_scores_score_positive CHECK (score >= 0);
ALTER TABLE public.high_scores ADD CONSTRAINT high_scores_level_positive CHECK (level >= 0);

ALTER TABLE public.boss_rush_scores ADD CONSTRAINT boss_rush_player_name_length CHECK (char_length(player_name) BETWEEN 1 AND 10);
ALTER TABLE public.boss_rush_scores ADD CONSTRAINT boss_rush_score_positive CHECK (score >= 0);
ALTER TABLE public.boss_rush_scores ADD CONSTRAINT boss_rush_time_positive CHECK (completion_time_ms >= 0);
