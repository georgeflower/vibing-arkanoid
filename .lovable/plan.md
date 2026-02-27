

# Three Fixes: Homepage Cache Busting, Square Letters, Retry Button Text

## 1. Homepage Version/Cache Check
The homepage currently has no service worker update logic, so users can see a stale cached version. We'll import and use the existing `useServiceWorkerUpdate` hook (from `src/hooks/useServiceWorkerUpdate.ts`) inside the `Home` component with `isMainMenu: true` and `shouldApplyUpdate: true` so that any pending update is detected and applied immediately when visiting the homepage.

**File:** `src/pages/Home.tsx`
- Import `useServiceWorkerUpdate` hook
- Call it inside `Home` component with `{ isMainMenu: true, shouldApplyUpdate: true }`

## 2. Fix Stretched Bonus Letter Images
The bonus letter images in the Gameplay section appear vertically stretched. The fix is to add `aspect-ratio: 1 / 1` and `object-fit: contain` to the letter `<img>` elements so they remain square regardless of the source image dimensions.

**File:** `src/pages/Home.tsx` (line ~306)
- Add `style={{ imageRendering: "pixelated", aspectRatio: "1 / 1", objectFit: "contain" }}` to the bonus letter `<img>` tags
- Ensure the container `<div>` also has a square aspect ratio

## 3. Remove "(Score Reset)" from Retry Button
The End Screen's Retry button currently reads "RETRY LEVEL (Score Reset)". We'll change it to just "RETRY LEVEL".

**File:** `src/components/EndScreen.tsx` (line 159)
- Change `RETRY LEVEL (Score Reset)` to `RETRY LEVEL`

