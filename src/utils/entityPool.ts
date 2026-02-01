/**
 * Generic Entity Pool for object reuse
 * Reduces GC pressure by reusing objects instead of creating/destroying them
 */

export interface Poolable {
  active?: boolean;
  [key: string]: any;
}

export class EntityPool<T extends Poolable> {
  private pool: T[] = [];
  private activeList: T[] = [];
  private maxPoolSize: number;
  private factory: () => T;
  private resetFn: (obj: T) => void;

  constructor(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 50,
    maxSize: number = 200
  ) {
    this.factory = factory;
    this.resetFn = reset;
    this.maxPoolSize = maxSize;
    this.preallocate(initialSize);
  }

  private preallocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquire an object from the pool, applying initialization properties
   * Returns null if pool is exhausted
   */
  acquire(init: Partial<T>): T | null {
    let obj: T;

    if (this.pool.length > 0) {
      obj = this.pool.pop()!;
    } else if (this.activeList.length < this.maxPoolSize) {
      obj = this.factory();
    } else {
      return null; // Pool exhausted
    }

    // Apply initialization
    Object.assign(obj, init);
    obj.active = true;
    this.activeList.push(obj);
    return obj;
  }

  /**
   * Release an object back to the pool
   * Uses swap-and-pop for O(1) removal
   */
  release(obj: T): void {
    const idx = this.activeList.indexOf(obj);
    if (idx !== -1) {
      // Swap-and-pop for O(1) removal
      const last = this.activeList.length - 1;
      if (idx !== last) {
        this.activeList[idx] = this.activeList[last];
      }
      this.activeList.pop();
      this.resetFn(obj);
      this.pool.push(obj);
    }
  }

  /**
   * Get array of currently active objects
   */
  getActive(): T[] {
    return this.activeList;
  }

  /**
   * Release all active objects back to the pool
   */
  releaseAll(): void {
    for (let i = this.activeList.length - 1; i >= 0; i--) {
      const obj = this.activeList[i];
      this.resetFn(obj);
      this.pool.push(obj);
    }
    this.activeList.length = 0;
  }

  /**
   * Get pool statistics for debugging
   */
  getStats(): { active: number; pooled: number } {
    return {
      active: this.activeList.length,
      pooled: this.pool.length
    };
  }
}

// ===================== Pool Instances =====================

import type { PowerUp, PowerUpType, Bullet, Bomb, ProjectileType, Enemy, EnemyType, BonusLetter, BonusLetterType } from "@/types/game";

/**
 * Power-up pool
 * Max 50 power-ups active at once (generous limit)
 */
export const powerUpPool = new EntityPool<PowerUp>(
  () => ({
    x: 0,
    y: 0,
    width: 61,
    height: 61,
    type: "multiball" as PowerUpType,
    speed: 2,
    active: false,
    isMercyLife: false
  }),
  (p) => {
    p.active = false;
    p.isMercyLife = false;
  },
  20,
  50
);

/**
 * Bullet pool
 * Max 100 bullets for intense turret action
 */
export const bulletPool = new EntityPool<Bullet>(
  () => ({
    x: 0,
    y: 0,
    width: 4,
    height: 12,
    speed: 7,
    isBounced: false,
    isSuper: false
  }),
  (b) => {
    b.isBounced = false;
    b.isSuper = false;
  },
  30,
  100
);

/**
 * Bomb pool for boss attacks
 * Max 60 bombs during intense boss fights
 */
export const bombPool = new EntityPool<Bomb>(
  () => ({
    id: 0,
    x: 0,
    y: 0,
    width: 12,
    height: 12,
    speed: 3,
    type: "bomb" as ProjectileType,
    isReflected: false,
    dx: undefined,
    dy: undefined,
    enemyId: undefined
  }),
  (b) => {
    b.isReflected = false;
    b.dx = undefined;
    b.dy = undefined;
    b.enemyId = undefined;
  },
  20,
  60
);

/**
 * Enemy pool
 * Max 40 enemies (plenty for normal gameplay)
 */
export const enemyPool = new EntityPool<Enemy>(
  () => ({
    id: 0,
    type: "cube" as EnemyType,
    x: 0,
    y: 0,
    width: 30,
    height: 30,
    rotation: 0,
    rotationX: 0,
    rotationY: 0,
    rotationZ: 0,
    speed: 1.5,
    dx: 0,
    dy: 1.5,
    hits: undefined,
    isAngry: false,
    isCrossBall: false,
    isLargeSphere: false,
    spawnTime: undefined
  }),
  (e) => {
    e.hits = undefined;
    e.isAngry = false;
    e.isCrossBall = false;
    e.isLargeSphere = false;
    e.spawnTime = undefined;
  },
  15,
  40
);

/**
 * Bonus letter pool
 * Max 30 letters (QUMRAN has 6, so even 5x would be 30)
 */
export const bonusLetterPool = new EntityPool<BonusLetter>(
  () => ({
    x: 0,
    y: 0,
    originX: 0,
    spawnTime: 0,
    width: 50,
    height: 50,
    type: "Q" as BonusLetterType,
    speed: 1.5,
    active: false
  }),
  (l) => {
    l.active = false;
  },
  10,
  30
);

/**
 * Reset all pools - call on game reset or level change
 */
export function resetAllPools(): void {
  powerUpPool.releaseAll();
  bulletPool.releaseAll();
  bombPool.releaseAll();
  enemyPool.releaseAll();
  bonusLetterPool.releaseAll();
}

/**
 * Get combined pool statistics
 */
export function getAllPoolStats(): Record<string, { active: number; pooled: number }> {
  return {
    powerUps: powerUpPool.getStats(),
    bullets: bulletPool.getStats(),
    bombs: bombPool.getStats(),
    enemies: enemyPool.getStats(),
    bonusLetters: bonusLetterPool.getStats()
  };
}
