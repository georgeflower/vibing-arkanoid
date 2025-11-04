import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import metalBallTexture from "@/assets/metal-ball-texture.png";

interface HighScoreDisplayProps {
  scores: Array<{ name: string; score: number; level: number; difficulty?: string; beatLevel50?: boolean }>;
  onClose: () => void;
}

// 3D Metal Balls Component
const MetalBalls = () => {
  const groupRef = useRef<THREE.Group>(null);
  const ballsRef = useRef<THREE.Mesh[]>([]);
  const texture = useLoader(THREE.TextureLoader, metalBallTexture);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Loop through phases continuously (30 second cycle)
    const cycleTime = time % 30;
    let phase = 0;
    
    if (cycleTime < 10) {
      phase = 0; // Wave
    } else if (cycleTime < 20) {
      phase = 1; // Whirlpool
    } else {
      phase = 2; // Random
    }

    ballsRef.current.forEach((ball, i) => {
      if (!ball) return;

      // Continuous spinning for all balls
      ball.rotation.x += 0.03;
      ball.rotation.y += 0.02;
      ball.rotation.z += 0.01;

      if (phase === 0) {
        // Wave motion
        const waveY = Math.sin(time * 2 + i * 0.5) * 2;
        ball.position.set(i - 4.5, waveY, 0);
      } else if (phase === 1) {
        // Whirlpool
        const angle = (time * 2 + i * 0.6) % (Math.PI * 2);
        const radius = 3 + Math.sin(time + i) * 1;
        ball.position.set(
          Math.cos(angle) * radius,
          Math.sin(time * 3 + i) * 2,
          Math.sin(angle) * radius
        );
      } else {
        // Smooth random motion using sine waves
        ball.position.x = (i - 4.5) + Math.sin(time + i) * 3;
        ball.position.y = Math.cos(time * 1.5 + i * 0.5) * 2;
        ball.position.z = Math.sin(time * 0.8 + i * 0.3) * 2;
      }
    });
  });

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
            map={texture}
            metalness={1.0}
            roughness={0.1}
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

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // Spinning
    meshRef.current.rotation.x += 0.02;
    meshRef.current.rotation.y += 0.03;
    
    // Zooming in and out
    const scale = 1 + Math.sin(time * 1.5) * 0.5;
    meshRef.current.scale.set(scale, scale, scale);
    
    // Slight movement
    meshRef.current.position.y = Math.sin(time * 0.5) * 0.5;
  });

  return (
    <mesh ref={meshRef}>
      <torusGeometry args={[2, 0.8, 8, 16]} />
      <meshStandardMaterial
        color="#c0c0c0"
        metalness={0.8}
        roughness={0.3}
        emissive="#ff00ff"
        emissiveIntensity={0.4}
        flatShading
      />
    </mesh>
  );
};

// 3D Scene Component
const Scene3D = () => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#ff00ff" />
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

      // Floating circles
      for (let i = 0; i < 5; i++) {
        const x = canvas.width / 2 + Math.sin(time + i) * 200;
        const y = canvas.height / 2 + Math.cos(time * 0.7 + i) * 150;
        const radius = 30 + Math.sin(time * 2 + i) * 10;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = i % 2 === 0 ? "hsl(330, 70%, 55%)" : "hsl(200, 70%, 50%)";
        ctx.strokeStyle = i % 2 === 0 ? "hsla(330, 70%, 55%, 0.3)" : "hsla(200, 70%, 50%, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Rotating squares
      ctx.shadowBlur = 15;
      for (let i = 0; i < 3; i++) {
        const x = canvas.width / 2 + Math.cos(time * 0.5 + i * 2) * 250;
        const y = canvas.height / 2 + Math.sin(time * 0.5 + i * 2) * 150;
        
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
      
      <div className="relative z-10 w-full max-w-3xl px-4">
        <div className="retro-border bg-slate-900/40 rounded-lg p-12 backdrop-blur-sm">
          <h1 className="text-6xl font-bold text-center mb-8 font-mono animate-pulse">
            <span className="retro-title">HIGH SCORES</span>
          </h1>

          <div className="space-y-3 mb-8">
            {scores.map((entry, index) => (
              <div
                key={index}
                className="flex justify-between items-center font-mono text-2xl px-6 py-4 bg-slate-800/70 rounded-lg border-2 retro-row"
                style={{
                  borderColor: index === 0 ? "hsl(45, 90%, 55%)" : 
                               index === 1 ? "hsl(0, 0%, 70%)" :
                               index === 2 ? "hsl(30, 85%, 55%)" : "hsl(200, 70%, 50%)",
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <span className="text-cyan-300 w-16 font-bold">{index + 1}.</span>
                <span className="text-pink-400 font-bold text-center text-3xl tracking-widest flex items-center gap-2">
                  {entry.beatLevel50 && <span className="text-4xl">👑</span>}
                  <span>{entry.name}</span>
                  {entry.difficulty === "godlike" && (
                    <span className="text-red-500 text-sm font-bold" style={{ fontFamily: 'monospace', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                      GOD-MODE
                    </span>
                  )}
                </span>
                <span className="text-amber-300 flex-1 text-right font-bold">
                  {entry.score.toLocaleString()}
                </span>
                <span className="text-purple-400 w-32 text-right">
                  LEVEL {entry.level}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={onClose}
              className="px-12 py-6 text-2xl font-bold font-mono bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white rounded-lg transform transition-all hover:scale-105 retro-button"
            >
              CONTINUE
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};