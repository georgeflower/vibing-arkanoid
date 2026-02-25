
# Reduce Dual Power-Up Gap and Zero-Allocation Renderer

## Changes

### 1. Reduce gap to 2.0x paddle width (`src/hooks/usePowerUps.ts`)
Line 113: change `PADDLE_WIDTH * 2.5` to `PADDLE_WIDTH * 2.0`.

### 2. Zero per-frame allocations in renderer (`src/engine/canvasRenderer.ts`)

The current code (lines 773-805) allocates a `new Set<string>()` and creates string keys via concatenation every frame. This violates the project's zero-allocation philosophy.

**Fix:**
- Add a module-level `Set<number>` (reusable, cleared each frame instead of re-created)
- Replace the string key `"min-max"` with a numeric key using Cantor pairing: `((a + b) * (a + b + 1)) / 2 + b` where `a = Math.min(id1, id2)` and `b = Math.max(id1, id2)`. This produces a unique integer for each unordered pair -- zero string allocations
- Replace the `.find()` linear scan with an indexed lookup: since `pairedWithId` directly gives us the target ID, build a quick ID-to-index map once at the start of the power-up render block (only when dual-choice power-ups exist), or simply iterate and match inline

Actually, `.find()` is only called once per pair (max 1-2 pairs on screen), so the cost is negligible. The main wins are eliminating the Set allocation and string keys.

**Module-level additions:**
```typescript
const _drawnPairs = new Set<number>();
```

**Per-frame code becomes:**
```typescript
_drawnPairs.clear();
powerUps.forEach((pu) => {
  if (!pu.active || !pu.isDualChoice || pu.pairedWithId === undefined) return;
  const a = Math.min(pu.id!, pu.pairedWithId);
  const b = Math.max(pu.id!, pu.pairedWithId);
  const pairKey = ((a + b) * (a + b + 1)) / 2 + b; // Cantor pairing
  if (_drawnPairs.has(pairKey)) return;
  _drawnPairs.add(pairKey);
  // ... rest unchanged
});
```

### Files Modified
- `src/hooks/usePowerUps.ts` -- gap multiplier 2.5 to 2.0
- `src/engine/canvasRenderer.ts` -- module-level Set + numeric Cantor pair key
