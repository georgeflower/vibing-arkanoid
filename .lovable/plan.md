
# Update Changelog to v0.9.96 and README

## Summary

Two files need updating:

1. `src/constants/version.ts` — bump `GAME_VERSION` to `"0.9.96"` and prepend a new changelog entry
2. `README.md` — update the version badge in line 5 from `v0.9.95` to `v0.9.96`

---

## Changes

### `src/constants/version.ts`

- Change line 1: `export const GAME_VERSION = "0.9.96";`
- Insert a new entry at the top of the `CHANGELOG` array (before the existing `0.9.95` entry):

```typescript
{
  version: "0.9.96",
  changes: [
    "Fixed: turret bullets intermittently travelling at double speed on shots after the first — root cause was React state array desync; world.bullets and React state diverged on every reset, reflect-shield, and shield-absorb call",
    "Fix: removed useState entirely from bullet management — bullets now live exclusively in world.bullets (same pattern as balls, bricks, paddle); fireBullets pushes directly, updateBullets mutates in-place, all resets write world.bullets directly",
    "Refactor: replaced all remaining setState(prev => { mutate; return prev }) in-place patterns with direct world loops for balls (rotation/attach), enemies, bombs, and bonus letters — eliminates stale-closure risk across all moving entities",
    "Cleanup: removed ~100 stale '// removed' noise comments left over from previous refactoring sessions in canvasRenderer.ts and Game.tsx",
  ],
},
```

### `README.md`

- Change line 5: `**[▶ Play Now](https://vibing-arkanoid.lovable.app)** · **v0.9.96**`

No other lines in either file change.
