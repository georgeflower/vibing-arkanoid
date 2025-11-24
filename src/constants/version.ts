export const GAME_VERSION = "0.8.0";

export const CHANGELOG = [
  {
    version: "0.8.0",
    changes: [
      "Paddle deflection angle increased to 80° for more extreme ball control",
      "Improved ball trajectory control from paddle edges",
    ],
  },
  {
    version: "0.7.12",
    changes: [
      "Enhanced paddle collision system with improved ball angle control",
      "Ball launch angle determined by paddle impact position (-80° to +80°)",
    ],
  },
  {
    version: "0.7.10",
    changes: [
      "Mobile touch controls improved with zone-based mapping",
      "Easier to reach paddle extremes on mobile devices",
    ],
  },
  {
    version: "0.7.2",
    changes: [
      "Implemented advanced physics engine with Continuous Collision Detection",
      "Ball no longer tunnels through bricks at high speeds",
      "Cracked brick sound effects now match damage progression",
      "Enhanced collision accuracy for all game objects",
    ],
  },
  {
    version: "0.7.1",
    changes: [
      "Boss music system properly pauses background music during boss battles",
      "Fixed multiple background music tracks playing simultaneously",
      "Background music resumes after boss defeat",
    ],
  },
  {
    version: "0.7.0",
    changes: [
      "Bosses now spawn minions every 15 seconds (2 at a time, max 6 on screen)",
      "Boss minions have 50% power-up drop rate",
      "Turret shots now damage bosses (0.5 HP per shot)",
      "Special brick types: Metal bricks (indestructible), Cracked bricks (3 hits required), Explosive bricks (destroy surrounding bricks)",
      "Metal bricks visually melt together and can be destroyed by explosive blasts",
      "Shield now protects entire paddle with animated yellow energy force field",
      "Level editor: Paint brush system for placing bricks with visual previews",
      "Bonus letters awarded in random order from eligible levels",
      "Cloud-based high score leaderboards with all-time, weekly, and daily rankings",
      "Statistics screen: Power-ups collected, bricks destroyed by turrets, enemies killed, bosses killed, and total play time",
      "High score entry with celebratory particle effects and animations",
      "Boss spawn visual with hatch opening effect",
      "Sound effects: Glass breaking for cracked bricks, dramatic explosions for explosive bricks",
      "Game mechanics: Removed combo scoring and extra life bonus per 50k points",
      "Mobile improvements: Frameless layout and improved fullscreen behavior",
    ],
  },
  {
    version: "0.6.6",
    changes: [
      "Boss system: Epic boss battles on levels 5, 10, and 15 featuring Cube, Sphere, and Pyramid bosses with unique attack patterns",
      "Boss attacks: Shot, laser, super, spiral, and cross patterns with visual warnings and effects",
      "Multi-phase boss mechanics: Bosses become faster and more aggressive as they lose health",
      "Pyramid boss resurrection: Splits into 3 smaller independent bosses when defeated",
      "Boss intro cinematics: Dramatic warning overlays, pulsing borders, spotlight zoom, and 'BOSS APPROACHING' text",
      "Game over particle explosion animation with glowing particles and gravity physics",
      "Game over statistics screen: Displays bricks destroyed, longest combo, and accuracy percentage",
      "Retry level button: Resets score and lives to restart the level you died on",
      "Level skipper detection: Players who skip levels see 'CHEATER' banner and are disqualified from high scores",
      "Boss damage effects: Screen shake, color flashing, and impact particles when bosses take damage",
      "Laser warning visual: Pulsating dotted line with '!! LASER !!' text before laser fires",
      "Fixed: Boss attacks and laser warnings now properly clear when losing a ball",
      "Fixed: Retry level now correctly restarts the current level instead of advancing to the next",
      "Fixed: Boss laser attacks now originate from boss position instead of screen top",
      "Fixed: Multi-phase boss health bars now accurately reflect current phase HP",
    ],
  },
  {
    version: "0.6.5  ",
    changes: [
      "Turret power-up now has limited ammo: 30 shots in normal mode, 15 shots in god mode",
      "Added turret ammo counter to HUD that pulses red when low",
      "Base speed increased by 15%",
      "God mode now starts at 125% speed",
    ],
  },
  {
    version: "0.6.3  ",
    changes: [
      "Enemies now explode with unique colors: cubes (cyan/blue), spheres (pink/magenta), pyramids (purple/violet)",
      "Each explosion emits 20 debris particles with physics and gravity",
      "Mobile touch controls now launch the ball",
      "Every 3rd enemy kill guarantees a power-up drop",
    ],
  },
  {
    version: "0.6.2",
    changes: [
      "Screen shakes when hitting enemies",
      "Background flashes when collecting bonus letters",
      "Ball auto-diverts if avoiding paddle for 15s; kamikaze enemy attacks after 25s",
      "QUMRAN letter reward: 5 extra lives",
    ],
  },
  {
    version: "0.6.1",
    changes: [
      "Power-ups drop every 3 defeated enemies",
      "Ball only bounces off the top 50% of the paddle",
      "Enemy shooting intervals scale with level difficulty",
    ],
  },
  {
    version: "0.6.0",
    changes: [
      "Updated shield powerup with new sound and icon",
      "New startup screen and main menu images",
      "Shield now fully wraps around paddle",
      "Speed caps: 150% for normal mode, 175% for godlike mode",
      "Ball auto-diverts 10° if no paddle contact for 15s",
      "Kamikaze enemy attacks ball if no paddle contact for 25s",
      "Extra life awarded every 50,000 score",
    ],
  },
  {
    version: "0.5.2",
    changes: [
      "Added Shield powerup - protects from 1 enemy bullet",
      "Enemies shoot less frequently (7-12 seconds)",
      "Ball speed from brick hits capped at 30%",
      "Turrets powerup has increased drop chance at 90 seconds",
    ],
  },
  {
    version: "0.5.0",
    changes: [
      "Implemented pointer lock for mouse control",
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
      "Implemented 20 unique level layouts",
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
