export const CANVAS_WIDTH = 850;
export const CANVAS_HEIGHT = 610;
export const PADDLE_WIDTH = 120;
export const PADDLE_HEIGHT = 14;
export const BALL_RADIUS = 6;
export const BRICK_ROWS = 16;
export const BRICK_COLS = 13;
export const BRICK_WIDTH = 55;
export const BRICK_HEIGHT = 20;
export const BRICK_PADDING = 5;
export const BRICK_OFFSET_TOP = 90;
export const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - (BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_PADDING)) / 2;

export const POWERUP_SIZE = 60; // Same as brick width
export const POWERUP_FALL_SPEED = 2;
export const POWERUP_DROP_CHANCE = 0.25; // 25%
export const FIREBALL_DURATION = 5000; // 5 seconds

export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 7;

// Color palettes that change every 5 levels
export const colorPalettes = [
  // Palette 1: Classic Amiga (levels 1-5)
  [
    "hsl(0, 75%, 55%)", // red
    "hsl(30, 85%, 55%)", // orange
    "hsl(45, 90%, 55%)", // yellow
    "hsl(200, 70%, 50%)", // blue
    "hsl(280, 60%, 55%)", // purple
    "hsl(330, 70%, 55%)", // pink
    "hsl(120, 60%, 45%)", // green
    "hsl(180, 65%, 50%)", // cyan
  ],
  // Palette 2: Hot Metal (levels 6-10)
  [
    "hsl(15, 90%, 60%)", // bright red-orange
    "hsl(350, 85%, 55%)", // crimson
    "hsl(40, 95%, 60%)", // gold
    "hsl(25, 90%, 50%)", // rust
    "hsl(0, 85%, 45%)", // deep red
    "hsl(35, 90%, 55%)", // amber
    "hsl(10, 80%, 50%)", // burnt orange
    "hsl(45, 85%, 50%)", // bronze
  ],
  // Palette 3: Neon City (levels 11-15)
  [
    "hsl(300, 90%, 60%)", // magenta
    "hsl(180, 85%, 55%)", // cyan
    "hsl(280, 90%, 65%)", // electric purple
    "hsl(190, 85%, 60%)", // bright cyan
    "hsl(320, 85%, 60%)", // hot pink
    "hsl(170, 80%, 55%)", // turquoise
    "hsl(290, 85%, 55%)", // violet
    "hsl(200, 90%, 60%)", // sky blue
  ],
  // Palette 4: Jungle (levels 16-20)
  [
    "hsl(120, 70%, 50%)", // green
    "hsl(90, 75%, 45%)", // lime
    "hsl(150, 65%, 45%)", // emerald
    "hsl(60, 80%, 50%)", // yellow-green
    "hsl(140, 70%, 40%)", // forest
    "hsl(75, 70%, 45%)", // chartreuse
    "hsl(160, 60%, 45%)", // sea green
    "hsl(100, 65%, 50%)", // grass
  ],
];

export const getBrickColors = (level: number): string[] => {
  const paletteIndex = Math.floor((level - 1) / 5) % colorPalettes.length;
  return colorPalettes[paletteIndex];
};

// Legacy export for backward compatibility
export const brickColors = colorPalettes[0];

// Colors for multi-hit bricks (darker shades as hits decrease)
export const getHitColor = (baseColor: string, hitsRemaining: number, maxHits: number): string => {
  if (hitsRemaining === maxHits) return baseColor;
  const lightnessReduction = ((maxHits - hitsRemaining) / maxHits) * 20;
  const match = baseColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (match) {
    const [, h, s, l] = match;
    return `hsl(${h}, ${s}%, ${Math.max(20, parseInt(l) - lightnessReduction)}%)`;
  }
  return baseColor;
};
