import type { Particle, EnemyType } from "@/types/game";

const DEFAULT_POOL_SIZE = 500;

// Pre-defined color palettes to avoid string creation
const COLOR_PALETTES: Record<EnemyType | 'brick' | 'default', string[]> = {
  cube: ["hsl(200, 100%, 60%)", "hsl(180, 100%, 50%)", "hsl(220, 100%, 70%)"],
  sphere: ["hsl(330, 100%, 60%)", "hsl(350, 100%, 65%)", "hsl(310, 100%, 55%)"],
  pyramid: ["hsl(280, 100%, 60%)", "hsl(260, 100%, 65%)", "hsl(300, 100%, 55%)"],
  crossBall: ["hsl(30, 100%, 60%)", "hsl(15, 100%, 55%)", "hsl(45, 100%, 65%)"], // Red/orange/yellow like cross projectiles
  brick: ["hsl(40, 100%, 60%)", "hsl(30, 100%, 55%)", "hsl(50, 100%, 65%)"],
  default: ["hsl(0, 0%, 100%)", "hsl(0, 0%, 80%)", "hsl(0, 0%, 90%)"]
};

class ParticlePool {
  private pool: Particle[] = [];
  private activeParticles: Particle[] = [];
  private maxPoolSize: number;

  constructor(initialSize: number = DEFAULT_POOL_SIZE) {
    this.maxPoolSize = initialSize;
    this.preallocate(initialSize);
  }

  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: "",
      life: 0,
      maxLife: 0,
    };
  }

  acquire(props: Partial<Particle>): Particle | null {
    let particle: Particle;

    if (this.pool.length > 0) {
      particle = this.pool.pop()!;
    } else if (this.activeParticles.length < this.maxPoolSize) {
      particle = this.createEmptyParticle();
    } else {
      // Pool exhausted, return null
      return null;
    }

    // Initialize particle with provided props
    particle.x = props.x ?? 0;
    particle.y = props.y ?? 0;
    particle.vx = props.vx ?? 0;
    particle.vy = props.vy ?? 0;
    particle.size = props.size ?? 3;
    particle.color = props.color ?? "white";
    particle.life = props.life ?? 1;
    particle.maxLife = props.maxLife ?? 1;

    this.activeParticles.push(particle);
    return particle;
  }

  // Acquire multiple particles for an explosion - optimized batch acquisition
  acquireForExplosion(x: number, y: number, count: number, enemyType?: EnemyType): void {
    const colors = COLOR_PALETTES[enemyType || 'default'];
    const colorCount = colors.length;
    
    for (let i = 0; i < count; i++) {
      let particle: Particle;
      
      if (this.pool.length > 0) {
        particle = this.pool.pop()!;
      } else if (this.activeParticles.length < this.maxPoolSize) {
        particle = this.createEmptyParticle();
      } else {
        // Pool exhausted
        return;
      }
      
      // Initialize particle in-place
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.size = 3 + Math.random() * 4;
      particle.color = colors[i % colorCount];
      particle.life = 30;
      particle.maxLife = 30;
      
      this.activeParticles.push(particle);
    }
  }

  // Acquire particles for game over effect
  acquireForGameOver(centerX: number, centerY: number, count: number): void {
    for (let i = 0; i < count; i++) {
      let particle: Particle;
      
      if (this.pool.length > 0) {
        particle = this.pool.pop()!;
      } else if (this.activeParticles.length < this.maxPoolSize) {
        particle = this.createEmptyParticle();
      } else {
        return;
      }
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const hue = Math.floor(Math.random() * 360);
      
      particle.x = centerX;
      particle.y = centerY;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.size = 2 + Math.random() * 4;
      particle.color = `hsl(${hue}, 70%, 60%)`;
      particle.life = 60;
      particle.maxLife = 60;
      
      this.activeParticles.push(particle);
    }
  }

  // Acquire particles for high score celebration
  acquireForHighScore(centerX: number, centerY: number, count: number): void {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#F7DC6F", "#BB8FCE"];
    const colorCount = colors.length;
    
    for (let i = 0; i < count; i++) {
      let particle: Particle;
      
      if (this.pool.length > 0) {
        particle = this.pool.pop()!;
      } else if (this.activeParticles.length < this.maxPoolSize) {
        particle = this.createEmptyParticle();
      } else {
        return;
      }
      
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 3 + Math.random() * 5;
      
      particle.x = centerX + (Math.random() - 0.5) * 200;
      particle.y = centerY + (Math.random() - 0.5) * 100;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed - 2;
      particle.size = 4 + Math.random() * 6;
      particle.color = colors[i % colorCount];
      particle.life = 120;
      particle.maxLife = 120;
      
      this.activeParticles.push(particle);
    }
  }

  // Optimized: swap-and-pop pattern (O(1) instead of O(n) splice)
  release(particle: Particle): void {
    const index = this.activeParticles.indexOf(particle);
    if (index !== -1) {
      const lastIndex = this.activeParticles.length - 1;
      if (index !== lastIndex) {
        // Swap with last element
        this.activeParticles[index] = this.activeParticles[lastIndex];
      }
      this.activeParticles.pop();
      this.pool.push(particle);
    }
  }

  // Release multiple particles efficiently
  releaseMany(particles: Particle[]): void {
    for (const particle of particles) {
      const index = this.activeParticles.indexOf(particle);
      if (index !== -1) {
        const lastIndex = this.activeParticles.length - 1;
        if (index !== lastIndex) {
          this.activeParticles[index] = this.activeParticles[lastIndex];
        }
        this.activeParticles.pop();
        this.pool.push(particle);
      }
    }
  }

  getActive(): Particle[] {
    return this.activeParticles;
  }

  // Optimized update: mutate in place, no new object creation
  updateParticles(gravity: number = 0.2): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      
      // Update position and velocity in place
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += gravity;
      particle.life -= 1;
      
      // Release expired particles using swap-and-pop
      if (particle.life <= 0) {
        const lastIndex = this.activeParticles.length - 1;
        if (i !== lastIndex) {
          this.activeParticles[i] = this.activeParticles[lastIndex];
        }
        this.activeParticles.pop();
        this.pool.push(particle);
      }
    }
  }

  // Optimized: iterate backwards and swap-and-pop to avoid array reallocation
  releaseExpired(): void {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      if (particle.life <= 0) {
        const lastIndex = this.activeParticles.length - 1;
        if (i !== lastIndex) {
          // Swap with last element
          this.activeParticles[i] = this.activeParticles[lastIndex];
        }
        this.activeParticles.pop();
        this.pool.push(particle);
      }
    }
  }

  update(): void {
    for (const particle of this.activeParticles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // gravity
      particle.life -= 0.02;
    }
    
    this.releaseExpired();
  }

  releaseAll(): void {
    // Push all active back to pool without creating new arrays
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      this.pool.push(this.activeParticles[i]);
    }
    this.activeParticles.length = 0; // Clear without deallocation
  }

  getStats(): { active: number; pooled: number; total: number } {
    return {
      active: this.activeParticles.length,
      pooled: this.pool.length,
      total: this.activeParticles.length + this.pool.length,
    };
  }
}

// Singleton instance
export const particlePool = new ParticlePool(DEFAULT_POOL_SIZE);
