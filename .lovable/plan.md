

# Swap Default Route: `/home` as Landing Page

## Overview

Change the routing so that visiting the root URL (`/`) shows the Home landing page, and the game is served at `/play`.

## Changes

### 1. Update Routes in `src/App.tsx`

- `/` renders `Home` (currently renders `Index`)
- `/play` renders `Index` (the game)
- Remove the old `/home` route (or redirect it to `/` for backwards compatibility)

### 2. Update Links in `src/pages/Home.tsx`

- Change all `<Link to="/">` (Play Now, Launch Game) to `<Link to="/play">`

### 3. Update Navigation in Game Components

- In `src/components/MainMenu.tsx`: Update the Tab-key shortcut that navigates to `/level-editor` (no change needed there), but check if any "back to home" links point to `/`
- In any component that uses `navigate("/")` or `<Link to="/">` for returning to the menu after a game, update to `/play` or `/` as appropriate

### 4. Update Level Editor Link

- If `src/pages/LevelEditor.tsx` has any "back" links pointing to `/`, update them

## Files Changed

| File | Change |
|------|--------|
| `src/App.tsx` | Swap route mappings: `/` to Home, `/play` to Index |
| `src/pages/Home.tsx` | Update Play Now / Launch Game links to `/play` |
| `src/components/MainMenu.tsx` | Verify/update any navigation references |

