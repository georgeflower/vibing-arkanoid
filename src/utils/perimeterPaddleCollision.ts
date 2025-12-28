// Perimeter paddle collision detection for Level 20 Mega Boss
import type { Ball } from "@/types/game";
import { 
  PerimeterPathConfig, 
  sToPosition, 
  getCollisionNormal,
  getPerimeterPathLength,
  getPathSegments
} from "./perimeterPath";

export interface PerimeterCollisionResult {
  hit: boolean;
  newDx: number;
  newDy: number;
  hitPosition?: { x: number; y: number };
  normalX?: number;
  normalY?: number;
}

// Check ball collision with perimeter paddle
export function checkBallVsPerimeterPaddle(
  ball: Ball,
  paddleS: number,
  paddleWidth: number,
  paddleHeight: number,
  config: PerimeterPathConfig
): PerimeterCollisionResult {
  const paddlePos = sToPosition(paddleS, config);
  
  // Transform ball position to paddle's local coordinate system
  const dx = ball.x - paddlePos.x;
  const dy = ball.y - paddlePos.y;
  const angleRad = (paddlePos.rotation * Math.PI) / 180;
  
  // Rotate into local coords
  const localX = dx * Math.cos(-angleRad) - dy * Math.sin(-angleRad);
  const localY = dx * Math.sin(-angleRad) + dy * Math.cos(-angleRad);
  
  // Check collision in local coordinates
  const halfWidth = paddleWidth / 2;
  const halfHeight = paddleHeight / 2;
  const radius = ball.radius;
  
  // Find closest point on paddle rectangle to ball
  const closestX = Math.max(-halfWidth, Math.min(halfWidth, localX));
  const closestY = Math.max(-halfHeight, Math.min(halfHeight, localY));
  
  const distX = localX - closestX;
  const distY = localY - closestY;
  const distSquared = distX * distX + distY * distY;
  
  if (distSquared > radius * radius) {
    return { hit: false, newDx: ball.dx, newDy: ball.dy };
  }
  
  // Collision detected! Calculate reflection
  const normal = getCollisionNormal(paddleS, config);
  
  // Calculate hit position along paddle for angle adjustment (-1 to 1)
  const hitRatio = closestX / halfWidth;
  
  // Current velocity
  const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
  
  // Base reflection using paddle normal
  const dotProduct = ball.dx * normal.nx + ball.dy * normal.ny;
  let newDx = ball.dx - 2 * dotProduct * normal.nx;
  let newDy = ball.dy - 2 * dotProduct * normal.ny;
  
  // Add angle adjustment based on where ball hit paddle
  // This makes the paddle feel more responsive and controllable
  const angleAdjust = hitRatio * 0.5; // Max ±0.5 radians (about 30°)
  const currentAngle = Math.atan2(newDy, newDx);
  const adjustedAngle = currentAngle + angleAdjust;
  
  newDx = Math.cos(adjustedAngle) * speed;
  newDy = Math.sin(adjustedAngle) * speed;
  
  // Ensure ball is moving away from paddle
  const newDot = newDx * normal.nx + newDy * normal.ny;
  if (newDot < 0) {
    // Flip if still moving toward paddle
    newDx = -newDx;
    newDy = -newDy;
  }
  
  return {
    hit: true,
    newDx,
    newDy,
    hitPosition: { x: paddlePos.x, y: paddlePos.y },
    normalX: normal.nx,
    normalY: normal.ny
  };
}

// Get paddle corners in world space for rendering
export function getPerimeterPaddleCorners(
  paddleS: number,
  paddleWidth: number,
  paddleHeight: number,
  config: PerimeterPathConfig
): { x: number; y: number }[] {
  const pos = sToPosition(paddleS, config);
  const angleRad = (pos.rotation * Math.PI) / 180;
  const halfWidth = paddleWidth / 2;
  const halfHeight = paddleHeight / 2;
  
  // Local corners
  const localCorners = [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight }
  ];
  
  // Transform to world space
  return localCorners.map(corner => ({
    x: pos.x + corner.x * Math.cos(angleRad) - corner.y * Math.sin(angleRad),
    y: pos.y + corner.x * Math.sin(angleRad) + corner.y * Math.cos(angleRad)
  }));
}

// Convert mouse X position to path position for horizontal control
export function mouseXToPathS(
  mouseX: number,
  canvasWidth: number,
  config: PerimeterPathConfig
): number {
  const segments = getPathSegments(config);
  const totalLength = getPerimeterPathLength(config);
  
  // Map mouse X (0 to canvasWidth) to path position
  // Center of screen maps to center of bottom segment
  const bottomCenter = (segments.leftCornerEnd + segments.bottomEnd) / 2;
  const halfBottom = (segments.bottomEnd - segments.leftCornerEnd) / 2;
  
  // Normalized mouse position (-1 to 1)
  const normalizedX = (mouseX / canvasWidth) * 2 - 1;
  
  // Map to full path range
  return bottomCenter + normalizedX * (totalLength / 2 - config.wallHeight);
}

// Clamp path position to valid range
export function clampPathPosition(s: number, config: PerimeterPathConfig): number {
  const totalLength = getPerimeterPathLength(config);
  return Math.max(0, Math.min(totalLength, s));
}
