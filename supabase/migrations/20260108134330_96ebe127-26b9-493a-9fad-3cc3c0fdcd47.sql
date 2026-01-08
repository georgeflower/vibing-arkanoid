-- Add column to track if player collected all bonus letters
ALTER TABLE public.high_scores 
ADD COLUMN collected_all_letters boolean DEFAULT false;