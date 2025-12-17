import type { Particle } from "@/types/game";

const DEFAULT_POOL_SIZE = 300;

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

  getActive(): Particle[] {
    return this.activeParticles;
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
