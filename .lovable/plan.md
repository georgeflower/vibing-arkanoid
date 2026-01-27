
## Plan: Fix Mega Boss Ball Collision Detection

### Problem
After changing the Mega Boss type from `"cube"` to `"mega"`, the ball collision detection is broken because the collision check on line 2753 only checks for `bossTarget.type === "cube"`. Since the Mega Boss now has type `"mega"`, it completely skips the collision block and the ball passes straight through.

**Why turrets work**: The bullet/turret code in `useBullets.ts` uses `isMegaBoss(boss)` which checks the `isMegaBoss: true` property rather than the `type` string, so it works correctly.

---

### Solution
Update the collision condition to include the new `"mega"` type alongside `"cube"`.

---

### Technical Change

**File: `src/components/Game.tsx`** (line 2753)

```typescript
// Before
if (bossTarget.type === "cube") {

// After
if (bossTarget.type === "cube" || bossTarget.type === "mega") {
```

This single change allows the Mega Boss circular hitbox collision logic (lines 2754-2804) to execute properly. The existing code already correctly handles:
- Level 20 detection via `const isMegaBoss = level === 20` (line 2755)
- Outer shield circular collision (lines 2787-2804)
- Inner shield circular collision (lines 2766-2784)
- Core exposed pass-through logic (lines 2936-2945)

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/Game.tsx` | Line 2753: Add `|| bossTarget.type === "mega"` to collision condition |

---

### Validation
After this change:
- Ball will properly collide with Mega Boss outer shield (circular hitbox)
- Ball will collide with inner shield after outer is destroyed
- Ball will pass through when core is exposed (existing logic)
- All 3 phases of Mega Boss ball collision will work correctly
