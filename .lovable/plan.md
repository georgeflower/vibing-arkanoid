

# Replace Loop Detection with Subtle Gravity

## What changes

### Remove: Smart Loop Detection System
The current system tracks the last 8 bounce angles and, when it detects a repeating pattern, forcibly rotates the ball's direction by 10 degrees. This triggers too often and creates visible, unnatural direction changes -- especially near the top wall where the ball bounces back and forth horizontally.

The following will be completely removed:
- `trajectoryHistoryRef`, `LOOP_HISTORY_SIZE`, `LOOP_ANGLE_TOLERANCE`, `LOOP_MIN_REPEATS` constants
- `detectStuckLoop()` function
- All places that push bounce angles into `trajectoryHistoryRef`
- All places that clear `trajectoryHistoryRef` on paddle hits
- The diversion block that rotates the ball by 10 degrees when a loop is detected

### Add: Subtle Downward Gravity for Nearly-Horizontal Balls
Instead of forcibly changing direction, apply a tiny constant downward force (gravity) to the ball's vertical velocity each frame. This only has a meaningful effect when the ball is traveling nearly horizontally (small `dy`), gradually curving it downward toward the paddle. When the ball has significant vertical velocity, the gravity is imperceptible.

The gravity will be applied in the game loop's ball update section -- a single line per ball:

```
ball.dy += BALL_GRAVITY;
```

Where `BALL_GRAVITY` is a small constant (around 0.03-0.05 pixels/frame). This is subtle enough to be invisible during normal play but strong enough to prevent infinite horizontal bouncing at the top of the screen.

## Technical details

### Files changed

**`src/components/Game.tsx`**
- Remove ~80 lines of loop detection code (lines 551-605: refs, constants, `detectStuckLoop` function)
- Remove trajectory recording after brick/wall bounces (lines 3926-3931, 4537-4542)
- Remove trajectory clearing on paddle hits (lines 4048, 4132)
- Remove the diversion block (lines 7900-7919)
- Add `BALL_GRAVITY` constant (e.g., `const BALL_GRAVITY = 0.04;`)
- Add gravity application in the ball physics update section (where ball positions are updated each frame), applying `ball.dy += BALL_GRAVITY` to each active ball

### Why gravity works better
- It's physics-based and feels natural -- players won't notice it
- It prevents horizontal loops organically: a ball bouncing horizontally at the top will gradually curve downward
- No pattern detection needed, so no false positives
- No sudden visible direction changes
