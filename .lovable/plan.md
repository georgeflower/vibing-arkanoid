
# Fix Boss `lastHitAt` Same-Frame Double-Hit

## Problem

In `src/engine/physics.ts` line 393-395, the cooldown check reads `bossTarget.lastHitAt` but never writes it back after a successful hit. If multiple balls collide with the boss in the same frame, they all pass the cooldown check and register damage -- because `lastHitAt` is only updated later in `Game.tsx` via an async React state setter.

## Fix

Add `bossTarget.lastHitAt = nowMs;` on line 422 (after pushing the hit event), directly mutating the `world` singleton's boss object. This ensures subsequent balls in the same frame see the updated timestamp and fail the cooldown check.

### Change in `src/engine/physics.ts`

At line 422, after the `result.bossHits.push(...)` block:

```typescript
        result.bossHits.push({
          isMainBoss: bossTarget === world.boss,
          bossId: bossTarget.id,
          canDamage: true,
          nowMs,
          ballId: ball.id,
        });

+       // Write cooldown immediately so other balls in this frame can't double-hit
+       bossTarget.lastHitAt = nowMs;

        // Sound and screen shake
        result.soundsToPlay.push({ type: "bossHit" });
```

One line added. No other files changed.

## Also: Clean up dead `_hitBossThisFrame` flag

Line 390 sets `(ball as any)._hitBossThisFrame = true` but nothing reads it. Remove this line to eliminate dead code.

## Files changed

| File | Change |
|------|--------|
| `src/engine/physics.ts` | Add `bossTarget.lastHitAt = nowMs` after hit event push; remove dead `_hitBossThisFrame` assignment |
