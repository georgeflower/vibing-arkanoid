import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LeaderboardType = 'all-time' | 'weekly' | 'daily';

export interface HighScore {
  id?: string;
  name: string;
  score: number;
  level: number;
  difficulty?: string;
  beatLevel50?: boolean;
  startingLives?: number;
  createdAt?: string;
}

const MAX_HIGH_SCORES = 20;

export const useHighScores = (leaderboardType: LeaderboardType = 'all-time') => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHighScores = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('high_scores')
        .select('*')
        .order('starting_lives', { ascending: true })
        .order('score', { ascending: false })
        .limit(MAX_HIGH_SCORES);

      // Apply time filters based on leaderboard type
      if (leaderboardType === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        query = query.gte('created_at', weekAgo.toISOString());
      } else if (leaderboardType === 'daily') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        query = query.gte('created_at', today.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const scores: HighScore[] = (data || []).map(row => ({
        id: row.id,
        name: row.player_name,
        score: row.score,
        level: row.level,
        difficulty: row.difficulty || undefined,
        beatLevel50: row.beat_level_50 || undefined,
        startingLives: row.starting_lives || undefined,
        createdAt: row.created_at,
      }));

      setHighScores(scores);
    } catch (err) {
      console.error('Failed to fetch high scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to load high scores');
      toast.error('Failed to load high scores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHighScores();
  }, [leaderboardType]);

  const isHighScore = async (score: number): Promise<boolean> => {
    // Score of 0 or less never qualifies
    if (score <= 0) return false;
    
    try {
      const now = new Date();
      
      // Check daily (scores from today)
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      
      const { count: dailyHigherCount, error: dailyError } = await supabase
        .from('high_scores')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .gte('score', score);
      
      if (dailyError) throw dailyError;
      
      // If fewer than 20 scores higher or equal today, qualifies for daily
      if ((dailyHigherCount || 0) < MAX_HIGH_SCORES) return true;
      
      // Check weekly (scores from past 7 days)
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: weeklyHigherCount, error: weeklyError } = await supabase
        .from('high_scores')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString())
        .gte('score', score);
      
      if (weeklyError) throw weeklyError;
      
      // If fewer than 20 scores higher or equal this week, qualifies for weekly
      if ((weeklyHigherCount || 0) < MAX_HIGH_SCORES) return true;
      
      // Check all-time
      const { count: allTimeHigherCount, error: allTimeError } = await supabase
        .from('high_scores')
        .select('*', { count: 'exact', head: true })
        .gte('score', score);
      
      if (allTimeError) throw allTimeError;
      
      // If fewer than 20 scores higher or equal all-time, qualifies
      return (allTimeHigherCount || 0) < MAX_HIGH_SCORES;
      
    } catch (err) {
      console.error('Failed to check high score:', err);
      return false;
    }
  };

  const addHighScore = async (
    name: string,
    score: number,
    level: number,
    difficulty?: string,
    beatLevel50?: boolean,
    startingLives?: number
  ) => {
    try {
      // Rate limiting: prevent submissions more than once per 30 seconds
      const lastSubmissionKey = 'lastHighScoreSubmission';
      const lastSubmission = sessionStorage.getItem(lastSubmissionKey);
      const now = Date.now();
      
      if (lastSubmission) {
        const timeSinceLastSubmission = now - parseInt(lastSubmission, 10);
        const cooldownMs = 30000; // 30 seconds
        
        if (timeSinceLastSubmission < cooldownMs) {
          const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastSubmission) / 1000);
          toast.error(`Please wait ${remainingSeconds} seconds before submitting another score`);
          throw new Error('Rate limit exceeded');
        }
      }

      const { error: insertError } = await supabase
        .from('high_scores')
        .insert({
          player_name: name,
          score,
          level,
          difficulty,
          beat_level_50: beatLevel50,
          starting_lives: startingLives,
        });

      if (insertError) throw insertError;

      // Record successful submission time
      sessionStorage.setItem(lastSubmissionKey, now.toString());

      toast.success('High score submitted!');
      
      await fetchHighScores();
    } catch (err) {
      console.error('Failed to add high score:', err);
      if (err instanceof Error && err.message !== 'Rate limit exceeded') {
        toast.error('Failed to submit high score');
      }
      throw err;
    }
  };

  const clearHighScores = () => {
    console.warn('clearHighScores: Not available for cloud storage');
    toast.error('Cannot clear cloud high scores');
  };

  return {
    highScores,
    isHighScore,
    addHighScore,
    clearHighScores,
    isLoading,
    error,
    refetch: fetchHighScores,
  };
};
