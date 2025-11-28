# High Score System

Complete documentation of the cloud-based leaderboard system using Supabase (Lovable Cloud).

---

## Overview

The game features three leaderboards: all-time, weekly, and daily. High scores are stored in a Supabase database and synced across all players globally.

**Hook**: `src/hooks/useHighScores.ts`  
**Backend**: Supabase (Lovable Cloud)

---

## Database Schema

### Table: `high_scores`

```sql
CREATE TABLE public.high_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,           -- 3-character initials
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,              -- Level reached
  difficulty TEXT,                     -- 'easy' | 'normal' | 'hard'
  starting_lives INTEGER,
  beat_level_50 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Indexes

```sql
-- Score index for fast sorting
CREATE INDEX idx_high_scores_score ON high_scores(score DESC);

-- Created_at index for time-based queries
CREATE INDEX idx_high_scores_created_at ON high_scores(created_at DESC);

-- Composite index for leaderboard queries
CREATE INDEX idx_high_scores_leaderboard ON high_scores(score DESC, created_at DESC);
```

---

## Row Level Security (RLS)

### Policy: Public Read

```sql
CREATE POLICY "high_scores_public_read" 
ON public.high_scores 
FOR SELECT 
USING (true);
```

All scores are publicly readable.

### Policy: Public Insert

```sql
CREATE POLICY "high_scores_public_insert" 
ON public.high_scores 
FOR INSERT 
WITH CHECK (true);
```

Anyone can submit a high score (no authentication required).

---

## Leaderboard Types

### All-Time Leaderboard

Top 20 scores of all time:

```sql
SELECT * FROM high_scores
ORDER BY score DESC
LIMIT 20;
```

### Weekly Leaderboard

Top 20 scores from the last 7 days:

```sql
SELECT * FROM high_scores
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY score DESC
LIMIT 20;
```

### Daily Leaderboard

Top 20 scores from the last 24 hours:

```sql
SELECT * FROM high_scores
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY score DESC
LIMIT 20;
```

---

## `useHighScores` Hook

### Return Value

```typescript
interface UseHighScoresReturn {
  highScores: {
    allTime: HighScore[];
    weekly: HighScore[];
    daily: HighScore[];
  };
  topScores: {
    daily: HighScore | null;
    weekly: HighScore | null;
    allTime: HighScore | null;
  };
  loading: boolean;
  error: string | null;
  submitHighScore: (score: HighScoreSubmission) => Promise<void>;
  isHighScore: (score: number) => boolean;
  refreshScores: () => Promise<void>;
}
```

### State Management

```typescript
const [highScores, setHighScores] = useState({
  allTime: [],
  weekly: [],
  daily: []
});

const [topScores, setTopScores] = useState({
  daily: null,
  weekly: null,
  allTime: null
});

const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
```

---

## Fetching Scores

### Implementation

```typescript
const fetchHighScores = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    // All-time scores
    const { data: allTimeData, error: allTimeError } = await supabase
      .from('high_scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(20);
    
    if (allTimeError) throw allTimeError;
    
    // Weekly scores (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { data: weeklyData, error: weeklyError } = await supabase
      .from('high_scores')
      .select('*')
      .gte('created_at', weekAgo.toISOString())
      .order('score', { ascending: false })
      .limit(20);
    
    if (weeklyError) throw weeklyError;
    
    // Daily scores (last 24 hours)
    const dayAgo = new Date();
    dayAgo.setHours(dayAgo.getHours() - 24);
    
    const { data: dailyData, error: dailyError } = await supabase
      .from('high_scores')
      .select('*')
      .gte('created_at', dayAgo.toISOString())
      .order('score', { ascending: false })
      .limit(20);
    
    if (dailyError) throw dailyError;
    
    setHighScores({
      allTime: allTimeData || [],
      weekly: weeklyData || [],
      daily: dailyData || []
    });
    
    setTopScores({
      allTime: allTimeData?.[0] || null,
      weekly: weeklyData?.[0] || null,
      daily: dailyData?.[0] || null
    });
  } catch (err) {
    console.error('Error fetching high scores:', err);
    setError('Failed to load high scores');
  } finally {
    setLoading(false);
  }
}, []);
```

### Automatic Refresh

```typescript
useEffect(() => {
  fetchHighScores();
  
  // Refresh every 5 minutes
  const interval = setInterval(fetchHighScores, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
}, [fetchHighScores]);
```

---

## Submitting High Scores

### Score Qualification

A score qualifies if it ranks in the top 20 of ANY leaderboard:

```typescript
const isHighScore = useCallback((score: number): boolean => {
  if (score <= 0) return false;
  
  // Check all-time
  const qualifiesAllTime = 
    highScores.allTime.length < 20 || 
    score > (highScores.allTime[19]?.score || 0);
  
  // Check weekly
  const qualifiesWeekly = 
    highScores.weekly.length < 20 || 
    score > (highScores.weekly[19]?.score || 0);
  
  // Check daily
  const qualifiesDaily = 
    highScores.daily.length < 20 || 
    score > (highScores.daily[19]?.score || 0);
  
  return qualifiesAllTime || qualifiesWeekly || qualifiesDaily;
}, [highScores]);
```

### Submission Flow

```typescript
const submitHighScore = useCallback(async (submission: HighScoreSubmission) => {
  try {
    const { error } = await supabase
      .from('high_scores')
      .insert({
        player_name: submission.playerName,
        score: submission.score,
        level: submission.level,
        difficulty: submission.difficulty,
        starting_lives: submission.startingLives,
        beat_level_50: submission.level >= 50
      });
    
    if (error) throw error;
    
    // Refresh leaderboards after submission
    await fetchHighScores();
    
    toast.success('High score submitted!');
  } catch (err) {
    console.error('Error submitting high score:', err);
    toast.error('Failed to submit high score');
  }
}, [fetchHighScores]);
```

---

## Game Over Flow

### 1. Check High Score Eligibility

```typescript
// In Game.tsx when game ends
const handleGameOver = () => {
  const { isHighScore } = useHighScores();
  
  if (isHighScore(score) && !isLevelSkipper) {
    setGameState('highScoreEntry'); // Show initial entry form
  } else {
    setGameState('statistics'); // Skip to statistics
  }
};
```

### 2. High Score Entry Screen

**Component**: `src/components/HighScoreEntry.tsx`

Player enters 3-character initials:

```typescript
const [initials, setInitials] = useState(['A', 'A', 'A']);
const [selectedIndex, setSelectedIndex] = useState(0);

const handleSubmit = () => {
  submitHighScore({
    playerName: initials.join(''),
    score,
    level: currentLevel,
    difficulty,
    startingLives: 3 // or godMode ? 999 : startingLives
  });
  
  setGameState('highScoreDisplay'); // Show leaderboard
};
```

**Features**:
- Keyboard input (A-Z, 0-9)
- Backspace to go back
- Enter to submit
- Celebration particle effects
- Pulsing background glow
- Trophy icon

### 3. High Score Display

**Component**: `src/components/HighScoreDisplay.tsx`

Shows all three leaderboards with tabs:

```typescript
<div className="high-score-display">
  <Tabs value={selectedTab} onValueChange={setSelectedTab}>
    <TabsList>
      <TabsTrigger value="alltime">ALL-TIME</TabsTrigger>
      <TabsTrigger value="weekly">WEEKLY</TabsTrigger>
      <TabsTrigger value="daily">DAILY</TabsTrigger>
    </TabsList>
    
    <TabsContent value="alltime">
      <ScoreList scores={highScores.allTime} />
    </TabsContent>
    
    <TabsContent value="weekly">
      <ScoreList scores={highScores.weekly} />
    </TabsContent>
    
    <TabsContent value="daily">
      <ScoreList scores={highScores.daily} />
    </TabsContent>
  </Tabs>
  
  <button onClick={() => setGameState('statistics')}>
    CONTINUE
  </button>
</div>
```

### 4. Statistics Screen

**Component**: `src/components/EndScreen.tsx`

Shows final game statistics with animated counters. "HIGH SCORES" button returns to high score display.

---

## Top Scores Marquee

**Component**: `src/components/TopScoresDisplay.tsx`

Displays on main menu, cycling through all three leaderboards:

```typescript
const [displayMode, setDisplayMode] = useState<'daily' | 'weekly' | 'alltime'>('daily');
const [isScrolling, setIsScrolling] = useState(false);

useEffect(() => {
  const cycleInterval = setInterval(() => {
    setIsScrolling(true);
    
    // Wait 3 seconds for scroll animation
    setTimeout(() => {
      setDisplayMode(prev => {
        if (prev === 'daily') return 'weekly';
        if (prev === 'weekly') return 'alltime';
        return 'daily';
      });
      setIsScrolling(false);
    }, 3000);
  }, 8000); // 5 sec static + 3 sec scroll
  
  return () => clearInterval(cycleInterval);
}, []);
```

**Display Format**:
```
DAILY: QUM 000370
   ↓ (3-second horizontal scroll)
WEEKLY: QUM 065670
   ↓ (3-second horizontal scroll)
ALL-TIME: QUM 065670
   ↓ (cycle back to daily)
```

**Styling**:
- Amber LED text (retro pinball aesthetic)
- Monospace pixel font
- Dark background with border
- Random LED flicker during transitions

---

## Disqualifications

### Level Skippers

Players who skip levels (pressing `0` key) are disqualified:

```typescript
const [isLevelSkipper, setIsLevelSkipper] = useState(false);

// In level skip handler
const skipLevel = () => {
  setIsLevelSkipper(true);
  nextLevel();
};

// On game over
if (isLevelSkipper) {
  // Show "LEVEL SKIPPER! CHEATER" message
  // Skip high score entry
}
```

### God Mode

God mode players are not disqualified but have a badge:

```typescript
const submitHighScore = (submission: HighScoreSubmission) => {
  // God mode badge can be added to difficulty field
  const difficultyLabel = godMode ? 'god' : submission.difficulty;
  
  await supabase
    .from('high_scores')
    .insert({
      ...submission,
      difficulty: difficultyLabel
    });
};
```

---

## Rate Limiting

### Client-Side Protection

```typescript
let lastSubmissionTime = 0;
const SUBMISSION_COOLDOWN = 5000; // 5 seconds

const submitHighScore = async (submission: HighScoreSubmission) => {
  const now = Date.now();
  if (now - lastSubmissionTime < SUBMISSION_COOLDOWN) {
    toast.error('Please wait before submitting again');
    return;
  }
  
  lastSubmissionTime = now;
  // ... submit to Supabase
};
```

### Server-Side Protection (Future)

Implement RLS policy with rate limiting:

```sql
-- Example: Limit to 10 submissions per IP per hour
CREATE POLICY "high_scores_rate_limit" 
ON public.high_scores 
FOR INSERT 
WITH CHECK (
  (SELECT COUNT(*) FROM high_scores 
   WHERE created_at > NOW() - INTERVAL '1 hour'
   AND inet_client_addr() = inet_client_addr()) < 10
);
```

---

## Data Migration

### Initial State

No scores exist initially. Leaderboards start empty.

### Local Storage Migration (Not Implemented)

Old local storage scores are NOT migrated to cloud. Players start fresh with the new system.

### Future Export/Import

Allow players to export their scores:

```typescript
const exportScores = async () => {
  const { data, error } = await supabase
    .from('high_scores')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (data) {
    const json = JSON.stringify(data, null, 2);
    downloadFile('high_scores.json', json);
  }
};
```

---

## Error Handling

### Network Errors

```typescript
try {
  const { data, error } = await supabase.from('high_scores').select('*');
  
  if (error) throw error;
  
  setHighScores(data);
} catch (err) {
  console.error('Network error:', err);
  
  // Show cached scores if available
  const cached = localStorage.getItem('cached_high_scores');
  if (cached) {
    setHighScores(JSON.parse(cached));
  }
  
  toast.error('Failed to load high scores. Showing cached data.');
}
```

### Submission Failures

```typescript
try {
  await submitHighScore(submission);
} catch (err) {
  // Retry once
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  try {
    await submitHighScore(submission);
  } catch (retryErr) {
    // Save to local storage for later retry
    const pending = JSON.parse(localStorage.getItem('pending_scores') || '[]');
    pending.push(submission);
    localStorage.setItem('pending_scores', JSON.stringify(pending));
    
    toast.error('Score saved locally. Will retry when online.');
  }
}
```

---

## Performance Considerations

### Caching

Cache high scores to reduce Supabase queries:

```typescript
useEffect(() => {
  const cached = localStorage.getItem('cached_high_scores');
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    
    // Use cache if less than 5 minutes old
    if (Date.now() - timestamp < 5 * 60 * 1000) {
      setHighScores(data);
      setLoading(false);
      return;
    }
  }
  
  fetchHighScores();
}, []);

// After fetching
useEffect(() => {
  if (!loading && !error) {
    localStorage.setItem('cached_high_scores', JSON.stringify({
      data: highScores,
      timestamp: Date.now()
    }));
  }
}, [loading, error, highScores]);
```

### Pagination (Future)

For more than 20 scores:

```typescript
const { data, error } = await supabase
  .from('high_scores')
  .select('*')
  .order('score', { ascending: false })
  .range(0, 19);  // First 20

// Load more
const { data: nextPage } = await supabase
  .from('high_scores')
  .select('*')
  .order('score', { ascending: false })
  .range(20, 39); // Next 20
```

---

## Security Considerations

### Input Validation

```typescript
const submitHighScore = async (submission: HighScoreSubmission) => {
  // Validate initials (3 alphanumeric characters)
  if (!/^[A-Z0-9]{3}$/.test(submission.playerName)) {
    toast.error('Invalid initials');
    return;
  }
  
  // Validate score (positive integer, reasonable max)
  if (submission.score <= 0 || submission.score > 999999999) {
    toast.error('Invalid score');
    return;
  }
  
  // Validate level (1-50)
  if (submission.level < 1 || submission.level > 50) {
    toast.error('Invalid level');
    return;
  }
  
  // Submit to Supabase
  await supabase.from('high_scores').insert(submission);
};
```

### Cheating Prevention

1. **Server-side validation**: Use Supabase functions to validate scores
2. **Checksum**: Include checksum of game state with submission
3. **Replay validation**: Store game replay data for verification
4. **Statistical analysis**: Flag outlier scores for review

---

## Related Files

- `src/hooks/useHighScores.ts` - High score hook
- `src/components/HighScoreEntry.tsx` - Initial entry form
- `src/components/HighScoreDisplay.tsx` - Leaderboard display
- `src/components/TopScoresDisplay.tsx` - Main menu marquee
- `src/integrations/supabase/client.ts` - Supabase client
- `src/integrations/supabase/types.ts` - Database types

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
