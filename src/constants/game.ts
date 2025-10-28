export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 800;
export const PADDLE_WIDTH = 120;
export const PADDLE_HEIGHT = 14;
export const BALL_RADIUS = 6;
export const BRICK_ROWS = 8;
export const BRICK_COLS = 14;
export const BRICK_WIDTH = 60;
export const BRICK_HEIGHT = 20;
export const BRICK_PADDING = 8;
export const BRICK_OFFSET_TOP = 80;
export const BRICK_OFFSET_LEFT = 40;

export const POWERUP_SIZE = 30;
export const POWERUP_FALL_SPEED = 2;
export const POWERUP_DROP_CHANCE = 0.40; // 40%
export const FIREBALL_DURATION = 5000; // 5 seconds

export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 12;
export const BULLET_SPEED = 7;

// Retro Amiga 16-bit colors
export const brickColors = [
  "hsl(0, 75%, 55%)",    // red
  "hsl(30, 85%, 55%)",   // orange
  "hsl(45, 90%, 55%)",   // yellow
  "hsl(200, 70%, 50%)",  // blue
  "hsl(280, 60%, 55%)",  // purple
  "hsl(330, 70%, 55%)",  // pink
  "hsl(120, 60%, 45%)",  // green
  "hsl(180, 65%, 50%)",  // cyan
];

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
