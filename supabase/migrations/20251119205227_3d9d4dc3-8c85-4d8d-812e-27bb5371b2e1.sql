-- Add server-side validation constraints for player_name field
-- This prevents bypassing client-side 3-character validation via direct API calls

-- Enforce length constraint (1-3 characters)
ALTER TABLE high_scores 
ADD CONSTRAINT player_name_length 
CHECK (char_length(player_name) >= 1 AND char_length(player_name) <= 3);

-- Enforce alphanumeric uppercase format
ALTER TABLE high_scores 
ADD CONSTRAINT player_name_format 
CHECK (player_name ~ '^[A-Z0-9]{1,3}$');