import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import metalBallTexture from "@/assets/metal-ball-texture.png";

interface HighScoreDisplayProps {
  scores: Array<{ name: string; score: number; level: number; difficulty?: string; beatLevel50?: boolean; startingLives?: number }>;
  onClose: () => void;
}

// 3D Metal Balls Component
const MetalBalls = () => {
  const groupRef = useRef<THREE.Group>(null);
  const ballsRef = useRef<THREE.Mesh[]>([]);
  const texture = useLoader(THREE.TextureLoader, metalBallTexture);
  const previousPositions = useRef<THREE.Vector3[]>(
    Array.from({ length: 10 }, () => new THREE.Vector3())
  );
  const velocityRef = useRef({ x: 0.015, y: 0.01, z: 0.012 });

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Move the entire group around with bouncing boundaries
    const bounds = { x: 8, y: 5, z: 6 };
    
    // Update position based on velocity
    groupRef.current.position.x += velocityRef.current.x;
    groupRef.current.position.y += velocityRef.current.y;
    groupRef.current.position.z += velocityRef.current.z;
    
    // Bounce off edges with smooth direction change
    if (Math.abs(groupRef.current.position.x) > bounds.x) {
      velocityRef.current.x *= -1;
      groupRef.current.position.x = Math.sign(groupRef.current.position.x) * bounds.x;
    }
    if (Math.abs(groupRef.current.position.y) > bounds.y) {
      velocityRef.current.y *= -1;
      groupRef.current.position.y = Math.sign(groupRef.current.position.y) * bounds.y;
    }
    if (Math.abs(groupRef.current.position.z) > bounds.z) {
      velocityRef.current.z *= -1;
      groupRef.current.position.z = Math.sign(groupRef.current.position.z) * bounds.z;
    }
    
    // Loop through phases continuously (30 second cycle)
    const cycleTime = time % 30;
    let phase = 0;
    let transitionProgress = 0;
    
    if (cycleTime < 10) {
      phase = 0; // Wave
      transitionProgress = Math.min(cycleTime / 2, 1);
    } else if (cycleTime < 20) {
      phase = 1; // Whirlpool
      transitionProgress = Math.min((cycleTime - 10) / 2, 1);
    } else {
      phase = 2; // Random
      transitionProgress = Math.min((cycleTime - 20) / 2, 1);
    }

    ballsRef.current.forEach((ball, i) => {
      if (!ball) return;

      // Continuous spinning for all balls
      ball.rotation.x += 0.03;
      ball.rotation.y += 0.02;
      ball.rotation.z += 0.01;

      let targetPos = new THREE.Vector3();

      if (phase === 0) {
        // Wave motion
        const waveY = Math.sin(time * 2 + i * 0.5) * 2;
        targetPos.set(i - 4.5, waveY, 0);
      } else if (phase === 1) {
        // Whirlpool
        const angle = (time * 2 + i * 0.6) % (Math.PI * 2);
        const radius = 3 + Math.sin(time + i) * 1;
        targetPos.set(
          Math.cos(angle) * radius,
          Math.sin(time * 3 + i) * 2,
          Math.sin(angle) * radius
        );
      } else {
        // Smooth random motion using sine waves
        targetPos.set(
          (i - 4.5) + Math.sin(time + i) * 3,
          Math.cos(time * 1.5 + i * 0.5) * 2,
          Math.sin(time * 0.8 + i * 0.3) * 2
        );
      }

      // Smooth transition using lerp
      if (!previousPositions.current[i]) {
        previousPositions.current[i] = ball.position.clone();
      }
      
      const lerpFactor = Math.min(delta * 2, 1) * transitionProgress;
      ball.position.lerp(targetPos, lerpFactor);
      previousPositions.current[i].copy(ball.position);
    });
  });

  const colors = [
    "#ff00ff", // Magenta
    "#00ffff", // Cyan
    "#ffff00", // Yellow
    "#ff0080", // Hot pink
    "#00ff80", // Spring green
    "#ff8000", // Orange
    "#8000ff", // Purple
    "#00ff00", // Lime
    "#ff0000", // Red
    "#0080ff", // Blue
  ];

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) ballsRef.current[i] = el;
          }}
          position={[i - 4.5, 0, 0]}
        >
          <sphereGeometry args={[0.4, 32, 32]} />
          <meshStandardMaterial
            color={colors[i]}
            metalness={0.7}
            roughness={0.2}
            emissive={colors[i]}
            emissiveIntensity={0.5}
            envMapIntensity={1.5}
          />
        </mesh>
      ))}
    </group>
  );
};

// 3D Retro Donut Component
const RetroDonut = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [opacity, setOpacity] = useState(0);
  const velocityRef = useRef({ x: 0.012, y: 0.01, z: 0.013 });

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Fade in after 5 seconds, reach full opacity by 7 seconds
    const fadeInProgress = Math.min(Math.max((time - 5) / 2, 0), 1);
    setOpacity(fadeInProgress);
    
    if (fadeInProgress > 0) {
      // Move around with bouncing boundaries
      const bounds = { x: 9, y: 6, z: 7 };
      
      // Update position based on velocity
      meshRef.current.position.x += velocityRef.current.x;
      meshRef.current.position.y += velocityRef.current.y;
      meshRef.current.position.z += velocityRef.current.z;
      
      // Bounce off edges
      if (Math.abs(meshRef.current.position.x) > bounds.x) {
        velocityRef.current.x *= -1;
        meshRef.current.position.x = Math.sign(meshRef.current.position.x) * bounds.x;
      }
      if (Math.abs(meshRef.current.position.y) > bounds.y) {
        velocityRef.current.y *= -1;
        meshRef.current.position.y = Math.sign(meshRef.current.position.y) * bounds.y;
      }
      if (Math.abs(meshRef.current.position.z) > bounds.z) {
        velocityRef.current.z *= -1;
        meshRef.current.position.z = Math.sign(meshRef.current.position.z) * bounds.z;
      }
      
      // Spinning
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.03;
      
      // Zooming in and out with scale
      const baseScale = 0.5 + fadeInProgress * 0.5;
      const scale = baseScale + Math.sin(time * 1.5) * 0.5;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[2, 0.8, 32, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={1.0}
        roughness={0.0}
        emissive="#ff00ff"
        emissiveIntensity={0.2 * opacity}
        envMapIntensity={3.0}
        transparent
        opacity={opacity}
      />
    </mesh>
  );
};

// 3D Scene Component
const Scene3D = () => {
  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.5}
      />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#00ffff" />
      <pointLight position={[-10, 5, -10]} intensity={0.8} color="#ff00ff" />
      <spotLight
        position={[0, 10, 0]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        color="#ffffff"
      />
      <MetalBalls />
      <RetroDonut />
    </>
  );
};

export const HighScoreDisplay = ({ scores, onClose }: HighScoreDisplayProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    // Animated starfield and geometric patterns
    const animate = () => {
      time += 0.02;

      // Clear with dark blue background
      ctx.fillStyle = "hsl(220, 25%, 8%)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated grid pattern
      ctx.strokeStyle = "hsla(280, 60%, 55%, 0.15)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 20; i++) {
        const offset = (time * 50 + i * 40) % canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, offset);
        ctx.lineTo(canvas.width, offset);
        ctx.stroke();
      }

      // Moving vertical lines
      ctx.strokeStyle = "hsla(200, 70%, 50%, 0.15)";
      for (let i = 0; i < 15; i++) {
        const offset = (time * 30 + i * 60) % canvas.width;
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset, canvas.height);
        ctx.stroke();
      }

      // Pattern cycling (40 second cycle)
      const patternTime = time % 40;
      let pattern = 0;
      let patternTransition = 0;
      
      if (patternTime < 13.33) {
        pattern = 0; // Circular orbit
        patternTransition = Math.min(patternTime / 2, 1);
      } else if (patternTime < 26.66) {
        pattern = 1; // Figure-8
        patternTransition = Math.min((patternTime - 13.33) / 2, 1);
      } else {
        pattern = 2; // Spiral
        patternTransition = Math.min((patternTime - 26.66) / 2, 1);
      }

      // Floating circles with different patterns
      for (let i = 0; i < 5; i++) {
        let x, y;
        
        if (pattern === 0) {
          // Circular orbit
          const angle = time * 0.5 + i * (Math.PI * 2 / 5);
          const radius = 250 + Math.sin(time + i) * 50;
          x = canvas.width / 2 + Math.cos(angle) * radius;
          y = canvas.height / 2 + Math.sin(angle) * radius;
        } else if (pattern === 1) {
          // Figure-8 pattern
          const t = time * 0.5 + i * 0.8;
          const scale = 200 + Math.sin(time + i) * 30;
          x = canvas.width / 2 + Math.sin(t) * scale;
          y = canvas.height / 2 + Math.sin(t * 2) * scale * 0.7;
        } else {
          // Spiral pattern
          const spiralT = time * 0.4 + i * 0.6;
          const spiralRadius = 100 + (spiralT % 10) * 20;
          x = canvas.width / 2 + Math.cos(spiralT) * spiralRadius;
          y = canvas.height / 2 + Math.sin(spiralT) * spiralRadius;
        }
        
        const radius = 30 + Math.sin(time * 2 + i) * 10;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = i % 2 === 0 ? "hsl(330, 70%, 55%)" : "hsl(200, 70%, 50%)";
        ctx.strokeStyle = i % 2 === 0 ? "hsla(330, 70%, 55%, 0.3)" : "hsla(200, 70%, 50%, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating squares with varied patterns
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        let x, y;
        
        if (pattern === 0) {
          x = canvas.width / 2 + Math.cos(time * 0.5 + i * 2) * 250;
          y = canvas.height / 2 + Math.sin(time * 0.5 + i * 2) * 150;
        } else if (pattern === 1) {
          x = canvas.width / 2 + Math.sin(time * 0.6 + i * 1.5) * 280;
          y = canvas.height / 2 + Math.cos(time * 0.8 + i * 1.5) * 180;
        } else {
          x = canvas.width / 2 + Math.cos(time * 0.4 + i * 2.5) * (200 + i * 30);
          y = canvas.height / 2 + Math.sin(time * 0.4 + i * 2.5) * (150 + i * 20);
        }
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(time + i);
        ctx.strokeStyle = "hsla(280, 60%, 55%, 0.4)";
        ctx.lineWidth = 2;
        ctx.strokeRect(-20, -20, 40, 40);
        ctx.restore();
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        className="absolute inset-0"
      />
      
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          style={{ background: 'transparent' }}
        >
          <Scene3D />
        </Canvas>
      </div>
      
      <div className="relative z-10 w-full max-w-4xl px-4 max-h-[90vh] overflow-y-auto">
        <div className="retro-border bg-slate-900/40 rounded-lg p-4 sm:p-8 lg:p-12 backdrop-blur-sm">
          <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-center mb-4 sm:mb-6 lg:mb-8 font-mono animate-pulse">
            <span className="retro-title">HIGH SCORES</span>
          </h1>

          <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 max-h-[60vh] overflow-y-auto px-2">
            {scores.map((entry, index) => (
              <div
                key={index}
                className="flex justify-between items-center font-mono text-sm sm:text-lg lg:text-2xl px-3 sm:px-4 lg:px-6 py-2 sm:py-3 lg:py-4 bg-slate-800/70 rounded-lg border-2 retro-row"
                style={{
                  borderColor: index === 0 ? "hsl(45, 90%, 55%)" : 
                               index === 1 ? "hsl(0, 0%, 70%)" :
                               index === 2 ? "hsl(30, 85%, 55%)" : "hsl(200, 70%, 50%)",
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="text-cyan-300 w-8 sm:w-12 lg:w-16 font-bold">{index + 1}.</span>
                <span className="text-pink-400 font-bold text-center text-base sm:text-xl lg:text-3xl tracking-widest flex items-center gap-1 sm:gap-2 flex-1 justify-center">
                  {entry.beatLevel50 && <span className="text-2xl sm:text-3xl lg:text-4xl">👑</span>}
                  <span className="truncate max-w-[120px] sm:max-w-[200px]">{entry.name}</span>
                  {entry.difficulty === "godlike" && (
                    <span className="text-red-500 text-[8px] sm:text-xs lg:text-sm font-bold" style={{ fontFamily: 'monospace', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      GOD-MODE
                    </span>
                  )}
                </span>
                <div className="flex flex-col items-end gap-0.5 sm:gap-1">
                  <span className="text-amber-300 font-bold text-xs sm:text-base lg:text-xl">
                    {entry.score.toLocaleString()}
                  </span>
                  <div className="flex gap-2 text-[10px] sm:text-xs lg:text-sm">
                    <span className="text-purple-400">
                      LVL {entry.level}
                    </span>
                    {entry.startingLives && (
                      <span className="text-green-400">
                        ❤️{entry.startingLives}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="px-6 sm:px-8 lg:px-12 py-3 sm:py-4 lg:py-6 text-base sm:text-xl lg:text-2xl font-bold font-mono bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg transform transition-all hover:scale-105 retro-button"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};