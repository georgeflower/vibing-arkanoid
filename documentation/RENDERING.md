# Rendering & Graphics

Complete documentation of the Canvas 2D rendering system, visual effects, and graphical optimizations.

---

## Overview

Vibing Arkanoid uses HTML5 Canvas 2D API for all rendering. The game features retro pixel aesthetics with modern effects like 3D wireframe bosses, particle systems, screen shake, and CRT scanlines.

**Primary Rendering File**: `src/components/GameCanvas.tsx`

---

## Canvas Setup

### Canvas Configuration

```typescript
const canvas = canvasRef.current;
const ctx = canvas.getContext('2d', {
  alpha: false,           // Opaque background (performance boost)
  desynchronized: true    // Reduce input latency
});

canvas.width = CANVAS_WIDTH;   // 800px
canvas.height = CANVAS_HEIGHT; // 600px
```

### Coordinate System

- **Origin**: Top-left corner (0, 0)
- **X-Axis**: Left (0) to Right (800)
- **Y-Axis**: Top (0) to Bottom (600)
- **Units**: Pixels

---

## Rendering Pipeline

### Frame Rendering Order

```typescript
useEffect(() => {
  const render = () => {
    // 1. Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 2. Background flash (damage/boss defeat)
    if (backgroundFlash.active) {
      drawBackgroundFlash();
    }
    
    // 3. Bricks (back to front)
    drawBricks();
    
    // 4. Enemies and Bosses
    drawEnemies();
    drawBosses();
    
    // 5. Paddle
    drawPaddle();
    
    // 6. Shield (if active)
    drawShield();
    
    // 7. Balls
    balls.forEach(ball => drawBall(ball));
    
    // 8. Power-ups (falling)
    powerUps.forEach(p => drawPowerUp(p));
    
    // 9. Bullets (turret shots)
    bullets.forEach(b => drawBullet(b));
    
    // 10. Boss projectiles and lasers
    drawBossAttacks();
    
    // 11. Particles and explosions
    drawParticles();
    drawExplosions();
    
    // 12. Bonus letters
    bonusLetters.forEach(l => drawBonusLetter(l));
    
    // 13. Boss defeat animation
    if (bossDefeatAnimation.active) {
      drawBossDefeatEffect();
    }
    
    // 14. Apply screen shake transform
    if (screenShake.intensity > 0) {
      applyScreenShake();
    }
    
    requestAnimationFrame(render);
  };
  
  render();
}, [/* dependencies */]);
```

---

## Object Rendering

### Bricks

**Function**: `drawBricks()`

#### Normal Bricks

```typescript
// Gradient fill
const gradient = ctx.createLinearGradient(x, y, x, y + height);
gradient.addColorStop(0, lightenColor(color, 20));
gradient.addColorStop(1, darkenColor(color, 20));
ctx.fillStyle = gradient;
ctx.fillRect(x, y, width, height);

// Border
ctx.strokeStyle = darkenColor(color, 40);
ctx.lineWidth = 2;
ctx.strokeRect(x, y, width, height);

// Highlight
ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
ctx.fillRect(x + 4, y + 3, width - 8, 6);
```

#### Metal Bricks

Metal bricks "melt together" when adjacent:

```typescript
// Identify connected metal brick groups
const metalGroups = groupAdjacentMetalBricks(bricks);

metalGroups.forEach(group => {
  // Draw outer border only
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 3;
  drawGroupOutline(group);
  
  // Fill with metallic gradient
  const gradient = ctx.createLinearGradient(minX, minY, maxX, maxY);
  gradient.addColorStop(0, '#8a8a8a');
  gradient.addColorStop(0.5, '#666');
  gradient.addColorStop(1, '#444');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add rivets and hatching patterns spanning entire group
  drawMetalDetails(group);
});
```

#### Cracked Bricks

Three visual states based on `hitsRemaining`:

```typescript
if (brick.hitsRemaining === 3) {
  // Fresh brick - no cracks
  drawImage(ctx, crackedTexture1, x, y, width, height);
} else if (brick.hitsRemaining === 2) {
  // One crack
  drawImage(ctx, crackedTexture2, x, y, width, height);
} else {
  // Two cracks (about to break)
  drawImage(ctx, crackedTexture3, x, y, width, height);
}
```

**Texture Files**:
- `src/assets/brick-cracked-1.png`
- `src/assets/brick-cracked-2.png`
- `src/assets/brick-cracked-3.png`

#### Explosive Bricks

```typescript
// Red base color with pulsing glow
ctx.fillStyle = 'hsl(0, 100%, 50%)';
ctx.fillRect(x, y, width, height);

// Bomb emoji indicators (based on hitsRemaining)
ctx.font = '16px Arial';
const bombCount = brick.hitsRemaining || 1;
for (let i = 0; i < bombCount; i++) {
  ctx.fillText('💥', x + 10 + i * 18, y + 16);
}

// Pulsing border
const pulseAlpha = 0.5 + Math.sin(Date.now() / 200) * 0.5;
ctx.strokeStyle = `rgba(255, 255, 0, ${pulseAlpha})`;
ctx.lineWidth = 2;
ctx.strokeRect(x, y, width, height);
```

---

### Ball

**Function**: `drawBall(ball: Ball)`

#### 3D Gradient Sphere

```typescript
// Create radial gradient for 3D sphere effect
const gradient = ctx.createRadialGradient(
  ball.x - ball.radius * 0.3,  // Light source offset
  ball.y - ball.radius * 0.3,
  ball.radius * 0.1,
  ball.x,
  ball.y,
  ball.radius
);

if (ball.fireball) {
  // Fireball mode: Orange-red gradient
  gradient.addColorStop(0, '#ffff00');  // Yellow center
  gradient.addColorStop(0.3, '#ff9900'); // Orange
  gradient.addColorStop(0.7, '#ff3300'); // Red
  gradient.addColorStop(1, '#990000');   // Dark red edge
  
  // Trail particles
  createFireballTrail(ball);
} else {
  // Normal mode: White-silver gradient
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.3, '#e0e0e0');
  gradient.addColorStop(0.7, '#a0a0a0');
  gradient.addColorStop(1, '#606060');
}

ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
ctx.fill();

// Specular highlight
ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
ctx.beginPath();
ctx.arc(
  ball.x - ball.radius * 0.4,
  ball.y - ball.radius * 0.4,
  ball.radius * 0.3,
  0,
  Math.PI * 2
);
ctx.fill();
```

#### Rotation Animation

```typescript
// Update rotation angle based on velocity
ball.rotation = (ball.rotation || 0) + Math.abs(ball.vx + ball.vy) * 0.05;

// Apply to texture or pattern (if using)
ctx.save();
ctx.translate(ball.x, ball.y);
ctx.rotate(ball.rotation);
// ... draw ball at (0, 0) local coordinates
ctx.restore();
```

---

### Paddle

**Function**: `drawPaddle()`

#### Standard Paddle

```typescript
const x = paddle.x - paddle.width / 2;
const y = paddle.y - paddle.height / 2;
const radius = 8; // Rounded corners

// Draw rounded rectangle
ctx.beginPath();
ctx.moveTo(x + radius, y);
ctx.lineTo(x + width - radius, y);
ctx.arcTo(x + width, y, x + width, y + radius, radius);
ctx.lineTo(x + width, y + height - radius);
ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
ctx.lineTo(x + radius, y + height);
ctx.arcTo(x, y + height, x, y + height - radius, radius);
ctx.lineTo(x, y + radius);
ctx.arcTo(x, y, x + radius, y, radius);
ctx.closePath();

// Gradient fill
const gradient = ctx.createLinearGradient(x, y, x, y + height);
gradient.addColorStop(0, '#00ffff'); // Cyan top
gradient.addColorStop(1, '#0088ff'); // Blue bottom
ctx.fillStyle = gradient;
ctx.fill();

// Border
ctx.strokeStyle = '#0066cc';
ctx.lineWidth = 2;
ctx.stroke();
```

#### Turret Paddle

When turrets power-up is active:

```typescript
// Draw base paddle
drawPaddle();

// Draw turret cannons
const leftTurretX = paddle.x - paddle.width * 0.4;
const rightTurretX = paddle.x + paddle.width * 0.4;
const turretY = paddle.y - 8;

// Left turret
ctx.fillStyle = '#666';
ctx.fillRect(leftTurretX - 3, turretY, 6, 10);
ctx.fillStyle = '#ff9900'; // Orange barrel
ctx.fillRect(leftTurretX - 2, turretY - 5, 4, 6);

// Right turret
ctx.fillRect(rightTurretX - 3, turretY, 6, 10);
ctx.fillStyle = '#ff9900';
ctx.fillRect(rightTurretX - 2, turretY - 5, 4, 6);
```

---

### Bosses

**Function**: `drawBosses()`

#### Cube Boss (3D Wireframe)

```typescript
// Define 8 vertices of cube
const size = boss.size;
const vertices = [
  [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], // Front face
  [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]      // Back face
];

// Apply 3D rotation (Y-axis)
const rotated = vertices.map(([x, y, z]) => {
  const cos = Math.cos(boss.rotation);
  const sin = Math.sin(boss.rotation);
  return [
    x * cos - z * sin,
    y,
    x * sin + z * cos
  ];
});

// Project to 2D
const projected = rotated.map(([x, y, z]) => {
  const scale = 300 / (300 + z * 50); // Perspective
  return [
    boss.x + x * size * scale,
    boss.y + y * size * scale,
    z // Depth for face sorting
  ];
});

// Define 6 faces (4 vertices each)
const faces = [
  [0, 1, 2, 3], // Front
  [1, 5, 6, 2], // Right
  [5, 4, 7, 6], // Back
  [4, 0, 3, 7], // Left
  [3, 2, 6, 7], // Top
  [4, 5, 1, 0]  // Bottom
];

// Sort faces by average depth (painter's algorithm)
const sortedFaces = faces.sort((a, b) => {
  const depthA = a.reduce((sum, i) => sum + projected[i][2], 0) / 4;
  const depthB = b.reduce((sum, i) => sum + projected[i][2], 0) / 4;
  return depthA - depthB; // Back to front
});

// Draw faces
sortedFaces.forEach((face, faceIndex) => {
  ctx.beginPath();
  face.forEach((vertexIndex, i) => {
    const [x, y] = projected[vertexIndex];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  
  // Face color (gradient based on depth and face)
  const baseColor = boss.angry ? 'hsl(0, 80%, 50%)' : 'hsl(200, 80%, 50%)';
  ctx.fillStyle = baseColor;
  ctx.fill();
  
  // Pixel grid overlay (quality-dependent)
  if (quality === 'high') {
    drawPixelGrid(face, projected);
  }
  
  // Edge outlines
  ctx.strokeStyle = boss.angry ? '#ff0000' : '#00ffff';
  ctx.lineWidth = 3;
  ctx.stroke();
});

// Rotate for next frame
boss.rotation += 0.02;
```

#### Sphere Boss

```typescript
// Draw as gradient circle with wireframe lattitude/longitude lines
ctx.beginPath();
ctx.arc(boss.x, boss.y, boss.size, 0, Math.PI * 2);

// Gradient fill
const gradient = ctx.createRadialGradient(
  boss.x - boss.size * 0.3,
  boss.y - boss.size * 0.3,
  0,
  boss.x,
  boss.y,
  boss.size
);
gradient.addColorStop(0, boss.angry ? '#ff6666' : '#66ffff');
gradient.addColorStop(1, boss.angry ? '#990000' : '#0066cc');
ctx.fillStyle = gradient;
ctx.fill();

// Wireframe lines (latitude)
for (let lat = -boss.size * 0.8; lat <= boss.size * 0.8; lat += boss.size / 4) {
  ctx.beginPath();
  ctx.ellipse(boss.x, boss.y + lat, boss.size, boss.size / 4, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// Wireframe lines (longitude)
for (let i = 0; i < 8; i++) {
  const angle = (i / 8) * Math.PI * 2;
  ctx.beginPath();
  ctx.ellipse(boss.x, boss.y, boss.size, boss.size, angle, 0, Math.PI * 2);
  ctx.stroke();
}
```

#### Pyramid Boss

```typescript
// Define 5 vertices (4 base corners + 1 apex)
const baseSize = boss.size;
const height = boss.size * 1.5;

const vertices = [
  [0, -height],                      // Apex (top)
  [-baseSize, baseSize],             // Base: bottom-left
  [baseSize, baseSize],              // Base: bottom-right
  [baseSize, -baseSize],             // Base: top-right
  [-baseSize, -baseSize]             // Base: top-left
];

// Apply rotation
const rotated = vertices.map(([x, y]) => {
  const cos = Math.cos(boss.rotation);
  const sin = Math.sin(boss.rotation);
  return [
    boss.x + x * cos - y * sin,
    boss.y + x * sin + y * cos
  ];
});

// Define 4 triangular faces
const faces = [
  [0, 1, 2], // Front-left
  [0, 2, 3], // Front-right
  [0, 3, 4], // Back-right
  [0, 4, 1]  // Back-left
];

// Draw base square
ctx.beginPath();
ctx.moveTo(...rotated[1]);
ctx.lineTo(...rotated[2]);
ctx.lineTo(...rotated[3]);
ctx.lineTo(...rotated[4]);
ctx.closePath();
ctx.fillStyle = boss.angry ? '#663333' : '#336666';
ctx.fill();

// Draw triangular faces
faces.forEach(face => {
  ctx.beginPath();
  face.forEach((vIndex, i) => {
    if (i === 0) ctx.moveTo(...rotated[vIndex]);
    else ctx.lineTo(...rotated[vIndex]);
  });
  ctx.closePath();
  ctx.fillStyle = boss.angry ? '#ff3333' : '#33ffff';
  ctx.fill();
  ctx.strokeStyle = boss.angry ? '#ff0000' : '#00ffff';
  ctx.lineWidth = 2;
  ctx.stroke();
});

boss.rotation += 0.03;
```

---

## Visual Effects

### Screen Shake

**File**: `src/components/Game.tsx`

```typescript
interface ScreenShake {
  intensity: number;    // 0-10 pixels
  duration: number;     // milliseconds
  decay: number;        // reduction per frame
}

// Trigger shake
const triggerScreenShake = (intensity: number, duration: number) => {
  setScreenShake({
    intensity,
    duration,
    decay: intensity / (duration / 16.67) // Decay over duration at 60fps
  });
};

// Apply to canvas transform
useEffect(() => {
  if (screenShake.intensity > 0) {
    const offsetX = (Math.random() - 0.5) * screenShake.intensity * 2;
    const offsetY = (Math.random() - 0.5) * screenShake.intensity * 2;
    
    ctx.save();
    ctx.translate(offsetX, offsetY);
    // ... render everything
    ctx.restore();
    
    // Decay
    setScreenShake(prev => ({
      ...prev,
      intensity: Math.max(0, prev.intensity - prev.decay)
    }));
  }
}, [screenShake]);
```

### Background Flash

```typescript
interface BackgroundFlash {
  active: boolean;
  color: string;
  alpha: number;  // 0-1
  decay: number;  // reduction per frame
}

// Draw flash overlay
if (backgroundFlash.active) {
  ctx.fillStyle = `${backgroundFlash.color}${Math.floor(backgroundFlash.alpha * 255).toString(16).padStart(2, '0')}`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  
  // Decay alpha
  setBackgroundFlash(prev => ({
    ...prev,
    alpha: Math.max(0, prev.alpha - prev.decay),
    active: prev.alpha > 0.01
  }));
}
```

---

## Particle Systems

**File**: `src/components/GameCanvas.tsx`

### Particle Structure

```typescript
interface Particle {
  x: number;
  y: number;
  vx: number;      // velocity X
  vy: number;      // velocity Y
  life: number;    // 0-1 (1 = just created, 0 = dead)
  decay: number;   // life reduction per frame
  color: string;
  size: number;
}
```

### Brick Destruction Particles

```typescript
const createBrickParticles = (brick: Brick) => {
  const particleCount = quality === 'high' ? 12 : quality === 'medium' ? 6 : 3;
  
  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    
    particles.push({
      x: brick.x + brick.width / 2,
      y: brick.y + brick.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1.0,
      decay: 0.02,
      color: brick.color,
      size: 3 + Math.random() * 3
    });
  }
};
```

### Particle Rendering

```typescript
const drawParticles = () => {
  particles.forEach((p, index) => {
    if (p.life <= 0) {
      particles.splice(index, 1);
      return;
    }
    
    // Update position
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.2; // Gravity
    p.life -= p.decay;
    
    // Draw with fade-out
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  });
};
```

### Particle Limits (Quality-Based)

**File**: `src/utils/particleLimits.ts`

```typescript
export const PARTICLE_LIMITS = {
  high: 100,
  medium: 50,
  low: 20
};

// In particle creation logic
if (particles.length >= PARTICLE_LIMITS[quality]) {
  particles.shift(); // Remove oldest
}
```

---

## Explosions

**File**: `src/components/GameCanvas.tsx`

### Explosion Structure

```typescript
interface Explosion {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  growth: number;   // pixels per frame
  alpha: number;    // 0-1
  decay: number;
}
```

### Explosive Brick Chain Reaction

```typescript
const createExplosion = (x: number, y: number) => {
  explosions.push({
    x,
    y,
    radius: 0,
    maxRadius: BRICK_WIDTH * 1.5, // 1.5 brick radius
    growth: 8,
    alpha: 1.0,
    decay: 0.05
  });
  
  // Find bricks within explosion radius
  const affectedBricks = bricks.filter(brick => {
    const dx = brick.x + brick.width / 2 - x;
    const dy = brick.y + brick.height / 2 - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= BRICK_WIDTH * 1.5;
  });
  
  // Destroy affected bricks (triggers power-ups, score, etc.)
  affectedBricks.forEach(brick => {
    destroyBrick(brick);
    if (brick.type === 'explosive') {
      // Chain reaction!
      setTimeout(() => createExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2), 100);
    }
  });
};
```

### Explosion Rendering

```typescript
const drawExplosions = () => {
  explosions.forEach((exp, index) => {
    if (exp.alpha <= 0 || exp.radius >= exp.maxRadius) {
      explosions.splice(index, 1);
      return;
    }
    
    // Expand
    exp.radius += exp.growth;
    exp.alpha -= exp.decay;
    
    // Draw expanding circle
    ctx.globalAlpha = exp.alpha;
    
    // Outer ring (fire)
    ctx.strokeStyle = '#ff9900';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner glow (yellow)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.globalAlpha = 1.0;
  });
};
```

---

## Shield Visuals

**File**: `src/components/GameCanvas.tsx`

### Animated Force Field

```typescript
const drawShield = () => {
  if (!shieldActive) return;
  
  const paddleBounds = {
    x: paddle.x - paddle.width / 2 - 10,
    y: paddle.y - paddle.height / 2 - 10,
    width: paddle.width + 20,
    height: paddle.height + 20
  };
  
  // Pulsing glow
  const pulsePhase = (Date.now() / 500) % (Math.PI * 2);
  const glowIntensity = 0.3 + Math.sin(pulsePhase) * 0.2;
  
  // Outer glow
  ctx.shadowBlur = 20;
  ctx.shadowColor = `rgba(255, 255, 0, ${glowIntensity})`;
  ctx.strokeStyle = `rgba(255, 255, 0, ${glowIntensity * 0.8})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(paddleBounds.x, paddleBounds.y, paddleBounds.width, paddleBounds.height);
  
  // Electrical arcs (animate around perimeter)
  const arcCount = 8;
  for (let i = 0; i < arcCount; i++) {
    const progress = ((Date.now() / 1000) + i / arcCount) % 1;
    const perimeter = 2 * (paddleBounds.width + paddleBounds.height);
    const arcPos = progress * perimeter;
    
    let arcX, arcY;
    if (arcPos < paddleBounds.width) {
      // Top edge
      arcX = paddleBounds.x + arcPos;
      arcY = paddleBounds.y;
    } else if (arcPos < paddleBounds.width + paddleBounds.height) {
      // Right edge
      arcX = paddleBounds.x + paddleBounds.width;
      arcY = paddleBounds.y + (arcPos - paddleBounds.width);
    } else if (arcPos < 2 * paddleBounds.width + paddleBounds.height) {
      // Bottom edge
      arcX = paddleBounds.x + paddleBounds.width - (arcPos - paddleBounds.width - paddleBounds.height);
      arcY = paddleBounds.y + paddleBounds.height;
    } else {
      // Left edge
      arcX = paddleBounds.x;
      arcY = paddleBounds.y + paddleBounds.height - (arcPos - 2 * paddleBounds.width - paddleBounds.height);
    }
    
    // Draw arc spark
    ctx.beginPath();
    ctx.arc(arcX, arcY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
  }
  
  // Reset shadow
  ctx.shadowBlur = 0;
  
  // Semi-transparent inner fill
  ctx.fillStyle = `rgba(255, 255, 0, ${glowIntensity * 0.1})`;
  ctx.fillRect(paddleBounds.x, paddleBounds.y, paddleBounds.width, paddleBounds.height);
};
```

### Shield Impact Effects

```typescript
interface ShieldImpact {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  timestamp: number;
}

const shieldImpacts: ShieldImpact[] = [];

// When ball/projectile hits shield
const createShieldImpact = (x: number, y: number) => {
  shieldImpacts.push({
    x,
    y,
    radius: 5,
    alpha: 1.0,
    timestamp: Date.now()
  });
};

// Render impacts
const drawShieldImpacts = () => {
  const now = Date.now();
  shieldImpacts.forEach((impact, index) => {
    const age = now - impact.timestamp;
    if (age > 500) {
      shieldImpacts.splice(index, 1);
      return;
    }
    
    impact.radius += 1;
    impact.alpha -= 0.02;
    
    ctx.globalAlpha = impact.alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(impact.x, impact.y, impact.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  });
};
```

---

## CRT Overlay

**File**: `src/components/CRTOverlay.tsx`

### Scanline Effect

```css
.scanlines {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15),
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 2px
  );
  animation: scanline 8s linear infinite;
}

@keyframes scanline {
  0% {
    transform: translateY(0);
  }
  100% {
    transform: translateY(100%);
  }
}
```

### Screen Curvature

```css
.crt-curve {
  transform: perspective(400px) rotateX(0.5deg);
  border-radius: 2%;
}
```

### Flicker Effect

```css
@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.98; }
}

.crt-flicker {
  animation: flicker 0.15s infinite;
}
```

### Quality-Based Disabling

CRT effects are automatically disabled on low quality:

```typescript
{quality !== 'low' && <CRTOverlay />}
```

---

## Performance Optimizations

### Canvas Rendering Optimizations

1. **Alpha Channel Disabled**: `alpha: false` in canvas context
2. **Desynchronized Rendering**: `desynchronized: true` reduces input lag
3. **Object Culling**: Don't render off-screen objects
4. **Batch Draw Calls**: Group similar objects (e.g., all bricks)
5. **Minimize State Changes**: Reduce `fillStyle`, `strokeStyle` changes

### Quality-Dependent Features

| Feature | High | Medium | Low |
|---------|------|--------|-----|
| Particles per brick | 12 | 6 | 3 |
| Max particles | 100 | 50 | 20 |
| CRT Effects | ✓ | ✓ | ✗ |
| Screen Shake | ✓ | ✓ | ✓ |
| Boss Detail Level | Full | Reduced | Minimal |
| Shadow Effects | ✓ | ✓ | ✗ |

### Frame Budget Management

```typescript
const MAX_FRAME_TIME = 16.67; // 60 FPS target

const render = () => {
  const frameStart = performance.now();
  
  // ... render everything
  
  const frameTime = performance.now() - frameStart;
  if (frameTime > MAX_FRAME_TIME) {
    console.warn(`Frame took ${frameTime.toFixed(2)}ms (budget: ${MAX_FRAME_TIME}ms)`);
  }
};
```

---

## Image Assets

### Power-up Icons

**File**: `src/utils/powerUpImages.ts`

Loaded as HTMLImageElement for canvas rendering:
- `src/assets/powerup-multiball.png`
- `src/assets/powerup-turrets.png`
- `src/assets/powerup-fireball.png`
- `src/assets/powerup-life.png`
- `src/assets/powerup-slowdown.png`
- `src/assets/powerup-extend.png`
- `src/assets/powerup-shrink.png`
- `src/assets/powerup-shield.png`

### Bonus Letter Icons

**File**: `src/utils/bonusLetterImages.ts`

- `src/assets/bonus-q.png` (Q)
- `src/assets/bonus-u.png` (U)
- `src/assets/bonus-m.png` (M)
- `src/assets/bonus-r.png` (R)
- `src/assets/bonus-a.png` (A)
- `src/assets/bonus-n.png` (N)

### Brick Textures

- `src/assets/brick-cracked-1.png` (3 hits remaining)
- `src/assets/brick-cracked-2.png` (2 hits remaining)
- `src/assets/brick-cracked-3.png` (1 hit remaining)

### Other Assets

- `src/assets/metal-ball-texture.png` (optional ball texture)
- `src/assets/paddle.png` (base paddle sprite)
- `src/assets/paddle-turrets.png` (turret paddle sprite)

---

## Related Files

- `src/components/GameCanvas.tsx` - Main rendering engine
- `src/components/CRTOverlay.tsx` - Retro visual effects
- `src/hooks/useAdaptiveQuality.ts` - Quality management
- `src/utils/particleLimits.ts` - Performance constraints
- `src/constants/game.ts` - Visual constants (colors, dimensions)

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
