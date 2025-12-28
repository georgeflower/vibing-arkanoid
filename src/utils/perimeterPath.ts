// Perimeter path system for Level 20 Mega Boss
// The paddle can travel along the bottom and up both side walls

import { PERIMETER_CONFIG } from '@/constants/megaBossConfig';

export interface PerimeterPosition {
  x: number;
  y: number;
  rotation: number; // 0 = horizontal, 90 = vertical left wall, -90 = vertical right wall
  segment: 'bottom' | 'cornerLeft' | 'leftWall' | 'cornerRight' | 'rightWall';
}

export interface PerimeterPathConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  cornerRadius: number;
  wallMargin: number;
  wallHeight: number; // How far up the paddle can travel on walls
}

// Calculate total path length for the perimeter
export function getPerimeterPathLength(config: PerimeterPathConfig): number {
  const { canvasWidth, cornerRadius, wallHeight } = config;
  
  // Bottom line (excluding corners)
  const bottomLength = canvasWidth - 2 * cornerRadius;
  
  // Two quarter-circle arcs (total = half circle)
  const arcLength = Math.PI * cornerRadius / 2; // Each quarter arc
  
  // Two wall segments
  const wallLength = wallHeight;
  
  return bottomLength + 2 * arcLength + 2 * wallLength;
}

// Get segment boundaries for the path
export function getPathSegments(config: PerimeterPathConfig): {
  leftWallEnd: number;
  leftCornerEnd: number;
  bottomEnd: number;
  rightCornerEnd: number;
  rightWallEnd: number;
} {
  const { canvasWidth, cornerRadius, wallHeight } = config;
  
  const arcLength = (Math.PI * cornerRadius) / 2;
  const bottomLength = canvasWidth - 2 * cornerRadius;
  
  // Path goes: left wall → left corner → bottom → right corner → right wall
  const leftWallEnd = wallHeight;
  const leftCornerEnd = leftWallEnd + arcLength;
  const bottomEnd = leftCornerEnd + bottomLength;
  const rightCornerEnd = bottomEnd + arcLength;
  const rightWallEnd = rightCornerEnd + wallHeight;
  
  return { leftWallEnd, leftCornerEnd, bottomEnd, rightCornerEnd, rightWallEnd };
}

// Convert path position (s) to world coordinates and rotation
export function sToPosition(s: number, config: PerimeterPathConfig): PerimeterPosition {
  const { canvasWidth, canvasHeight, cornerRadius, wallMargin, wallHeight } = config;
  
  const segments = getPathSegments(config);
  const totalLength = getPerimeterPathLength(config);
  
  // Clamp s to valid range
  s = Math.max(0, Math.min(s, totalLength));
  
  const bottomY = canvasHeight - wallMargin - 40; // Paddle Y on bottom
  const leftX = wallMargin + 40; // Paddle X on left wall
  const rightX = canvasWidth - wallMargin - 40; // Paddle X on right wall
  
  // Left wall segment (s = 0 at top of left wall, going down)
  if (s <= segments.leftWallEnd) {
    const wallProgress = s / wallHeight;
    return {
      x: leftX,
      y: bottomY - wallHeight + s,
      rotation: 90,
      segment: 'leftWall'
    };
  }
  
  // Left corner arc (bottom-left corner)
  if (s <= segments.leftCornerEnd) {
    const arcProgress = (s - segments.leftWallEnd) / ((Math.PI * cornerRadius) / 2);
    const theta = (Math.PI / 2) * (1 - arcProgress); // From 90° to 0°
    
    const arcCenterX = cornerRadius + wallMargin;
    const arcCenterY = bottomY - cornerRadius;
    
    return {
      x: arcCenterX + cornerRadius * Math.cos(theta + Math.PI),
      y: arcCenterY + cornerRadius * Math.sin(theta + Math.PI),
      rotation: 90 - arcProgress * 90, // Rotate from 90 to 0
      segment: 'cornerLeft'
    };
  }
  
  // Bottom segment
  if (s <= segments.bottomEnd) {
    const bottomProgress = (s - segments.leftCornerEnd) / (canvasWidth - 2 * cornerRadius);
    return {
      x: cornerRadius + wallMargin + (canvasWidth - 2 * cornerRadius - 2 * wallMargin) * bottomProgress,
      y: bottomY,
      rotation: 0,
      segment: 'bottom'
    };
  }
  
  // Right corner arc (bottom-right corner)
  if (s <= segments.rightCornerEnd) {
    const arcProgress = (s - segments.bottomEnd) / ((Math.PI * cornerRadius) / 2);
    const theta = (Math.PI / 2) * arcProgress; // From 0° to 90°
    
    const arcCenterX = canvasWidth - cornerRadius - wallMargin;
    const arcCenterY = bottomY - cornerRadius;
    
    return {
      x: arcCenterX + cornerRadius * Math.cos(-theta),
      y: arcCenterY + cornerRadius * Math.sin(-theta),
      rotation: -arcProgress * 90, // Rotate from 0 to -90
      segment: 'cornerRight'
    };
  }
  
  // Right wall segment
  const wallProgress = (s - segments.rightCornerEnd) / wallHeight;
  return {
    x: rightX,
    y: bottomY - wallProgress * wallHeight,
    rotation: -90,
    segment: 'rightWall'
  };
}

// Convert world position to approximate path position (s)
export function positionToS(x: number, y: number, config: PerimeterPathConfig): number {
  const { canvasWidth, canvasHeight, cornerRadius, wallMargin, wallHeight } = config;
  
  const segments = getPathSegments(config);
  const bottomY = canvasHeight - wallMargin - 40;
  const leftX = wallMargin + 40;
  const rightX = canvasWidth - wallMargin - 40;
  
  // Check which segment we're closest to
  const distToBottom = Math.abs(y - bottomY);
  const distToLeftWall = Math.abs(x - leftX);
  const distToRightWall = Math.abs(x - rightX);
  
  // On left wall
  if (distToLeftWall < 50 && y < bottomY - cornerRadius) {
    const wallPos = bottomY - wallHeight + (y - (bottomY - wallHeight));
    return Math.max(0, wallPos);
  }
  
  // On right wall
  if (distToRightWall < 50 && y < bottomY - cornerRadius) {
    const wallPos = segments.rightCornerEnd + (bottomY - cornerRadius - y) / wallHeight * wallHeight;
    return Math.min(wallPos, segments.rightWallEnd);
  }
  
  // On bottom
  if (distToBottom < 50 && x > leftX && x < rightX) {
    const bottomProgress = (x - cornerRadius - wallMargin) / (canvasWidth - 2 * cornerRadius - 2 * wallMargin);
    return segments.leftCornerEnd + bottomProgress * (segments.bottomEnd - segments.leftCornerEnd);
  }
  
  // Default to center of bottom
  return (segments.leftCornerEnd + segments.bottomEnd) / 2;
}

// Get collision normal at a given path position
export function getCollisionNormal(s: number, config: PerimeterPathConfig): { nx: number; ny: number } {
  const pos = sToPosition(s, config);
  
  switch (pos.segment) {
    case 'leftWall':
      return { nx: 1, ny: 0 }; // Normal points right (into play area)
    case 'rightWall':
      return { nx: -1, ny: 0 }; // Normal points left (into play area)
    case 'bottom':
      return { nx: 0, ny: -1 }; // Normal points up (into play area)
    case 'cornerLeft':
    case 'cornerRight': {
      // For arcs, compute tangent/normal from rotation
      const angleRad = (pos.rotation * Math.PI) / 180;
      return {
        nx: Math.sin(angleRad),
        ny: -Math.cos(angleRad)
      };
    }
    default:
      return { nx: 0, ny: -1 };
  }
}

// Check if a point is within the paddle hitbox on the perimeter
export function isPointInPerimeterPaddle(
  pointX: number,
  pointY: number,
  paddleS: number,
  paddleWidth: number,
  paddleHeight: number,
  config: PerimeterPathConfig
): boolean {
  const pos = sToPosition(paddleS, config);
  
  // Transform point relative to paddle center with rotation
  const dx = pointX - pos.x;
  const dy = pointY - pos.y;
  const angleRad = (pos.rotation * Math.PI) / 180;
  
  // Rotate point into paddle's local coordinate system
  const localX = dx * Math.cos(-angleRad) - dy * Math.sin(-angleRad);
  const localY = dx * Math.sin(-angleRad) + dy * Math.cos(-angleRad);
  
  // Check if within paddle bounds (paddle is centered at origin in local coords)
  const halfWidth = paddleWidth / 2;
  const halfHeight = paddleHeight / 2;
  
  return Math.abs(localX) <= halfWidth && Math.abs(localY) <= halfHeight;
}

// Create default perimeter config from game constants
export function createPerimeterConfig(
  canvasWidth: number,
  canvasHeight: number,
  paddleWidth: number,
  paddleHeight: number
): PerimeterPathConfig {
  return {
    canvasWidth,
    canvasHeight,
    paddleWidth,
    paddleHeight,
    cornerRadius: PERIMETER_CONFIG.cornerRadius,
    wallMargin: PERIMETER_CONFIG.wallMargin,
    wallHeight: PERIMETER_CONFIG.paddleWallHeight
  };
}
