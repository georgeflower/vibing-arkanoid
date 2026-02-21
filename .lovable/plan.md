

# Fix: Shield Not Blocking Bombs at High Speed (Godlike Mode)

## Root Cause

The bomb-shield collision uses a **separate, narrower hitbox** than the bomb-damage collision:

- **Shield zone**: A thin 10px strip just *above* the paddle (`paddle.y - 10` to `paddle.y`)
- **Damage zone**: The full paddle body (`paddle.y` to `paddle.y + paddle.height`)

At high speeds in Godlike mode, a bomb can travel more than 10 pixels per frame and skip past the shield zone entirely, landing directly in the damage zone. The shield never gets a chance to block it.

## Fix

**File: `src/components/Game.tsx`** (around line 4355)

Expand the bomb-shield collision zone to cover the **same area as the damage zone**, so the shield check always runs before the damage check. Change:

```
const bombHitsShieldZone =
  bomb.x + bomb.width > paddle.x &&
  bomb.x < paddle.x + paddle.width &&
  bomb.y + bomb.height > paddle.y - 10 &&
  bomb.y < paddle.y;
```

To:

```
const bombHitsShieldZone =
  bomb.x + bomb.width > paddle.x &&
  bomb.x < paddle.x + paddle.width &&
  bomb.y + bomb.height > paddle.y - 10 &&
  bomb.y < paddle.y + paddle.height;
```

This makes the shield zone encompass the entire paddle, so a bomb that overlaps the paddle in any way will be caught by the shield first. The damage check below is already guarded by `return` statements in the shield/reflect branches, so it won't double-trigger.

## Files Changed

| File | Change |
|---|---|
| `src/components/Game.tsx` | Expand `bombHitsShieldZone` bottom boundary from `paddle.y` to `paddle.y + paddle.height` |

This is a one-line fix that prevents the tunneling issue at any speed.

