
# Fix God Mode Starting Lives

## Problem

The `initGame` function in `src/components/Game.tsx` (line 2179) hardcodes `setLives(3)`, which overrides the `settings.startingLives` value that was correctly set to 1 for Godlike difficulty in `MainMenu.tsx`.

## Fix

**File: `src/components/Game.tsx`, line 2179**

Change:
```typescript
setLives(3);
```
To:
```typescript
setLives(settings.startingLives);
```

This is a one-line fix. The `settings` object is already accessible inside `initGame` (it's used on lines 2145-2146 for `settings.startingLevel` and `settings.difficulty`).

## Why it was broken

The MainMenu correctly builds `startingLives: 1` for Godlike mode, and the initial `useState(settings.startingLives)` on line 178 sets lives correctly on first mount. However, `initGame()` is called shortly after and resets lives to the hardcoded value of 3, undoing the correct initial state.
