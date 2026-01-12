-- Create a table for Boss Rush high scores with completion time tracking
CREATE TABLE public.boss_rush_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name TEXT NOT NULL,
  score INTEGER NOT NULL,
  completion_time_ms INTEGER NOT NULL, -- Time in milliseconds to complete all bosses
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.boss_rush_scores ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (anyone can view leaderboard)
CREATE POLICY "Boss rush scores are viewable by everyone" 
ON public.boss_rush_scores 
FOR SELECT 
USING (true);

-- Create policy for public insert (anyone can submit a score)
CREATE POLICY "Anyone can submit a boss rush score" 
ON public.boss_rush_scores 
FOR INSERT 
WITH CHECK (true);

-- Create index for fast ordering by completion time
CREATE INDEX idx_boss_rush_scores_time ON public.boss_rush_scores (completion_time_ms ASC);

-- Create index for ordering by score
CREATE INDEX idx_boss_rush_scores_score ON public.boss_rush_scores (score DESC);