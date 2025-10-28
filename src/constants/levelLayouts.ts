// Level layouts - each layout is a 2D boolean array where true = brick exists
// Returns the number of hits required for a brick at this position and level
export const getBrickHits = (level: number, row: number): number => {
  if (level < 3) return 1;
  if (level < 5) return row < 2 ? 2 : 1;
  if (level < 7) return row < 3 ? 2 : 1;
  if (level < 9) return row < 2 ? 3 : row < 4 ? 2 : 1;
  return row < 3 ? 3 : row < 5 ? 2 : 1;
};

export const levelLayouts: boolean[][][] = [
  // Level 1: Classic Rows
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],
  
  // Level 2: Diamond
  [
    [false, false, false, false, false, true, true, false, false, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, false, false, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, false, false, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, false, false, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, false, false, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, false, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],
  
  // Level 3: Heart (more filled)
  [
    [false, false, true, true, true, false, false, true, true, true, false, false, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, false, false, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, false, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, true, true, true, true, true, true, true, true, true, true, true, false, false],
    [false, false, true, true, true, true, true, true, true, true, true, false, false, false],
    [false, false, false, true, true, true, true, true, true, true, false, false, false, false],
  ],
  
  // Level 4: Full Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],
  
  // Level 5: Pyramid
  [
    [false, false, false, false, false, false, true, true, false, false, false, false, false, false],
    [false, false, false, false, false, true, true, true, true, false, false, false, false, false],
    [false, false, false, false, true, true, true, true, true, true, false, false, false, false],
    [false, false, false, true, true, true, true, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, true, true, true, true, true, true, false, false],
    [false, true, true, true, true, true, true, true, true, true, true, true, true, false],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],
  
  // Level 6: Dense Checkerboard
  [
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true, false, true, false, true],
  ],
  
  // Level 7: Dense X Pattern
  [
    [true, true, true, false, false, false, false, false, false, false, false, true, true, true],
    [true, true, true, true, false, false, false, false, false, false, true, true, true, true],
    [false, true, true, true, true, false, false, false, false, true, true, true, true, false],
    [false, false, true, true, true, true, false, false, true, true, true, true, false, false],
    [false, false, false, true, true, true, true, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, false, false, true, true, true, true, false, false],
    [false, true, true, true, true, false, false, false, false, true, true, true, true, false],
    [true, true, true, true, false, false, false, false, false, false, true, true, true, true],
  ],
  
  // Level 8: Dense Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  ],
  
  // Level 9: Full Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],
  
  // Level 10: Full Dense Grid
  [
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  ],
];
