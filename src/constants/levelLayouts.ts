// Level layouts - each layout is a 2D array where:
// false = no brick, true = normal brick, 2 = indestructible brick (from level 10+)
// Returns the number of hits required for a brick at this position and level
export const getBrickHits = (level: number, row: number): number => {
  if (level < 3) return 1;
  if (level < 5) return row < 2 ? 2 : 1;
  if (level < 8) return row < 3 ? 2 : 1;
  if (level < 12) return row < 2 ? 3 : row < 4 ? 2 : 1;
  if (level < 18) return row < 3 ? 3 : row < 5 ? 2 : 1;
  if (level < 25) return row < 2 ? 4 : row < 4 ? 3 : row < 6 ? 2 : 1;
  if (level < 35) return row < 3 ? 4 : row < 5 ? 3 : row < 7 ? 2 : 1;
  if (level < 45) return row < 2 ? 5 : row < 4 ? 4 : row < 6 ? 3 : row < 8 ? 2 : 1;
  return row < 3 ? 6 : row < 5 ? 5 : row < 7 ? 4 : row < 9 ? 3 : row < 11 ? 2 : 1;
};

export const levelLayouts: (boolean | number)[][][] = [
  // Level 1
  [
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, true, true, false, false, true, true, false, false, true, true, true, false],
    [false, true, true, false, false, true, true, false, false, true, true, true, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, true, false, false, false, false, false, false, false, false, false, true, false],
    [false, true, false, true, true, false, true, false, true, true, false, true, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 2
  [
    [false, false, false, true, true, true, false, true, true, true, false, false, false],
    [false, true, false, false, true, false, false, false, true, false, false, true, false],
    [false, true, true, false, false, false, true, false, false, false, true, true, false],
    [false, false, true, true, false, true, false, true, false, true, true, false, false],
    [false, false, false, false, true, false, true, false, true, false, false, false, false],
    [false, false, false, true, false, true, true, true, false, true, false, false, false],
    [false, false, true, false, true, false, true, false, true, false, true, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, false, false, false, false, true, false, true, false, false, false, false, false],
    [false, true, false, false, true, false, false, false, true, false, false, true, false],
    [false, false, true, true, false, false, false, false, false, true, true, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 3
  [
    [false, false, true, true, true, false, false, true, true, true, false, false, false],
    [false, true, false, false, false, true, true, false, false, false, true, false, false],
    [true, false, true, true, true, false, false, true, true, true, false, true, false],
    [false, true, true, true, true, true, true, true, true, true, true, false, true],
    [false, true, true, true, true, true, true, true, true, true, true, false, true],
    [true, false, true, true, true, true, true, true, true, true, false, true, false],
    [false, true, false, true, true, true, true, true, true, false, true, false, false],
    [false, false, true, false, true, true, true, true, false, true, false, false, false],
    [false, false, false, true, false, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, false, true, false, false, false, false, false],
    [false, false, false, false, false, true, true, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 4
  [
    [false, false, false, false, true, true, true, true, false, false, false, false, false],
    [false, true, false, true, false, false, false, false, true, false, true, false, false],
    [false, false, true, false, false, true, true, false, false, true, false, false, false],
    [false, false, false, true, false, true, true, false, true, false, false, false, false],
    [false, false, false, false, true, false, false, true, false, false, false, false, false],
    [false, false, true, true, true, false, false, true, true, true, false, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, true, false, false, false, false, true, false, false, false, false],
    [false, false, true, false, true, false, false, true, false, true, false, false, false],
    [true, true, true, false, true, true, true, true, false, true, true, true, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 5
  [
    [false, true, true, true, false, false, false, false, true, true, true, false, false],
    [false, true, false, false, false, true, true, false, false, false, true, false, false],
    [false, false, false, false, true, true, true, true, false, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, false, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, false, false, false],
    [false, true, false, true, false, true, true, false, true, false, true, false, false],
    [true, false, true, false, true, false, false, true, false, true, false, true, false],
    [false, true, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, true, false, false, false, false, true, false, false, false, false],
    [false, true, true, false, true, true, true, true, false, true, true, false, false],
    [true, true, true, false, true, false, false, true, false, true, true, true, false],
    [false, false, true, 2, 2, false, false, 2, 2, true, false, false, false],
    [false, true, false, false, false, false, false, false, false, false, true, false, false],
    [false, false, true, false, false, false, false, false, false, true, false, false, false],
  ],

  // Level 6: Checkerboard
  [
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
  ],

  // Level 7: X Pattern
  [
    [true, true, false, false, false, false, false, false, false, false, false, true, true],
    [true, true, true, false, false, false, false, false, false, false, true, true, true],
    [false, true, true, true, false, false, false, false, false, true, true, true, false],
    [false, false, true, true, true, false, false, false, true, true, true, false, false],
    [false, false, false, true, true, true, false, true, true, true, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, true, true, true, false, true, true, true, false, false, false],
    [false, false, true, true, true, false, false, false, true, true, true, false, false],
    [false, true, true, true, false, false, false, false, false, true, true, true, false],
    [true, true, true, false, false, false, false, false, false, false, true, true, true],
  ],

  // Level 8: Dense Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],

  // Level 9: Full Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],

  // Level 10: Indestructible Frame
  [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, true, true, true, true, true, true, true, true, true, true, true, 2],
    [2, true, true, true, true, true, true, true, true, true, true, true, 2],
    [2, true, true, true, true, true, true, true, true, true, true, true, 2],
    [2, 2, 2, true, true, true, true, true, true, true, 2, 2, 2],
    [false, false, 2, true, true, true, true, true, true, true, 2, false, false],
    [false, false, 2, true, true, true, true, true, true, true, 2, false, false],
    [false, false, 2, true, true, true, true, true, true, true, 2, false, false],
    [false, false, 2, true, true, true, true, true, true, true, 2, false, false],
    [false, false, 2, true, true, true, true, true, true, true, 2, false, false],
    [2, 2, 2, true, true, true, true, true, true, true, 2, 2, 2],
    [2, true, true, true, true, true, true, true, true, true, true, true, 2],
    [2, true, true, true, true, true, true, true, true, true, true, true, 2],
    [2, 2, 2, true, true, true, true, true, true, true, 2, 2, 2],
  ],

  // Level 11: Star Pattern
  [
    [false, false, false, false, false, true, true, false, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, false, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, false, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, false, false, false],
    [true, true, true, false, false, false, true, false, false, false, true, true, true],
    [true, true, false, false, false, false, true, false, false, false, false, true, true],
    [true, false, false, false, false, false, true, false, false, false, false, false, true],
    [true, true, false, false, false, false, true, false, false, false, false, true, true],
    [true, true, true, false, false, false, true, false, false, false, true, true, true],
    [false, false, true, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, true, true, true, true, true, true, false, false, false, false],
    [false, false, false, false, true, true, true, true, false, false, false, false, false],
    [false, false, false, false, false, true, true, false, false, false, false, false, false],
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
  ],

  // Level 12: Diamond
  [
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 13: Maze
  [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, false, false, true, true, true, false, true, true, true, false, false, 2],
    [2, false, 2, 2, 2, true, false, true, 2, 2, 2, false, 2],
    [2, false, 2, false, false, true, false, true, false, false, 2, false, 2],
    [2, false, true, false, 2, true, true, true, 2, false, true, false, 2],
    [2, false, true, false, 2, false, false, false, 2, false, true, false, 2],
    [2, false, true, false, 2, false, 2, false, 2, false, true, false, 2],
    [2, false, true, false, false, false, 2, false, false, false, true, false, 2],
    [2, false, 2, 2, 2, 2, 2, 2, 2, 2, 2, false, 2],
    [2, false, false, false, false, false, false, false, false, false, false, false, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 14: Spiral
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, false, false, false, false, false, false, false, false, false, false, false, true],
    [true, false, true, true, true, true, true, true, true, true, true, false, true],
    [true, false, true, false, false, false, false, false, false, false, true, false, true],
    [true, false, true, false, true, true, true, true, true, false, true, false, true],
    [true, false, true, false, true, false, false, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, false, false, true, false, true, false, true],
    [true, false, true, false, true, true, true, true, true, false, true, false, true],
    [true, false, true, false, false, false, false, false, false, false, true, false, true],
    [true, false, true, true, true, true, true, true, true, true, true, false, true],
    [true, false, false, false, false, false, false, false, false, false, false, false, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 15: Stripes
  [
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true],
  ],

  // Level 16: Temple
  [
    [false, false, false, false, false, 2, 2, 2, false, false, false, false, false],
    [false, false, false, false, 2, 2, 2, 2, 2, false, false, false, false],
    [false, false, false, 2, 2, true, true, true, 2, 2, false, false, false],
    [false, false, 2, 2, true, true, true, true, true, 2, 2, false, false],
    [false, 2, 2, true, true, true, true, true, true, true, 2, 2, false],
    [2, 2, true, true, true, false, true, false, true, true, true, 2, 2],
    [2, true, true, true, false, true, false, true, false, true, true, true, 2],
    [2, true, true, false, true, false, true, false, true, false, true, true, 2],
    [2, true, true, true, false, true, false, true, false, true, true, true, 2],
    [2, 2, true, true, true, false, true, false, true, true, true, 2, 2],
    [false, 2, 2, true, true, true, true, true, true, true, 2, 2, false],
    [false, false, 2, 2, true, true, true, true, true, 2, 2, false, false],
    [false, false, false, 2, 2, true, true, true, 2, 2, false, false, false],
    [false, false, false, false, 2, 2, 2, 2, 2, false, false, false, false],
  ],

  // Level 17: Arrows
  [
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [true, true, true, false, false, true, true, true, false, false, true, true, true],
    [false, true, true, true, false, true, true, true, false, true, true, true, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, false, true, true, true, true, true, false, false, false, false],
    [false, false, false, false, false, true, true, true, false, false, false, false, false],
    [false, false, false, false, false, false, true, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 18: Fortress
  [
    [2, 2, 2, false, false, false, false, false, false, false, 2, 2, 2],
    [2, true, 2, false, false, false, false, false, false, false, 2, true, 2],
    [2, true, 2, 2, 2, 2, 2, 2, 2, 2, 2, true, 2],
    [false, true, true, true, true, true, true, true, true, true, true, true, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, 2, 2, 2, 2, 2, 2, 2, false, false, false],
    [false, false, false, 2, true, true, true, true, true, 2, false, false, false],
    [false, false, false, 2, true, false, false, false, true, 2, false, false, false],
    [false, false, false, 2, true, false, 2, false, true, 2, false, false, false],
    [false, false, false, 2, true, false, false, false, true, 2, false, false, false],
    [false, false, false, 2, true, true, true, true, true, 2, false, false, false],
    [false, false, false, 2, 2, 2, 2, 2, 2, 2, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 19: Circles
  [
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, true, true, true, false, false, false, false, false, true, true, true, false],
    [true, true, true, false, false, false, false, false, false, false, true, true, true],
    [true, true, false, false, true, true, true, true, true, false, false, true, true],
    [true, true, false, false, true, false, false, false, true, false, false, true, true],
    [true, true, false, false, true, false, 2, false, true, false, false, true, true],
    [true, true, false, false, true, false, false, false, true, false, false, true, true],
    [true, true, false, false, true, true, true, true, true, false, false, true, true],
    [true, true, true, false, false, false, false, false, false, false, true, true, true],
    [false, true, true, true, false, false, false, false, false, true, true, true, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],

  // Level 20: Final Challenge
  [
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [2, true, true, true, true, true, 2, true, true, true, true, true, 2],
    [2, true, 2, 2, 2, true, 2, true, 2, 2, 2, true, 2],
    [2, true, 2, false, 2, true, 2, true, 2, false, 2, true, 2],
    [2, true, 2, false, 2, true, true, true, 2, false, 2, true, 2],
    [2, true, 2, false, 2, 2, 2, 2, 2, false, 2, true, 2],
    [2, true, 2, false, false, false, false, false, false, false, 2, true, 2],
    [2, true, 2, false, 2, 2, 2, 2, 2, false, 2, true, 2],
    [2, true, 2, false, 2, true, true, true, 2, false, 2, true, 2],
    [2, true, 2, false, 2, true, 2, true, 2, false, 2, true, 2],
    [2, true, 2, 2, 2, true, 2, true, 2, 2, 2, true, 2],
    [2, true, true, true, true, true, 2, true, true, true, true, true, 2],
    [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
    [false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],
];
