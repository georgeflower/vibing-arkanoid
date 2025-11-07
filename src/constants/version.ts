export const GAME_VERSION = "0.6.1";

export const CHANGELOG = [
  {
    version: "0.6.1",
    changes: [
      "Turret drop timer now resets on level completion",
      "Power-ups drop every 3 defeated enemies",
      "Ball only bounces off the top 50% of the paddle",
      "Enemy shooting intervals scale with level: 7–12s (lvl 1–7), 4–8s (lvl 8), 3–7s (lvl 9+)",
    ],
  },
  {
    version: "0.6.0",
    changes: [
      "Updated shield powerup with new sound and icon",
      "New startup screen and main menu images",
      "Shield now fully wraps around paddle (thick top, thin sides/bottom)",
      "Shield powerup is now less common",
      "Turrets powerup 50% drop chance at 90 seconds (up from 25%)",
      "Enemy shooting intervals scale with level: +0.5s/level until 5-9s at level 10, then 3-7s from level 11+",
      "Ball only bounces from top 50% of paddle collision area",
      "Indestructible bricks are now truly solid rectangles with no gaps or shadows",
      "Speed caps: 150% for normal mode, 175% for godlike mode",
      "Accumulated speed resets when winning a level",
      "Ball auto-diverts 10° if no paddle contact for 15s",
      "Kamikaze enemy attacks ball if no paddle contact for 25s",
      "Drop powerup for every 3 enemies killed",
      "Extra life awarded every 50,000 score with sound and score blink effect",
      "Fixed: Levels with only indestructible bricks now advance automatically",
      "High score list now fully scrollable regardless of window size",
      "Added full changelog history accessible from version number",
      "Updated instructions with all new mechanics",
    ],
  },
  {
    version: "0.5.2",
    changes: [
      "Added Shield powerup - protects from 1 enemy bullet",
      "Capped enemy speed increase after 5 enemies spawn",
      "Enemies now shoot less frequently (7-12 seconds)",
      "Ball speed from brick hits capped at 30% until level clear/death/slowdown",
      "Speed only increases when bricks fully destroyed (not multi-hit bricks)",
      "Turrets powerup 25% drop chance at 90 seconds",
      "Version number now visible during gameplay",
      "Added changelog accessible by clicking version number",
      "Fixed level loop bug with indestructible bricks",
      "High score list now fully visible regardless of window size",
    ],
  },
  {
    version: "0.5.1",
    changes: [
      "Changed canvas to 850x650",
      "Updated brick grid to 13 columns x 14 rows",
      "Adjusted brick dimensions",
      "Reduced paddle width by 10 pixels",
      "Updated level editor to match new grid",
    ],
  },
  {
    version: "0.5.0",
    changes: [
      "Implemented pointer lock for mouse control",
      "Mouse capture with ESC to exit",
      "Click canvas to re-capture mouse",
      "Improved touch controls for mobile",
    ],
  },
  {
    version: "0.4.10",
    changes: [
      "Added bonus letter collection system (Q-U-M-R-A-N)",
      "Collect all 6 letters for +10 lives and +500,000 points",
      "Bonus letters drop on specific levels",
      "Added visual indicators for collected letters",
    ],
  },
  {
    version: "0.4.0",
    changes: [
      "Introduced 3 enemy types: Cube, Sphere, and Pyramid",
      "Pyramid enemies require 3 hits to destroy",
      "Sphere enemies require 2 hits and get angry",
      "Enemies shoot projectiles at the player",
      "Added explosion effects for destroyed enemies",
      "Enemy difficulty scales with level and game mode",
    ],
  },
  {
    version: "0.3.5",
    changes: [
      "Added turrets powerup - shoot bullets from paddle",
      "Bullets can destroy bricks and enemies",
      "Indestructible bricks bounce bullets back",
      "Added bullet collision detection",
    ],
  },
  {
    version: "0.3.0",
    changes: [
      "Implemented 8 powerups: multiball, fireball, life, slowdown, extend, shrink, turrets, shield",
      "Powerup drop chance increases over time",
      "Visual powerup animations and effects",
      "Special sound effects for each powerup",
    ],
  },
  {
    version: "0.2.5",
    changes: [
      "Added multi-hit bricks that require multiple hits",
      "Brick colors change based on remaining hits",
      "Added hit counter display on bricks",
      "Difficulty scales with level progression",
    ],
  },
  {
    version: "0.2.0",
    changes: [
      "Implemented 50 unique level layouts",
      "Added indestructible metal bricks",
      "Level editor for custom level design",
      "Progressive difficulty system",
    ],
  },
  {
    version: "0.1.5",
    changes: [
      "Added retro Amiga-inspired graphics",
      "16-bit pixel texture effects on bricks",
      "3D ball with metallic gradient",
      "Retro color palette and visual style",
    ],
  },
  {
    version: "0.1.0",
    changes: [
      "Initial game release",
      "Basic Arkanoid gameplay mechanics",
      "Paddle and ball physics",
      "Brick breaking system",
      "Score tracking and lives system",
      "16 retro music tracks with random selection",
      "High score system with persistence",
      "Normal and Godlike difficulty modes",
    ],
  },
];
