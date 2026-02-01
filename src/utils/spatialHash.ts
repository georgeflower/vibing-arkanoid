/**
 * Spatial Hash Grid for efficient collision broadphase
 * Reduces O(n) collision checks to O(k) where k = nearby objects
 */

export interface SpatialHashConfig {
  cellSize: number;  // Typically 2x brick width (~112px)
  width: number;     // Canvas width
  height: number;    // Canvas height
}

export interface SpatialHashable {
  x: number;
  y: number;
  width: number;
  height: number;
  visible?: boolean;
  id?: number;
}

export class SpatialHash<T extends SpatialHashable> {
  private cells: Map<number, T[]> = new Map();
  private cellSize: number;
  private cols: number;
  private rows: number;
  private objectToKeys: Map<T, number[]> = new Map();

  constructor(config: SpatialHashConfig) {
    this.cellSize = config.cellSize;
    this.cols = Math.ceil(config.width / config.cellSize);
    this.rows = Math.ceil(config.height / config.cellSize);
  }

  /**
   * Get cell key from column and row
   */
  private getCellKey(col: number, row: number): number {
    return row * this.cols + col;
  }

  /**
   * Get all cell keys an object overlaps
   */
  private getObjectCellKeys(obj: T): number[] {
    const minCol = Math.max(0, Math.floor(obj.x / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((obj.x + obj.width) / this.cellSize));
    const minRow = Math.max(0, Math.floor(obj.y / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((obj.y + obj.height) / this.cellSize));

    const keys: number[] = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        keys.push(this.getCellKey(col, row));
      }
    }
    return keys;
  }

  /**
   * Check if two AABBs overlap
   */
  private overlaps(obj: T, aabb: { x: number; y: number; w: number; h: number }): boolean {
    return !(
      obj.x + obj.width < aabb.x ||
      obj.x > aabb.x + aabb.w ||
      obj.y + obj.height < aabb.y ||
      obj.y > aabb.y + aabb.h
    );
  }

  /**
   * Insert an object into the grid
   */
  insert(obj: T): void {
    const keys = this.getObjectCellKeys(obj);
    this.objectToKeys.set(obj, keys);

    for (const key of keys) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = [];
        this.cells.set(key, cell);
      }
      cell.push(obj);
    }
  }

  /**
   * Remove an object from the grid
   */
  remove(obj: T): void {
    const keys = this.objectToKeys.get(obj);
    if (!keys) return;

    for (const key of keys) {
      const cell = this.cells.get(key);
      if (cell) {
        const idx = cell.indexOf(obj);
        if (idx !== -1) {
          // Swap and pop for O(1) removal
          const last = cell.length - 1;
          if (idx !== last) {
            cell[idx] = cell[last];
          }
          cell.pop();
        }
      }
    }

    this.objectToKeys.delete(obj);
  }

  /**
   * Clear all objects
   */
  clear(): void {
    this.cells.clear();
    this.objectToKeys.clear();
  }

  /**
   * Query objects overlapping an AABB
   * Used for swept ball collision broadphase
   */
  query(aabb: { x: number; y: number; w: number; h: number }): T[] {
    const minCol = Math.max(0, Math.floor(aabb.x / this.cellSize));
    const maxCol = Math.min(this.cols - 1, Math.floor((aabb.x + aabb.w) / this.cellSize));
    const minRow = Math.max(0, Math.floor(aabb.y / this.cellSize));
    const maxRow = Math.min(this.rows - 1, Math.floor((aabb.y + aabb.h) / this.cellSize));

    const seen = new Set<T>();
    const results: T[] = [];

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const key = this.getCellKey(col, row);
        const cell = this.cells.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            const obj = cell[i];
            if (!seen.has(obj) && obj.visible !== false) {
              seen.add(obj);
              // Fine-grained AABB check
              if (this.overlaps(obj, aabb)) {
                results.push(obj);
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Rebuild from array (for level load)
   */
  rebuild(objects: T[]): void {
    this.clear();
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.visible !== false) {
        this.insert(obj);
      }
    }
  }

  /**
   * Mark object as invisible and remove from hash
   * More efficient than full rebuild for single brick destruction
   */
  markInvisible(obj: T): void {
    this.remove(obj);
  }

  /**
   * Update configuration (for canvas resize)
   */
  reconfigure(config: SpatialHashConfig): void {
    this.cellSize = config.cellSize;
    this.cols = Math.ceil(config.width / config.cellSize);
    this.rows = Math.ceil(config.height / config.cellSize);
    // Note: caller should rebuild after reconfigure
  }

  /**
   * Get statistics for debugging
   */
  getStats(): { cells: number; objects: number; avgPerCell: number } {
    let totalObjects = 0;
    let cellCount = 0;

    this.cells.forEach(cell => {
      if (cell.length > 0) {
        cellCount++;
        totalObjects += cell.length;
      }
    });

    return {
      cells: cellCount,
      objects: this.objectToKeys.size,
      avgPerCell: cellCount > 0 ? totalObjects / cellCount : 0
    };
  }
}

// ===================== Singleton Instance for Bricks =====================

import type { Brick } from "@/types/game";

// Default config - will be reconfigured when canvas size is known
export const brickSpatialHash = new SpatialHash<Brick>({
  cellSize: 112, // ~2x brick width for optimal cell size
  width: 850,    // Default canvas width
  height: 650    // Default canvas height
});
