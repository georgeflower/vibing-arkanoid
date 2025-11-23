import type { Ball, Paddle } from "@/types/game";

interface Vec2 {
  x: number;
  y: number;
}

interface CollisionResult {
  collided: boolean;
  newX: number;
  newY: number;
  newVelocityX: number;
  newVelocityY: number;
  normal: Vec2;
  penetration: number;
}

const CORNER_RADIUS = 5;
const SAFETY_MARGIN = 2;
const PADDLE_VELOCITY_TRANSFER = 0.35; // Only 35% of paddle velocity transferred to prevent speed explosions
const MAX_SPEED_AFTER_PADDLE = 12.0; // Maximum ball speed after paddle collision (px/frame)

/**
 * Check collision between a circle (ball) and a rounded rectangle (paddle)
 * Uses geometry-based detection with rounded corners for realistic bounces
 */
export function checkCircleVsRoundedPaddle(
  ball: Ball,
  paddle: Paddle,
  paddleVelocity: Vec2 = { x: 0, y: 0 }
): CollisionResult {
  const result: CollisionResult = {
    collided: false,
    newX: ball.x,
    newY: ball.y,
    newVelocityX: ball.dx,
    newVelocityY: ball.dy,
    normal: { x: 0, y: 1 },
    penetration: 0,
  };

  // Find closest point on the rounded rectangle to the ball center
  const closestPoint = getClosestPointOnRoundedRect(
    { x: ball.x, y: ball.y },
    paddle,
    CORNER_RADIUS
  );

  // Calculate distance from ball center to closest point
  const dx = ball.x - closestPoint.x;
  const dy = ball.y - closestPoint.y;
  const distanceSquared = dx * dx + dy * dy;
  const distance = Math.sqrt(distanceSquared);

  // Check if collision occurred
  if (distance < ball.radius) {
    result.collided = true;
    result.penetration = ball.radius - distance;

    // Calculate collision normal (direction to push ball out)
    if (distance > 0.001) {
      result.normal = { x: dx / distance, y: dy / distance };
    } else {
      // Ball center exactly on paddle surface - default to pushing up
      result.normal = { x: 0, y: -1 };
    }

    // Apply position correction with safety margin
    const correctionDistance = result.penetration + SAFETY_MARGIN;
    result.newX = ball.x + result.normal.x * correctionDistance;
    result.newY = ball.y + result.normal.y * correctionDistance;

    // Calculate relative velocity (ball velocity relative to paddle)
    const relativeVx = ball.dx - paddleVelocity.x;
    const relativeVy = ball.dy - paddleVelocity.y;

    // Calculate dot product for reflection
    const dotProduct = relativeVx * result.normal.x + relativeVy * result.normal.y;

    // Only reflect if moving into the paddle
    if (dotProduct < 0) {
      // Reflect relative velocity along normal
      const reflectedVx = relativeVx - 2 * dotProduct * result.normal.x;
      const reflectedVy = relativeVy - 2 * dotProduct * result.normal.y;

      // Add DAMPENED paddle velocity to prevent speed explosions
      result.newVelocityX = reflectedVx + (paddleVelocity.x * PADDLE_VELOCITY_TRANSFER);
      result.newVelocityY = reflectedVy + (paddleVelocity.y * PADDLE_VELOCITY_TRANSFER);

      // Apply spin/deflection for top surface hits
      if (Math.abs(result.normal.y + 1) < 0.1) {
        // This is a top surface hit - apply horizontal deflection based on ball center position
        const paddleCenterX = paddle.x + paddle.width / 2;
        const impactOffsetX = ball.x - paddleCenterX; // Use ball.x, not closestPoint.x
        const maxDeflection = 0.5; // Maximum horizontal deflection factor
        const deflectionFactor = (impactOffsetX / (paddle.width / 2)) * maxDeflection;
        
        result.newVelocityX += deflectionFactor * Math.abs(result.newVelocityY);
      }

      // Cap maximum speed after paddle collision to prevent explosions
      const resultSpeed = Math.sqrt(
        result.newVelocityX * result.newVelocityX + 
        result.newVelocityY * result.newVelocityY
      );

      if (resultSpeed > MAX_SPEED_AFTER_PADDLE) {
        const scale = MAX_SPEED_AFTER_PADDLE / resultSpeed;
        const originalSpeed = resultSpeed;
        result.newVelocityX *= scale;
        result.newVelocityY *= scale;
        
        // Debug logging for speed capping
        if (typeof window !== 'undefined' && (window as any).ENABLE_DEBUG_FEATURES) {
          console.log(
            `[PaddleSpeedCap] Clamped: ${originalSpeed.toFixed(2)} → ${MAX_SPEED_AFTER_PADDLE.toFixed(2)} px/frame`
          );
        }
      }

      // Primary case: for clear top-surface hits, clamp the ball fully above the paddle
      if (result.normal.y <= -0.9) {
        const targetY = paddle.y - ball.radius - SAFETY_MARGIN;
        if (result.newY > targetY) {
          result.newY = targetY;
        }
      }

      // Emergency fallback: if the ball is horizontally over the paddle and has any penetration,
      // force it above the paddle to avoid getting stuck, even if the normal points sideways.
      const withinPaddleX = result.newX >= paddle.x && result.newX <= paddle.x + paddle.width; // Use result.newX
      if (withinPaddleX && result.newY >= paddle.y && result.penetration > 0.5) {
        const targetY = paddle.y - ball.radius - SAFETY_MARGIN;
        if (result.newY > targetY) {
          result.newY = targetY;
        }
        // Enforce minimum upward speed and damp horizontal velocity
        const minUpwardSpeed = 2.0; // Minimum px/frame upward
        result.newVelocityY = -Math.max(minUpwardSpeed, Math.abs(result.newVelocityY || ball.dy || minUpwardSpeed));
        result.newVelocityX *= 0.95; // Slight horizontal damping
        result.normal = { x: 0, y: -1 };
      }
    }
  }

  return result;
}

/**
 * Find the closest point on a rounded rectangle to a given point
 */
function getClosestPointOnRoundedRect(
  point: Vec2,
  rect: { x: number; y: number; width: number; height: number },
  cornerRadius: number
): Vec2 {
  // Define the inner rectangle (rect minus corner radius on all sides)
  const innerLeft = rect.x + cornerRadius;
  const innerRight = rect.x + rect.width - cornerRadius;
  const innerTop = rect.y + cornerRadius;
  const innerBottom = rect.y + rect.height - cornerRadius;

  // Clamp point to inner rectangle
  const clampedX = Math.max(innerLeft, Math.min(innerRight, point.x));
  const clampedY = Math.max(innerTop, Math.min(innerBottom, point.y));

  // Check if point is in the "cross" region (not in a corner region)
  const inHorizontalStrip = point.y >= rect.y && point.y <= rect.y + rect.height;
  const inVerticalStrip = point.x >= rect.x && point.x <= rect.x + rect.width;

  if (inHorizontalStrip && point.x < innerLeft) {
    // Left edge region
    return { x: rect.x, y: clampedY };
  } else if (inHorizontalStrip && point.x > innerRight) {
    // Right edge region
    return { x: rect.x + rect.width, y: clampedY };
  } else if (inVerticalStrip && point.y < innerTop) {
    // Top edge region
    return { x: clampedX, y: rect.y };
  } else if (inVerticalStrip && point.y > innerBottom) {
    // Bottom edge region
    return { x: clampedX, y: rect.y + rect.height };
  }

  // Point is in a corner region - find closest point on the corner circle
  const corners = [
    { x: innerLeft, y: innerTop }, // Top-left
    { x: innerRight, y: innerTop }, // Top-right
    { x: innerLeft, y: innerBottom }, // Bottom-left
    { x: innerRight, y: innerBottom }, // Bottom-right
  ];

  // Find which corner is closest
  let closestCorner = corners[0];
  let minDistSquared = Infinity;

  for (const corner of corners) {
    const dx = point.x - corner.x;
    const dy = point.y - corner.y;
    const distSquared = dx * dx + dy * dy;
    if (distSquared < minDistSquared) {
      minDistSquared = distSquared;
      closestCorner = corner;
    }
  }

  // Calculate point on corner circle
  const dx = point.x - closestCorner.x;
  const dy = point.y - closestCorner.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.001) {
    // Point is at corner center - return corner position
    return closestCorner;
  }

  // Point on circle at corner
  const angle = Math.atan2(dy, dx);
  return {
    x: closestCorner.x + Math.cos(angle) * cornerRadius,
    y: closestCorner.y + Math.sin(angle) * cornerRadius,
  };
}
