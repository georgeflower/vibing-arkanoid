

# Fix: Cracked Brick Textures Not Showing

## Root Cause
The `useEffect` in `GameCanvas.tsx` (lines 299-308) that passes cracked brick images to `brickRenderer` has an **empty dependency array `[]`**. This causes it to run only once on component mount, before the images have finished loading asynchronously.

**Current code:**
```typescript
useEffect(() => {
  if (crackedBrick1Ref.current && crackedBrick2Ref.current && crackedBrick3Ref.current) {
    brickRenderer.setCrackedImages(
      crackedBrick1Ref.current,
      crackedBrick2Ref.current,
      crackedBrick3Ref.current
    );
  }
}, []); // Runs once on mount - images not loaded yet!
```

## Solution
Track image loading state and trigger the effect when all three images are loaded.

### Changes to `GameCanvas.tsx`

1. **Add state to track loaded images** (around line 108):
```typescript
const [crackedImagesLoaded, setCrackedImagesLoaded] = useState(false);
```

2. **Update image loading callbacks** (lines 179-195):
```typescript
const crackedBrick1Image = new Image();
crackedBrick1Image.onload = () => {
  crackedBrick1Ref.current = crackedBrick1Image;
  // Check if all three are now loaded
  if (crackedBrick2Ref.current && crackedBrick3Ref.current) {
    setCrackedImagesLoaded(true);
  }
};
crackedBrick1Image.src = crackedBrick1;

const crackedBrick2Image = new Image();
crackedBrick2Image.onload = () => {
  crackedBrick2Ref.current = crackedBrick2Image;
  if (crackedBrick1Ref.current && crackedBrick3Ref.current) {
    setCrackedImagesLoaded(true);
  }
};
crackedBrick2Image.src = crackedBrick2;

const crackedBrick3Image = new Image();
crackedBrick3Image.onload = () => {
  crackedBrick3Ref.current = crackedBrick3Image;
  if (crackedBrick1Ref.current && crackedBrick2Ref.current) {
    setCrackedImagesLoaded(true);
  }
};
crackedBrick3Image.src = crackedBrick3;
```

3. **Update the effect to depend on loaded state** (lines 299-308):
```typescript
useEffect(() => {
  if (crackedImagesLoaded && crackedBrick1Ref.current && crackedBrick2Ref.current && crackedBrick3Ref.current) {
    brickRenderer.setCrackedImages(
      crackedBrick1Ref.current,
      crackedBrick2Ref.current,
      crackedBrick3Ref.current
    );
    // Force cache rebuild to pick up new images
    brickRenderer.invalidate();
  }
}, [crackedImagesLoaded]);
```

## Technical Details

| Aspect | Description |
|--------|-------------|
| **Issue** | Empty `[]` dependency means effect fires before async image load completes |
| **Fix** | State flag triggers effect after all images confirm loaded |
| **Cache** | Call `brickRenderer.invalidate()` to force redraw with new textures |
| **Impact** | Single state addition, minimal code change |

## Files Changed

| File | Change |
|------|--------|
| `src/components/GameCanvas.tsx` | Add `crackedImagesLoaded` state, update image load callbacks, fix effect dependency |

