export const GAME_VERSION = "0.5.2";

export const CHANGELOG = [
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
      "Initial release with pointer lock",
      "Mouse capture with ESC to exit",
      "Click canvas to re-capture mouse",
    ],
  },
];
