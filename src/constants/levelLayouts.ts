// Level layouts - each layout is a 2D boolean array where true = brick exists
export const levelLayouts: boolean[][][] = [
  // Level 1: Classic Rows
  [
    [true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true],
    [true, true, true, true, true, true, true, true, true, true],
  ],
  
  // Level 2: Diamond
  [
    [false, false, false, false, true, true, false, false, false, false],
    [false, false, true, true, true, true, true, true, false, false],
    [true, true, true, true, true, true, true, true, true, true],
    [false, false, true, true, true, true, true, true, false, false],
    [false, false, false, false, true, true, false, false, false, false],
  ],
  
  // Level 3: Heart
  [
    [false, true, true, false, false, false, true, true, false, false],
    [true, true, true, true, false, true, true, true, true, false],
    [true, true, true, true, true, true, true, true, true, false],
    [false, true, true, true, true, true, true, true, false, false],
    [false, false, true, true, true, true, true, false, false, false],
  ],
  
  // Level 4: Smiley Face
  [
    [false, false, true, true, true, true, true, true, false, false],
    [false, true, false, true, false, false, true, false, true, false],
    [false, true, false, false, false, false, false, false, true, false],
    [false, true, true, false, false, false, false, true, true, false],
    [false, false, true, true, true, true, true, true, false, false],
  ],
  
  // Level 5: Arrow Up
  [
    [false, false, false, false, true, true, false, false, false, false],
    [false, false, false, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, true, true, false, false],
    [false, false, false, false, true, true, false, false, false, false],
    [false, false, false, false, true, true, false, false, false, false],
  ],
  
  // Level 6: Checkerboard
  [
    [true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false],
    [false, true, false, true, false, true, false, true, false, true],
    [true, false, true, false, true, false, true, false, true, false],
  ],
  
  // Level 7: X Shape
  [
    [true, false, false, false, false, false, false, false, false, true],
    [false, true, false, false, false, false, false, false, true, false],
    [false, false, true, false, true, true, false, true, false, false],
    [false, true, false, false, false, false, false, false, true, false],
    [true, false, false, false, false, false, false, false, false, true],
  ],
  
  // Level 8: Circle
  [
    [false, false, true, true, true, true, true, true, false, false],
    [false, true, true, true, true, true, true, true, true, false],
    [false, true, true, false, false, false, false, true, true, false],
    [false, true, true, true, true, true, true, true, true, false],
    [false, false, true, true, true, true, true, true, false, false],
  ],
  
  // Level 9: House
  [
    [false, false, false, false, true, true, false, false, false, false],
    [false, false, false, true, true, true, true, false, false, false],
    [false, false, true, true, true, true, true, true, false, false],
    [false, false, true, true, false, false, true, true, false, false],
    [false, false, true, true, true, true, true, true, false, false],
  ],
  
  // Level 10: Wave Pattern
  [
    [true, false, false, false, true, true, false, false, false, true],
    [false, true, false, true, false, false, true, false, true, false],
    [false, false, true, false, false, false, false, true, false, false],
    [false, true, false, true, false, false, true, false, true, false],
    [true, false, false, false, true, true, false, false, false, true],
  ],
];
