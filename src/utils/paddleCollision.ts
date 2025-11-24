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

/**
 * Check collision between a circle (ball) and a rounded rectangle (paddle)
 * Uses geometry-based detection with rounded corners for realistic bounces
 */
export function checkCircleVsRoundedPaddle(
  ball: Ball,
  paddle: Paddle,
  paddleVelocity: Vec2 = { x: 0, y: 0 },
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
  const closestPoint = getClosestPointOnRoundedRect({ x: ball.x, y: ball.y }, paddle, CORNER_RADIUS);

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

    // Capture incoming ball speed to preserve it after launch
    const incomingSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);

    // Calculate dot product to check if moving into paddle
    const dotProduct = ball.dx * result.normal.x + ball.dy * result.normal.y;

    // Only apply launcher physics if moving into the paddle
    if (dotProduct < 0) {
      // For top surface hits, use position-based launcher physics
      if (Math.abs(result.normal.y + 1) < 0.1) {
        // Calculate impact position on paddle
        const paddleCenterX = paddle.x + paddle.width / 2;
        const impactOffsetX = ball.x - paddleCenterX;
        const halfWidth = paddle.width / 2;
        
        // Normalize to [-1, +1] where -1 = far left, 0 = center, +1 = far right
        const normalizedOffset = Math.max(-1, Math.min(1, impactOffsetX / halfWidth));
        
        // Map position to launch angle using power curve
        // Power of 1.5 makes edges more extreme, center more vertical
        const angleFactor = Math.sign(normalizedOffset) * Math.pow(Math.abs(normalizedOffset), 1.5);
        
        // Define angle range: ±75° from vertical (in radians)
        const MAX_ANGLE_DEGREES = 75;
        const MAX_ANGLE_RADIANS = (MAX_ANGLE_DEGREES * Math.PI) / 180;
        const launchAngle = angleFactor * MAX_ANGLE_RADIANS;
        
        // Calculate launch direction (0° = straight up, positive = right, negative = left)
        // Note: In canvas coordinates, Y increases downward, so up is negative Y
        const baseAngle = -Math.PI / 2; // -90° = straight up
        const finalAngle = baseAngle + launchAngle;
        
        // Set velocity from angle and preserved speed (ignore incoming direction)
        result.newVelocityX = Math.cos(finalAngle) * incomingSpeed;
        result.newVelocityY = Math.sin(finalAngle) * incomingSpeed;
        
      } else {
        // For side/corner hits, use standard reflection
        result.newVelocityX = ball.dx - 2 * dotProduct * result.normal.x;
        result.newVelocityY = ball.dy - 2 * dotProduct * result.normal.y;
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
    const withinPaddleX = result.newX >= paddle.x && result.newX <= paddle.x + paddle.width;
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

  return result;
}

/**
 * Find the closest point on a rounded rectangle to a given point
 */
function getClosestPointOnRoundedRect(
  point: Vec2,
  rect: { x: number; y: number; width: number; height: number },
  cornerRadius: number,
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
