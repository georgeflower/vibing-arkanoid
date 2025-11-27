# Vibing Arkanoid - Complete Documentation

**Version**: 0.8.0+  
**Engine**: React 18 + TypeScript + Canvas 2D  
**Physics**: Fixed-step 60Hz game loop with Continuous Collision Detection (CCD)

---

## 📚 Documentation Index

### Core Systems
- **[Architecture Overview](./ARCHITECTURE.md)** - System design, component relationships, and data flow
- **[Game Engine](./GAME_ENGINE.md)** - Game loop, CCD collision system, event queue
- **[Physics & Collision](./PHYSICS.md)** - Ball physics, paddle geometry, brick collision

### Game Features
- **[Game Mechanics](./GAME_MECHANICS.md)** - Bricks, power-ups, speed system, bonus letters
- **[Boss System](./BOSS_SYSTEM.md)** - Boss battles, attack patterns, multi-phase mechanics
- **[Level System](./LEVEL_SYSTEM.md)** - Level layouts, difficulty progression, brick patterns
- **[Leaderboard System](./HIGH_SCORES.md)** - Cloud-based high scores with Supabase

### Technical Guides
- **[Rendering & Graphics](./RENDERING.md)** - Canvas rendering, effects, visual optimizations
- **[Audio System](./AUDIO.md)** - Music manager, sound effects, Web Audio API
- **[Performance Optimization](./PERFORMANCE.md)** - Adaptive quality, profiling, mobile optimizations
- **[Mobile Support](./MOBILE.md)** - Touch controls, gestures, iOS Safari handling

### Developer Reference
- **[UI Components](./UI_COMPONENTS.md)** - React components and their responsibilities
- **[Custom Hooks](./HOOKS.md)** - React hooks for game state management
- **[TypeScript Types](./DATA_TYPES.md)** - Complete type definitions
- **[Game Constants](./CONSTANTS.md)** - Configuration values and constants
- **[Complete File Index](./FILE_REFERENCE.md)** - Every file in the codebase

---

## 🎮 Quick Start for Developers

### Understanding the Game Flow

1. **Entry Point**: `src/main.tsx` → `src/App.tsx` → `src/pages/Index.tsx`
2. **Main Game**: `src/components/Game.tsx` orchestrates everything
3. **Game Loop**: `src/utils/gameLoop.ts` drives physics at 60Hz
4. **Collision**: `src/utils/gameCCD.ts` + `src/utils/processBallCCD.ts` handle ball collision
5. **Rendering**: `src/components/GameCanvas.tsx` draws everything on Canvas 2D

### Key Concepts

**Fixed-Step Game Loop**  
Physics updates run at exactly 60Hz regardless of frame rate. Uses accumulator pattern for deterministic simulation.

**Continuous Collision Detection (CCD)**  
Ball movement is swept through space to find exact Time Of Impact (TOI) with objects, preventing tunneling through thin objects at high speeds.

**Boss-First Hybrid Collision**  
Bosses use legacy shape-aware collision (pre-CCD), then CCD runs for all other objects. This ensures boss precision and prevents double-corrections.

**Pre-Assigned Power-Ups**  
5% of destructible bricks are assigned power-ups at level initialization, not randomly on destruction. This ensures consistent power-up frequency.

**Position-Based Paddle Launcher**  
Ball angle after paddle collision depends ONLY on impact position (±80° from center), ignoring incoming angle. Classic arcade physics.

---

## 🛠️ Common Development Tasks

### Adding a New Power-Up Type

1. Add type to `PowerUpType` in `src/types/game.ts`
2. Add image import to `src/utils/powerUpImages.ts`
3. Add logic in `checkPowerUpCollision()` in `src/hooks/usePowerUps.ts`
4. Add sound effect in `src/utils/sounds.ts`

### Creating a New Boss

1. Define config in `src/constants/bossConfig.ts`
2. Add creation logic in `src/utils/bossUtils.ts`
3. Implement attacks in `src/utils/bossAttacks.ts`
4. Add rendering in `src/components/GameCanvas.tsx`

### Adding a New Level

1. Define brick pattern in `src/constants/levelLayouts.ts`
2. Use level editor (`/level-editor` route) for visual design
3. Brick codes: `true`=normal, `2`=metal, `3`=explosive, `4`=cracked

### Debugging Performance Issues

1. Press `§` key to open debug dashboard
2. Enable Frame Profiler to see subsystem timings
3. Check adaptive quality system status (bottom-left FPS indicator)
4. Review `src/utils/performanceProfiler.ts` for bottlenecks

---

## 🏗️ Architecture Highlights

### Component Hierarchy
```
App.tsx
└── Index.tsx (Main Menu or Game)
    ├── MainMenu.tsx
    │   ├── TopScoresDisplay.tsx
    │   ├── MusicSettings.tsx
    │   └── Changelog.tsx
    └── Game.tsx
        ├── GameCanvas.tsx (renders everything)
        ├── GameUI.tsx (HUD, stats, pause)
        ├── CRTOverlay.tsx (visual effects)
        └── Debug Overlays (when enabled)
```

### Data Flow
```
User Input → Game.tsx → GameLoop.fixedUpdate()
  → Physics (CCD) → Collision Events
  → State Updates (React setState)
  → Canvas Re-render
```

### State Management
- **React State**: Lives, score, level, game state, paddle position, balls array
- **Direct Manipulation**: Canvas rendering, particle effects, audio playback
- **Supabase**: High scores, leaderboards (via `useHighScores` hook)

---

## 🧪 Testing & Quality Assurance

### Performance Targets
- **Desktop**: 60 FPS (High Quality)
- **Mobile High-End**: 60 FPS (Medium Quality)
- **Mobile Low-End**: 30 FPS (Low Quality with reduced effects)

### Adaptive Quality System
Automatically adjusts visual effects based on real-time FPS monitoring:
- **High**: All effects, CRT scanlines, full particles
- **Medium**: Reduced particles, simplified effects
- **Low**: Minimal particles, no CRT, essential effects only

### Mobile Compatibility
- iOS Safari: Gesture prevention, touch zone mapping, fullscreen simulation
- Android Chrome: Native fullscreen API, standard touch events
- Orientation handling: Auto-pause on orientation change

---

## 📦 Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18.3.1 + TypeScript |
| **Rendering** | HTML5 Canvas 2D API |
| **Audio** | Web Audio API + HTMLAudioElement |
| **Backend** | Supabase (Lovable Cloud) |
| **Styling** | Tailwind CSS + Custom CSS |
| **Build** | Vite |
| **State** | React Hooks (useState, useEffect, useCallback, useRef) |
| **Router** | React Router DOM |

---

## 🎯 Design Principles

1. **Frame-Rate Independence**: Physics runs at fixed 60Hz, rendering interpolates
2. **Determinism**: Same inputs always produce same outputs (frame ticks, seeded RNG where applicable)
3. **Performance First**: Adaptive quality ensures playability on all devices
4. **Mobile-First Controls**: Touch zones, swipe gestures, gesture prevention
5. **Retro Aesthetics**: Pixel fonts, CRT effects, arcade physics
6. **Cloud-Native Scores**: Supabase integration for global leaderboards

---

## 📖 Next Steps

- **New to the codebase?** Start with [Architecture Overview](./ARCHITECTURE.md)
- **Want to understand physics?** Read [Game Engine](./GAME_ENGINE.md) and [Physics](./PHYSICS.md)
- **Adding features?** Check [Game Mechanics](./GAME_MECHANICS.md) and relevant system docs
- **Debugging?** See [Performance Optimization](./PERFORMANCE.md) and [File Reference](./FILE_REFERENCE.md)

---

**Last Updated**: 2025-01-18  
**Maintainer**: Development Team  
**License**: Proprietary
