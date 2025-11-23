// Collision History Recording System
// Stores last 50 collisions with full state snapshots for debugging

export interface CollisionHistoryEntry {
  timestamp: number; // performance.now()
  frameNumber: number; // game frame counter
  objectType: 'wall' | 'brick' | 'paddle' | 'enemy' | 'corner';
  objectId: number | string;
  objectMeta?: { 
    type?: string; 
    isIndestructible?: boolean; 
    hitsRemaining?: number;
    enemyType?: string;
  };
  
  // Ball state BEFORE CCD processing
  ballBefore: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
    isFireball: boolean;
  };
  
  // Ball state AFTER CCD processing
  ballAfter: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    speed: number;
  };
  
  // Collision details
  collisionPoint: { x: number; y: number };
  collisionNormal: { x: number; y: number };
  reflectionApplied: boolean;
  
  // Event processing
  isDuplicate: boolean;
  soundPlayed?: string;
}

class CollisionHistory {
  private history: CollisionHistoryEntry[] = [];
  private maxEntries = 50;

  addEntry(entry: CollisionHistoryEntry) {
    this.history.push(entry);
    // Keep only last 50 entries (circular buffer)
    if (this.history.length > this.maxEntries) {
      this.history.shift();
    }
  }

  getHistory(): CollisionHistoryEntry[] {
    return [...this.history]; // Return copy
  }

  exportToJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }

  clear() {
    this.history = [];
  }

  getLastN(n: number): CollisionHistoryEntry[] {
    return this.history.slice(-n);
  }
}

export const collisionHistory = new CollisionHistory();
