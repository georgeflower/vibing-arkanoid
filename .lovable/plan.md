
## Plan: Fix Mega Boss Movement After Phase Transition

### Problem
After phase 1 of the Mega Boss is completed, both the ball and boss stop moving. The root cause is a runtime error when the game loop tries to access `BOSS_CONFIG[boss.type]` where `boss.type === "mega"`.

Since `BOSS_CONFIG` only contains entries for `"cube"`, `"sphere"`, and `"pyramid"`, accessing `BOSS_CONFIG["mega"]` returns `undefined`. When the code then tries to check `"superAngryMoveSpeed" in config`, it throws:

```
TypeError: right-hand side of 'in' should be an object, got undefined
```

This crashes the game loop, causing both the ball and boss to freeze.

---

### Solution
Add a check for the Mega Boss type before accessing `BOSS_CONFIG`, using `MEGA_BOSS_CONFIG` instead when the boss type is `"mega"`.

---

### Technical Changes

#### Change 1: Update Boss Movement Speed Lookup
**File: `src/components/Game.tsx`** (lines 5719-5727)

```typescript
// Before
} else {
  const config = BOSS_CONFIG[boss.type];
  const moveSpeed =
    boss.isSuperAngry && "superAngryMoveSpeed" in config
      ? config.superAngryMoveSpeed
      : boss.isAngry && "angryMoveSpeed" in config
        ? config.angryMoveSpeed
        : boss.speed;

// After
} else {
  // Use MEGA_BOSS_CONFIG for mega boss, otherwise use BOSS_CONFIG
  const isMegaType = boss.type === "mega";
  const moveSpeed = isMegaType
    ? (boss.isSuperAngry 
        ? MEGA_BOSS_CONFIG.veryAngryMoveSpeed 
        : boss.isAngry 
          ? MEGA_BOSS_CONFIG.angryMoveSpeed 
          : MEGA_BOSS_CONFIG.moveSpeed)
    : (() => {
        const config = BOSS_CONFIG[boss.type as 'cube' | 'sphere' | 'pyramid'];
        return boss.isSuperAngry && "superAngryMoveSpeed" in config
          ? config.superAngryMoveSpeed
          : boss.isAngry && "angryMoveSpeed" in config
            ? config.angryMoveSpeed
            : boss.speed;
      })();
```

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/Game.tsx` | Lines 5719-5727: Add mega boss type check before accessing `BOSS_CONFIG` |

---

### Required Import
Ensure `MEGA_BOSS_CONFIG` is imported at the top of Game.tsx (likely already imported based on other usages).

---

### Result
After this change:
- The Mega Boss will correctly use `MEGA_BOSS_CONFIG.moveSpeed` / `angryMoveSpeed` / `veryAngryMoveSpeed` during phase 2 and 3
- The runtime error will be eliminated
- Both the ball and boss will move correctly after phase transitions
