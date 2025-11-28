# Performance Optimization

Complete guide to performance optimization strategies, profiling, and adaptive quality system in Vibing Arkanoid.

---

## Overview

The game is designed to run at 60 FPS on desktop and high-end mobile, with graceful degradation to 30 FPS on low-end devices. An adaptive quality system automatically adjusts visual effects based on real-time performance.

---

## Performance Targets

### Desktop
- **Target**: 60 FPS (16.67ms per frame)
- **Quality**: High (all effects enabled)
- **Expected Hardware**: Integrated GPU or better

### Mobile High-End
- **Target**: 60 FPS
- **Quality**: Medium (reduced particles, maintained CRT)
- **Expected Devices**: iPhone 12+, flagship Android (2020+)

### Mobile Low-End
- **Target**: 30 FPS (33.33ms per frame)
- **Quality**: Low (minimal effects, no CRT)
- **Expected Devices**: Budget Android, older iPhones

---

## Adaptive Quality System

**File**: `src/hooks/useAdaptiveQuality.ts`

### Automatic Quality Adjustment

The system monitors FPS every 2 seconds and adjusts quality accordingly:

```typescript
const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');
const [fps, setFps] = useState(60);

useEffect(() => {
  let frameCount = 0;
  let lastTime = performance.now();
  
  const measureFPS = () => {
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastTime;
    
    if (elapsed >= 2000) { // 2-second measurement window
      const currentFPS = (frameCount / elapsed) * 1000;
      setFps(Math.round(currentFPS));
      
      // Adjust quality
      if (currentFPS >= 60) {
        setQuality('high');
      } else if (currentFPS >= 35) {
        setQuality('medium');
      } else if (currentFPS >= 25) {
        setQuality('low');
      }
      
      frameCount = 0;
      lastTime = now;
    }
    
    requestAnimationFrame(measureFPS);
  };
  
  const rafId = requestAnimationFrame(measureFPS);
  return () => cancelAnimationFrame(rafId);
}, []);
```

### Quality Presets

| Feature | High | Medium | Low |
|---------|------|--------|-----|
| **Particles per brick** | 12 | 6 | 3 |
| **Max particles** | 100 | 50 | 20 |
| **CRT effects** | ✓ | ✓ | ✗ |
| **Screen shake** | ✓ | ✓ | ✓ |
| **Explosions** | ✓ | ✓ | ✓ |
| **Boss detail** | Full 3D | Reduced | Minimal |
| **Shadow effects** | ✓ | ✓ | ✗ |
| **Canvas alpha** | Off | Off | Off |
| **Desynchronized** | ✓ | ✓ | ✓ |

---

## Frame Profiling

**File**: `src/utils/frameProfiler.ts`

### Frame Profiler API

```typescript
class FrameProfiler {
  private timings: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();
  
  // Start timing a subsystem
  startTiming(label: string): void {
    this.startTimes.set(label, performance.now());
  }
  
  // End timing and record duration
  endTiming(label: string): void {
    const startTime = this.startTimes.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.timings.set(label, duration);
      this.startTimes.delete(label);
    }
  }
  
  // Increment counter
  incrementCounter(label: string): void {
    const current = this.counters.get(label) || 0;
    this.counters.set(label, current + 1);
  }
  
  // Get stats
  getStats(): FrameProfilerData {
    return {
      fps: this.fps,
      timings: Object.fromEntries(this.timings),
      counters: Object.fromEntries(this.counters),
      bottlenecks: this.identifyBottlenecks()
    };
  }
  
  // Identify subsystems exceeding budget
  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const BUDGET_MS = 16.67; // 60 FPS target
    
    this.timings.forEach((time, label) => {
      if (time > BUDGET_MS * 0.3) { // 30% of frame budget
        bottlenecks.push(`${label}: ${time.toFixed(2)}ms`);
      }
    });
    
    return bottlenecks;
  }
}

export const frameProfiler = new FrameProfiler();
```

### Usage Example

```typescript
// In Game.tsx handleFixedUpdate
const handleFixedUpdate = (dt: number) => {
  frameProfiler.startFrame();
  
  frameProfiler.startTiming('physics');
  updatePhysics(dt);
  frameProfiler.endTiming('physics');
  
  frameProfiler.startTiming('collisions');
  processCollisions();
  frameProfiler.endTiming('collisions');
  
  frameProfiler.startTiming('rendering');
  render();
  frameProfiler.endTiming('rendering');
  
  frameProfiler.endFrame();
  
  if (debugSettings.enableFrameProfilerLogging) {
    frameProfiler.logStats();
  }
};
```

### Debug Overlay

**File**: `src/components/FrameProfilerOverlay.tsx`

Displays real-time profiling data:

```typescript
<div className="frame-profiler-overlay">
  <h3>Frame Profiler</h3>
  <div>FPS: {stats.fps}</div>
  <div>Physics: {stats.timings.physics?.toFixed(2)}ms</div>
  <div>Collisions: {stats.timings.collisions?.toFixed(2)}ms</div>
  <div>Rendering: {stats.timings.rendering?.toFixed(2)}ms</div>
  <div>Total: {stats.timings.total?.toFixed(2)}ms</div>
  
  <h4>Counters</h4>
  <div>Balls: {stats.counters.balls}</div>
  <div>Bricks: {stats.counters.bricks}</div>
  <div>Particles: {stats.counters.particles}</div>
  <div>Collisions: {stats.counters.collisions}</div>
  
  {stats.bottlenecks.length > 0 && (
    <div className="bottlenecks">
      <h4>Bottlenecks</h4>
      {stats.bottlenecks.map(b => <div key={b}>{b}</div>)}
    </div>
  )}
</div>
```

---

## Canvas Rendering Optimizations

### 1. Disable Alpha Channel

```typescript
const ctx = canvas.getContext('2d', {
  alpha: false  // Opaque background improves performance
});
```

**Benefit**: ~10-15% faster on some GPUs

### 2. Desynchronized Rendering

```typescript
const ctx = canvas.getContext('2d', {
  desynchronized: true  // Reduce input latency
});
```

**Benefit**: Lower input lag, smoother feel

### 3. Object Culling

Don't render off-screen objects:

```typescript
const drawBricks = () => {
  bricks.forEach(brick => {
    // Simple viewport check
    if (brick.y + brick.height < 0 || brick.y > CANVAS_HEIGHT) {
      return; // Skip off-screen bricks
    }
    
    drawBrick(brick);
  });
};
```

### 4. Batch Draw Calls

Group similar objects to minimize state changes:

```typescript
// BAD: Change fill style for every brick
bricks.forEach(brick => {
  ctx.fillStyle = brick.color;
  ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
});

// GOOD: Group by color
const bricksByColor = groupBy(bricks, 'color');
Object.entries(bricksByColor).forEach(([color, bricksGroup]) => {
  ctx.fillStyle = color;
  bricksGroup.forEach(brick => {
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
  });
});
```

### 5. Minimize State Changes

```typescript
// Avoid frequent save/restore
ctx.save();
drawComplexObject();
ctx.restore();

// Better: Manual state management
const prevFillStyle = ctx.fillStyle;
ctx.fillStyle = 'red';
drawObject();
ctx.fillStyle = prevFillStyle; // Restore manually
```

---

## Physics Optimizations

### 1. Fixed Time Step

**File**: `src/utils/gameLoop.ts`

Consistent physics regardless of frame rate:

```typescript
const FIXED_TIME_STEP = 1 / 60; // 16.67ms
let accumulator = 0;

const gameLoop = (currentTime: number) => {
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
  accumulator += deltaTime;
  
  while (accumulator >= FIXED_TIME_STEP) {
    fixedUpdate(FIXED_TIME_STEP);
    accumulator -= FIXED_TIME_STEP;
  }
  
  render(accumulator / FIXED_TIME_STEP); // Interpolation
  lastTime = currentTime;
  requestAnimationFrame(gameLoop);
};
```

### 2. Adaptive CCD Substeps

```typescript
const calculateSubsteps = (ball: Ball): number => {
  const MIN_SUBSTEPS = 1;
  const MAX_SUBSTEPS = 8;
  
  // More substeps for faster balls
  const substeps = Math.ceil(ball.speed / 4);
  return Math.min(MAX_SUBSTEPS, Math.max(MIN_SUBSTEPS, substeps));
};
```

**Benefit**: High-speed balls use more substeps (accurate), slow balls use fewer (faster)

### 3. Early Exit Optimizations

```typescript
// Exit early if no collision possible
const checkBrickCollision = (ball: Ball, brick: Brick): boolean => {
  // Broad-phase: AABB check
  const dx = Math.abs(ball.x - (brick.x + brick.width / 2));
  const dy = Math.abs(ball.y - (brick.y + brick.height / 2));
  
  if (dx > brick.width / 2 + ball.radius) return false;
  if (dy > brick.height / 2 + ball.radius) return false;
  
  // Narrow-phase: Precise collision
  return checkPreciseCollision(ball, brick);
};
```

---

## Memory Management

### 1. Object Pooling

Reuse objects instead of creating new ones:

```typescript
class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  
  acquire(): Particle {
    if (this.pool.length > 0) {
      const particle = this.pool.pop()!;
      this.active.push(particle);
      return particle;
    }
    
    const particle = createParticle();
    this.active.push(particle);
    return particle;
  }
  
  release(particle: Particle): void {
    const index = this.active.indexOf(particle);
    if (index !== -1) {
      this.active.splice(index, 1);
      this.pool.push(particle);
    }
  }
}
```

### 2. Particle Limits

**File**: `src/utils/particleLimits.ts`

```typescript
export const PARTICLE_LIMITS = {
  high: 100,
  medium: 50,
  low: 20
};

// In particle creation
if (particles.length >= PARTICLE_LIMITS[quality]) {
  particles.shift(); // Remove oldest particle
}
particles.push(newParticle);
```

### 3. Cleanup Intervals

```typescript
// Clean up expired objects every 500ms (not every frame)
useEffect(() => {
  const cleanupInterval = setInterval(() => {
    setShieldImpacts(prev => 
      prev.filter(impact => Date.now() - impact.timestamp < 500)
    );
  }, 500);
  
  return () => clearInterval(cleanupInterval);
}, []);
```

---

## Mobile Optimizations

### 1. Disable Logging on Mobile

```typescript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
  console.log = () => {}; // Disable console.log
  console.warn = () => {};
}
```

### 2. Reduce Performance Monitoring Frequency

```typescript
const PERFORMANCE_LOG_INTERVAL = isMobile ? 10000 : 5000; // 10s on mobile, 5s on desktop
```

### 3. Disable CRT Effects on Low Quality

```typescript
{quality !== 'low' && <CRTOverlay />}
```

### 4. Touch-Optimized Paddle Control

Zone-based mapping instead of direct pixel mapping:

```typescript
const CONTROL_ZONE_START = 0.15; // 15% of screen width
const CONTROL_ZONE_END = 0.85;   // 85% of screen width

const handleTouchMove = (e: TouchEvent) => {
  const touch = e.touches[0];
  const normalizedX = touch.clientX / window.innerWidth;
  
  // Map control zone to full paddle range
  const mappedX = mapRange(
    normalizedX,
    CONTROL_ZONE_START, CONTROL_ZONE_END,
    PADDLE_MIN_X, PADDLE_MAX_X
  );
  
  setPaddle(prev => ({ ...prev, x: mappedX }));
};
```

---

## Event Queue Optimization

**File**: `src/utils/eventQueue.ts`

### Frame Budget Management

```typescript
class EventQueue {
  private queue: GameEvent[] = [];
  private readonly MAX_EVENTS_PER_FRAME = 50;
  private readonly MAX_TIME_PER_FRAME = 5; // milliseconds
  
  process(): void {
    const startTime = performance.now();
    let processed = 0;
    
    // Sort by priority
    this.queue.sort((a, b) => b.priority - a.priority);
    
    while (this.queue.length > 0 && processed < this.MAX_EVENTS_PER_FRAME) {
      // Check time budget
      if (performance.now() - startTime > this.MAX_TIME_PER_FRAME) {
        break;
      }
      
      const event = this.queue.shift()!;
      this.processEvent(event);
      processed++;
    }
  }
}
```

**Benefit**: Prevents frame drops from event processing spikes

---

## Profiling Tools

### 1. Chrome DevTools Performance Panel

**Usage**:
1. Open DevTools (F12)
2. Go to "Performance" tab
3. Click "Record" (red circle)
4. Play game for 5-10 seconds
5. Click "Stop"
6. Analyze flame graph

**Key Metrics**:
- **FPS**: Should be 60 (green line)
- **Frame time**: Should be < 16.67ms
- **Long tasks**: Red flags indicating frame drops
- **Heap size**: Memory usage over time

### 2. React DevTools Profiler

**Usage**:
1. Install React DevTools extension
2. Open "Profiler" tab
3. Click "Record"
4. Interact with game
5. Click "Stop"
6. View component render times

**Optimization Targets**:
- Component render time < 5ms
- Minimize re-renders (use `React.memo`, `useCallback`)

### 3. Custom Frame Profiler

Enable with `§` key → "Frame Profiler" toggle

Displays:
- Subsystem timings (physics, rendering, events)
- Object counts (balls, bricks, particles)
- Bottleneck warnings (subsystems > 30% frame budget)

---

## Performance Checklist

### Pre-Launch
- [ ] Test on target devices (desktop, mobile high-end, mobile low-end)
- [ ] Profile with Chrome DevTools
- [ ] Enable frame profiler and check for bottlenecks
- [ ] Verify adaptive quality transitions smoothly
- [ ] Check memory usage doesn't grow over time (memory leaks)

### During Development
- [ ] Use `React.memo` for expensive components
- [ ] Use `useCallback` for functions passed to children
- [ ] Use `useMemo` for expensive calculations
- [ ] Minimize state updates (batch when possible)
- [ ] Avoid creating new objects in render loops

### Code Review
- [ ] No `console.log` in hot paths (game loop, collision detection)
- [ ] No unnecessary re-renders
- [ ] Proper cleanup in `useEffect` (intervals, listeners)
- [ ] Object pooling for frequently created/destroyed objects
- [ ] Refs used for high-frequency reads (avoid re-renders)

---

## Known Performance Issues

### Issue 1: Boss 3D Rendering
**Impact**: ~2ms per frame on low-end mobile  
**Mitigation**: Reduce detail level on low quality (fewer faces, simpler wireframes)

### Issue 2: Particle System
**Impact**: ~3-5ms per frame with 100 particles  
**Mitigation**: Adaptive particle limits based on quality

### Issue 3: Shield Cleanup Interval
**Impact**: 100ms cleanup caused stuttering  
**Solution**: Increased interval to 500-1000ms

---

## Future Optimizations

### 1. Web Workers
Move physics calculations to background thread:
```typescript
// physics-worker.js
self.addEventListener('message', (e) => {
  const { balls, bricks, dt } = e.data;
  const updatedBalls = processBallPhysics(balls, bricks, dt);
  self.postMessage({ balls: updatedBalls });
});
```

### 2. OffscreenCanvas
Render on background thread:
```typescript
const offscreen = canvas.transferControlToOffscreen();
const worker = new Worker('render-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);
```

### 3. WebGL Renderer
Switch from Canvas 2D to WebGL for better GPU utilization:
```typescript
const gl = canvas.getContext('webgl2');
// Render with shaders for particles, bricks, etc.
```

---

## Related Files

- `src/hooks/useAdaptiveQuality.ts` - Quality system
- `src/utils/frameProfiler.ts` - Performance profiling
- `src/utils/eventQueue.ts` - Event processing
- `src/utils/particleLimits.ts` - Particle constraints
- `src/components/FrameProfilerOverlay.tsx` - Debug UI

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
