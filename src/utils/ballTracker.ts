/**
 * Ball Position Tracker
 * 
 * Debug utility to track ball positions after boss collisions
 * to diagnose balls disappearing after hitting the boss.
 */

import type { Ball } from "@/types/game";

interface BallTrackingEvent {
  eventId: string;
  bossType: string;
  bossPosition: { x: number; y: number };
  bossSize: { width: number; height: number };
  collisionNormal: { x: number; y: number };
  initialPosition: { x: number; y: number };
  initialVelocity: { dx: number; dy: number };
  timestamps: {
    time: string;
    ms: number;
    position: { x: number; y: number } | null;
    velocity: { dx: number; dy: number } | null;
    status: string;
    insideBoss: boolean;
  }[];
}

// Track ball positions at these intervals after collision (ms)
const TRACKING_INTERVALS = [50, 100, 200, 500, 1000];

// Store tracking events for debugging
const trackingEvents: BallTrackingEvent[] = [];

// Active tracking sessions
const activeTracking: Map<number, { 
  eventId: string;
  ballId: number;
  scheduledChecks: number[];
}> = new Map();

// Declare window augmentation for TypeScript
declare global {
  interface Window {
    currentBalls?: Ball[];
    ballTrackingEvents?: BallTrackingEvent[];
  }
}

/**
 * Start tracking a ball's position after a boss collision
 */
export function startBallTracking(
  ball: Ball,
  bossType: string,
  bossPosition: { x: number; y: number },
  bossSize: { width: number; height: number },
  collisionNormal: { x: number; y: number }
): string {
  const eventId = `boss-hit-${Date.now()}-${ball.id}`;
  
  // Check if ball is inside boss at collision time
  const initialInsideBoss = isBallInsideBoss(ball.x, ball.y, bossPosition, bossSize);
  
  const event: BallTrackingEvent = {
    eventId,
    bossType,
    bossPosition,
    bossSize,
    collisionNormal,
    initialPosition: { x: ball.x, y: ball.y },
    initialVelocity: { dx: ball.dx, dy: ball.dy },
    timestamps: [{
      time: 'hit (0ms)',
      ms: 0,
      position: { x: ball.x, y: ball.y },
      velocity: { dx: ball.dx, dy: ball.dy },
      status: initialInsideBoss ? '🚨 COLLISION - INSIDE BOSS!' : '🎯 COLLISION',
      insideBoss: initialInsideBoss
    }]
  };
  
  trackingEvents.push(event);
  
  // Expose to window for console debugging
  window.ballTrackingEvents = trackingEvents;
  
  // Schedule position checks
  const scheduledChecks = TRACKING_INTERVALS.map(ms => 
    window.setTimeout(() => {
      checkBallPosition(eventId, ball.id, ms);
    }, ms)
  );
  
  activeTracking.set(ball.id, { eventId, ballId: ball.id, scheduledChecks });
  
  console.log(`🔴 [BALL TRACKER] ═══════════════════════════════════════════════`);
  console.log(`🔴 [BALL TRACKER] Starting tracking for ball ${ball.id}`);
  console.log(`🔴 [BALL TRACKER] Event ID: ${eventId}`);
  console.log(`🔴 [BALL TRACKER] Boss: ${bossType} at (${bossPosition.x.toFixed(1)}, ${bossPosition.y.toFixed(1)}) size: ${bossSize.width.toFixed(0)}x${bossSize.height.toFixed(0)}`);
  console.log(`🔴 [BALL TRACKER] Ball position AFTER collision: (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)}) ${initialInsideBoss ? '⚠️ INSIDE BOSS!' : ''}`);
  console.log(`🔴 [BALL TRACKER] Ball velocity AFTER collision: dx=${ball.dx.toFixed(2)}, dy=${ball.dy.toFixed(2)}`);
  console.log(`🔴 [BALL TRACKER] Collision normal: (${collisionNormal.x.toFixed(3)}, ${collisionNormal.y.toFixed(3)})`);
  console.log(`🔴 [BALL TRACKER] ═══════════════════════════════════════════════`);
  
  return eventId;
}

/**
 * Check if a ball position is inside the boss hitbox
 */
function isBallInsideBoss(
  ballX: number, 
  ballY: number, 
  bossPos: { x: number; y: number }, 
  bossSize: { width: number; height: number }
): boolean {
  const bossLeft = bossPos.x - bossSize.width / 2;
  const bossRight = bossPos.x + bossSize.width / 2;
  const bossTop = bossPos.y - bossSize.height / 2;
  const bossBottom = bossPos.y + bossSize.height / 2;
  
  return ballX >= bossLeft && ballX <= bossRight && ballY >= bossTop && ballY <= bossBottom;
}

/**
 * Check ball position at a specific interval
 */
function checkBallPosition(eventId: string, ballId: number, ms: number): void {
  // Get current balls from window (set by Game.tsx)
  const balls = window.currentBalls;
  const ball = balls?.find(b => b.id === ballId);
  
  const event = trackingEvents.find(e => e.eventId === eventId);
  if (!event) return;
  
  if (!ball) {
    event.timestamps.push({
      time: `+${ms}ms`,
      ms,
      position: null,
      velocity: null,
      status: '❌ BALL MISSING (not in game array)',
      insideBoss: false
    });
    console.log(`🔴 [BALL TRACKER] +${ms}ms: Ball ${ballId} is MISSING!`, { 
      eventId,
      totalBallsInGame: balls?.length ?? 0,
      ballIds: balls?.map(b => b.id) ?? []
    });
  } else {
    // Check if ball is inside the boss
    const insideBoss = isBallInsideBoss(ball.x, ball.y, event.bossPosition, event.bossSize);
    
    let status = '✅ IN BOUNDS';
    
    if (insideBoss) {
      status = `🚨 INSIDE BOSS! (${ball.x.toFixed(1)}, ${ball.y.toFixed(1)})`;
    } else if (ball.y < 0) {
      status = `⚠️ ABOVE SCREEN (y=${ball.y.toFixed(1)})`;
    } else if (ball.y < -50) {
      status = `🚨 FAR ABOVE SCREEN (y=${ball.y.toFixed(1)})`;
    } else if (ball.y > 800) {
      status = `⚠️ BELOW SCREEN (y=${ball.y.toFixed(1)})`;
    }
    
    event.timestamps.push({
      time: `+${ms}ms`,
      ms,
      position: { x: ball.x, y: ball.y },
      velocity: { dx: ball.dx, dy: ball.dy },
      status,
      insideBoss
    });
    
    const icon = insideBoss ? '🔴' : status.startsWith('✅') ? '🟢' : status.startsWith('⚠️') ? '🟡' : '🔴';
    console.log(`${icon} [BALL TRACKER] +${ms}ms: Ball ${ballId}`, {
      position: `(${ball.x.toFixed(1)}, ${ball.y.toFixed(1)})`,
      velocity: `dx=${ball.dx.toFixed(2)}, dy=${ball.dy.toFixed(2)}`,
      status,
      insideBoss
    });
  }
  
  // On final check (1000ms), log complete summary
  if (ms === 1000) {
    console.log(`🔵 [BALL TRACKER] ═══════════════════════════════════════════════`);
    console.log(`🔵 [BALL TRACKER] COMPLETE TRACKING SUMMARY for ${eventId}:`);
    console.log(`🔵 [BALL TRACKER] Boss: ${event.bossType} at (${event.bossPosition.x.toFixed(1)}, ${event.bossPosition.y.toFixed(1)})`);
    console.log(`🔵 [BALL TRACKER] Collision normal: (${event.collisionNormal.x.toFixed(3)}, ${event.collisionNormal.y.toFixed(3)})`);
    console.log(`🔵 [BALL TRACKER] Timeline:`);
    event.timestamps.forEach(ts => {
      const posStr = ts.position ? `(${ts.position.x.toFixed(1)}, ${ts.position.y.toFixed(1)})` : 'N/A';
      const velStr = ts.velocity ? `dx=${ts.velocity.dx.toFixed(2)}, dy=${ts.velocity.dy.toFixed(2)}` : 'N/A';
      console.log(`🔵 [BALL TRACKER]   ${ts.time}: pos=${posStr}, vel=${velStr}, ${ts.status}`);
    });
    console.log(`🔵 [BALL TRACKER] ═══════════════════════════════════════════════`);
    
    // Clean up tracking
    activeTracking.delete(ballId);
  }
}

/**
 * Get all tracking events (for debugging in console)
 */
export function getTrackingEvents(): BallTrackingEvent[] {
  return trackingEvents;
}

/**
 * Clear all tracking events
 */
export function clearTrackingEvents(): void {
  trackingEvents.length = 0;
  activeTracking.clear();
  window.ballTrackingEvents = trackingEvents;
}
