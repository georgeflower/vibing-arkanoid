import type { Particle } from "@/types/game";
import { getParticleLimits, type QualityLevel } from "./particleLimits";

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

  /**
   * Acquire a particle from the pool, respecting quality-based limits
   */
  acquire(props: Partial<Particle>, quality?: QualityLevel): Particle | null {
    // Check quality-based limits if quality is provided
    if (quality) {
      const limits = getParticleLimits(quality);
      if (this.activeParticles.length >= limits.maxTotal) {
        return null;
      }
    }

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

  /**
   * Acquire multiple particles for an explosion effect
   */
  acquireForExplosion(
    x: number,
    y: number,
    count: number,
    colors: string[],
    quality?: QualityLevel
  ): Particle[] {
    const particles: Particle[] = [];
    
    // Respect quality limits
    let maxCount = count;
    if (quality) {
      const limits = getParticleLimits(quality);
      const remaining = limits.maxTotal - this.activeParticles.length;
      maxCount = Math.min(count, remaining, limits.maxPerExplosion);
    }

    for (let i = 0; i < maxCount; i++) {
      const angle = (Math.PI * 2 * i) / maxCount + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      const size = 3 + Math.random() * 4;
      
      const particle = this.acquire({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 30,
        maxLife: 30,
      });
      
      if (particle) {
        particles.push(particle);
      }
    }
    
    return particles;
  }

  /**
   * Release a specific particle back to the pool
   */
  release(particle: Particle): void {
    const index = this.activeParticles.indexOf(particle);
    if (index !== -1) {
      this.activeParticles.splice(index, 1);
      this.pool.push(particle);
    }
  }

  /**
   * Release multiple particles back to the pool
   */
  releaseMany(particles: Particle[]): void {
    for (const particle of particles) {
      const index = this.activeParticles.indexOf(particle);
      if (index !== -1) {
        this.activeParticles.splice(index, 1);
        this.pool.push(particle);
      }
    }
  }

  getActive(): Particle[] {
    return this.activeParticles;
  }

  /**
   * Update particles in-place (mutates existing objects to avoid GC)
   * Returns particles that have expired
   */
  updateParticles(particles: Particle[], gravity: number = 0.2): Particle[] {
    const expired: Particle[] = [];
    
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += gravity;
      particle.life -= 1;
      
      if (particle.life <= 0) {
        expired.push(particle);
      }
    }
    
    return expired;
  }

  /**
   * Release expired particles and return living ones
   */
  filterAndRelease(particles: Particle[]): Particle[] {
    const living: Particle[] = [];
    
    for (const particle of particles) {
      if (particle.life > 0) {
        living.push(particle);
      } else {
        this.release(particle);
      }
    }
    
    return living;
  }

  releaseAll(): void {
    this.pool.push(...this.activeParticles);
    this.activeParticles = [];
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
