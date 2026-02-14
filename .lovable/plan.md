
# Fix: Pause-Aware Timers for Gravity, Boss Attacks, and Ball Timestamps

## Problem

Several timers use `performance.now()` or `Date.now()` but are not adjusted when the game pauses. This means time keeps "ticking" during pause, causing:

1. **Ball gravity timer** (`lastGravityResetTime`) -- gravity activates during pause, so after a long pause the ball immediately gets pulled down
2. **Boss attack cross-projectile timers** (`stopStartTime`, `nextCourseChangeTime`, `spawnTime`) -- cross attacks resume incorrectly after pause
3. **Ball `releasedFromBossTime`** -- the 2-second grace period for balls released from Mega Boss elapses during pause
4. **Boss `lastHitAt`** -- the 1-second damage cooldown elapses during pause, which is minor but technically incorrect
5. **Bonus letter `spawnTime`** -- affects sine wave position calculation, causing a visual jump after unpausing

## Solution

Add pause-duration adjustments to the resume block (lines 804-879 of Game.tsx) for all the missed timers:

### 1. Ball timestamps (gravity, released-from-boss, paddle hit cooldown)
On resume, shift `lastGravityResetTime`, `releasedFromBossTime`, and `lastPaddleHitTime` forward by `pauseDuration` for every ball.

### 2. Boss attack timestamps
On resume, shift `stopStartTime`, `nextCourseChangeTime`, and `spawnTime` forward by `pauseDuration` for every active boss attack.

### 3. Boss `lastHitAt`
On resume, shift `lastHitAt` forward by `pauseDuration` on the boss object (and any resurrected bosses).

### 4. Bonus letter `spawnTime`
On resume, shift `spawnTime` forward by `pauseDuration` for every active bonus letter.

## Technical details

### File: `src/components/Game.tsx`

In the resume block (after line 876, before `pauseStartTimeRef.current = null`), add adjustments:

```typescript
// Adjust ball timestamps to account for pause duration
setBalls(prev => prev.map(ball => ({
  ...ball,
  lastGravityResetTime: ball.lastGravityResetTime 
    ? ball.lastGravityResetTime + pauseDuration : ball.lastGravityResetTime,
  lastPaddleHitTime: ball.lastPaddleHitTime 
    ? ball.lastPaddleHitTime + pauseDuration : ball.lastPaddleHitTime,
  releasedFromBossTime: ball.releasedFromBossTime 
    ? ball.releasedFromBossTime + pauseDuration : ball.releasedFromBossTime,
  lastHitTime: ball.lastHitTime
    ? ball.lastHitTime + pauseDuration : ball.lastHitTime,
  lastWallHitTime: ball.lastWallHitTime
    ? ball.lastWallHitTime + pauseDuration : ball.lastWallHitTime,
})));

// Adjust boss lastHitAt
if (boss) {
  setBoss(prev => prev ? { ...prev, lastHitAt: (prev.lastHitAt || 0) + pauseDuration } : null);
}

// Adjust resurrected bosses
setResurrectedBosses(prev => prev.map(rb => ({
  ...rb,
  lastHitAt: (rb.lastHitAt || 0) + pauseDuration,
})));

// Adjust boss attack timestamps
setBossAttacks(prev => prev.map(attack => ({
  ...attack,
  stopStartTime: attack.stopStartTime ? attack.stopStartTime + pauseDuration : attack.stopStartTime,
  nextCourseChangeTime: attack.nextCourseChangeTime ? attack.nextCourseChangeTime + pauseDuration : attack.nextCourseChangeTime,
  spawnTime: attack.spawnTime ? attack.spawnTime + pauseDuration : attack.spawnTime,
})));

// Adjust bonus letter spawnTime (used for sine wave animation)
setBonusLetters(prev => prev.map(letter => ({
  ...letter,
  spawnTime: letter.spawnTime + pauseDuration,
})));
```

Note: The Mega Boss adjustments (danger balls, invulnerability, swarm spawn, etc.) are already handled correctly on lines 857-876. The `lastBossSpawnTime` and `lastEnemySpawnTime` are also already handled. This change covers the remaining gaps.

### Files changed
- **`src/components/Game.tsx`** -- Add timestamp adjustments in the pause-resume block for balls, boss attacks, boss hit cooldown, and bonus letters
