
## Plan: Add Unique "mega" Type Identifier for Mega Boss

### Problem
The Mega Boss currently uses `type: 'cube'`, causing it to be treated as a Level 5 cube boss in several game logic paths. When the Mega Boss core is exposed and `currentHealth` is set to `0` (to show an empty health bar), the game incorrectly triggers the cube boss defeat sequence, advancing to level 21.

---

### Solution Overview
Add `"mega"` to the `BossType` union and update the Mega Boss to use this new type. Then update all code paths that check `boss.type` to handle the new type correctly.

---

### Technical Changes

#### Change 1: Extend BossType Union
**File: `src/types/game.ts`** (line 155)

```typescript
// Before
export type BossType = "cube" | "sphere" | "pyramid";

// After
export type BossType = "cube" | "sphere" | "pyramid" | "mega";
```

---

#### Change 2: Assign "mega" Type to Mega Boss
**File: `src/utils/megaBossUtils.ts`** (line 65)

```typescript
// Before
type: 'cube', // Visual type - we'll render it differently

// After
type: 'mega', // Unique type identifier for Mega Boss
```

---

#### Change 3: Update Defeat Callback Signature
**File: `src/hooks/useBullets.ts`** (line 22)

```typescript
// Before
onBossDefeated?: (bossType: 'cube' | 'sphere' | 'pyramid', boss: Boss) => void,

// After  
onBossDefeated?: (bossType: 'cube' | 'sphere' | 'pyramid' | 'mega', boss: Boss) => void,
```

---

#### Change 4: Skip Regular Defeat Logic for Mega Boss in Ball Collision
**File: `src/components/Game.tsx`** (lines 3092-3093)

Add an early return for mega boss in the regular defeat check:

```typescript
if (newHealth <= 0) {
  // Mega Boss has its own defeat logic via danger ball system - skip regular defeat
  if (prev.type === "mega") {
    // Already handled by Mega Boss specific code above
    return prev;
  }
  if (prev.type === "cube") {
    // Cube boss - simple defeat
    // ... existing code
  }
```

---

#### Change 5: Update Bullet Collision Defeat Check
**File: `src/hooks/useBullets.ts`** (lines 213-215)

Add mega boss check before cube defeat logic:

```typescript
if (newHealth <= 0) {
  // Mega Boss is never defeated by bullets directly
  if (prev.type === "mega") {
    return prev; // Mega boss defeat handled elsewhere
  }
  if (prev.type === "cube") {
    onBossDefeated?.("cube", prev);
    return null;
  }
```

---

#### Change 6: Update Reflected Attack Defeat Check
**File: `src/components/Game.tsx`** (lines 6444-6448)

Add mega boss exclusion:

```typescript
if (newHealth <= 0) {
  // Skip defeat for Mega Boss - it has its own defeat system
  if (isMegaBoss(prevBoss)) {
    return prevBoss;
  }
  // Boss defeated - play explosion effects
  soundManager.playExplosion();
```

---

#### Change 7: Update Reflected Bomb Defeat Check
**File: `src/components/Game.tsx`** (lines 7060-7062)

Add mega boss exclusion:

```typescript
if (newHealth <= 0) {
  // Mega Boss cannot be defeated by reflected bombs
  if (prevBoss.type === "mega") {
    return prevBoss;
  }
  if (prevBoss.type === "cube") {
```

---

#### Change 8: Update Idle Spin Animation Check
**File: `src/components/Game.tsx`** (line 5739)

Keep cube boss spin separate from mega boss (mega boss already has its own rotation):

```typescript
// Before
if (boss && boss.type === 'cube' && boss.phase === 'attacking' && !boss.isStunned) {

// After - no change needed, now naturally excludes mega boss
```

---

#### Change 9: Update Enemy Spawn Type Fallback
**File: `src/components/Game.tsx`** (line 7828)

Already correctly handles level 20 separately, but ensure mega type doesn't break enemy spawning:

```typescript
// Existing code already works - level 20 uses random enemy types
const enemyType = level === 20 ? enemyTypes[Math.floor(Math.random() * enemyTypes.length)] : boss.type;
```

For safety, add a fallback in case boss.type is 'mega':

```typescript
const enemyType = level === 20 
  ? enemyTypes[Math.floor(Math.random() * enemyTypes.length)] 
  : (boss.type === 'mega' ? 'cube' : boss.type);
```

---

#### Change 10: Update Debug Hitbox Rendering
**File: `src/components/GameCanvas.tsx`** (lines 2839-2851)

The Mega Boss already has special rendering before this code path, so no change needed - it returns early for mega boss.

---

#### Change 11: Update Particle Colors (optional enhancement)
**File: `src/utils/particlePool.ts`** (line 6-12)

Add mega boss particle colors:

```typescript
const COLOR_PALETTES: Record<EnemyType | 'brick' | 'default' | 'mega', string[]> = {
  cube: ["hsl(200, 100%, 60%)", "hsl(180, 100%, 50%)", "hsl(220, 100%, 70%)"],
  sphere: ["hsl(330, 100%, 60%)", "hsl(350, 100%, 65%)", "hsl(310, 100%, 55%)"],
  pyramid: ["hsl(280, 100%, 60%)", "hsl(260, 100%, 65%)", "hsl(300, 100%, 55%)"],
  mega: ["hsl(30, 100%, 60%)", "hsl(50, 100%, 50%)", "hsl(10, 100%, 70%)"], // Orange/red theme
  crossBall: ["hsl(30, 100%, 60%)", "hsl(15, 100%, 55%)", "hsl(45, 100%, 65%)"],
  brick: ["hsl(40, 100%, 60%)", "hsl(30, 100%, 55%)", "hsl(50, 100%, 65%)"],
  default: ["hsl(0, 0%, 100%)", "hsl(0, 0%, 80%)", "hsl(0, 0%, 90%)"]
};
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/game.ts` | Add "mega" to BossType union |
| `src/utils/megaBossUtils.ts` | Change type from 'cube' to 'mega' |
| `src/hooks/useBullets.ts` | Update callback signature + add mega check |
| `src/components/Game.tsx` | Add mega exclusions in 3-4 defeat checks |
| `src/utils/particlePool.ts` | Add mega color palette (optional) |

---

### Result
After these changes, the Mega Boss will have its own unique type `"mega"` that prevents it from triggering the cube boss defeat logic. The game will only advance to level 21 when the Mega Boss is properly defeated through its 3-phase danger ball system.
