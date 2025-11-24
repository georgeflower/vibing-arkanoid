/**
 * Event Queue - Phase 2 of Performance Optimization System
 * 
 * Manages game events with priority-based processing and budget controls
 * to prevent frame spikes from too many events in a single frame.
 */

export type EventPriority = 'high' | 'medium' | 'low';

export interface GameEvent {
  id: string;
  type: string;
  priority: EventPriority;
  timestamp: number;
  data: any;
  handler: (data: any) => void;
}

const MAX_EVENTS_PER_FRAME = 50; // Process max 50 events per frame
const EVENT_TIME_BUDGET_MS = 5; // Max 5ms per frame for event processing

class EventQueue {
  private queue: GameEvent[] = [];
  private enabled: boolean = true;

  enqueue(event: Omit<GameEvent, 'timestamp'>): void {
    this.queue.push({
      ...event,
      timestamp: performance.now(),
    });

    // Sort by priority (high -> medium -> low) and timestamp (older first)
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }

  process(): { processed: number; remaining: number; timeSpent: number } {
    if (!this.enabled || this.queue.length === 0) {
      return { processed: 0, remaining: 0, timeSpent: 0 };
    }

    const startTime = performance.now();
    let processed = 0;
    let timeSpent = 0;

    while (
      this.queue.length > 0 &&
      processed < MAX_EVENTS_PER_FRAME &&
      timeSpent < EVENT_TIME_BUDGET_MS
    ) {
      const event = this.queue.shift();
      if (!event) break;

      try {
        event.handler(event.data);
        processed++;
      } catch (error) {
        console.error(`[EventQueue] Error processing event ${event.type}:`, error);
      }

      timeSpent = performance.now() - startTime;
    }

    return {
      processed,
      remaining: this.queue.length,
      timeSpent,
    };
  }

  clear(): void {
    this.queue = [];
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

// Singleton instance
export const eventQueue = new EventQueue();

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  (window as any).eventQueue = eventQueue;
}
