import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HighScoreDisplayProps {
  scores: Array<{ name: string; score: number; level: number; difficulty?: string; beatLevel50?: boolean }>;
  onClose: () => void;
}

// 3D Metal Balls Component
const MetalBalls = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [phase, setPhase] = useState(0); // 0: wave, 1: whirlpool, 2: random
  const timeRef = useRef(0);
  const ballsRef = useRef<THREE.Mesh[]>([]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current;

    // Change phase based on time
    if (time < 10) {
      setPhase(0); // Wave
    } else if (time < 20) {
      setPhase(1); // Whirlpool
    } else if (time < 30) {
      setPhase(2); // Random
    }

    // Disappear after 30 seconds
    if (time >= 30) {
      groupRef.current.visible = false;
      return;
    }

    ballsRef.current.forEach((ball, i) => {
      if (!ball) return;

      if (phase === 0) {
        // Wave motion
        const waveY = Math.sin(time * 2 + i * 0.5) * 2;
        ball.position.set(i - 4.5, waveY, 0);
        ball.rotation.x = time;
        ball.rotation.y = time * 0.5;
      } else if (phase === 1) {
        // Whirlpool
        const angle = (time * 2 + i * 0.6) % (Math.PI * 2);
        const radius = 3 + Math.sin(time + i) * 1;
        ball.position.set(
          Math.cos(angle) * radius,
          Math.sin(time * 3 + i) * 2,
          Math.sin(angle) * radius
        );
        ball.rotation.x = time * 2;
        ball.rotation.y = time;
      } else {
        // Random motion
        ball.position.x += (Math.random() - 0.5) * 0.1;
        ball.position.y += (Math.random() - 0.5) * 0.1;
        ball.position.z += (Math.random() - 0.5) * 0.1;
        ball.rotation.x += 0.1;
        ball.rotation.y += 0.05;
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
          <sphereGeometry args={[0.4, 8, 8]} />
          <meshStandardMaterial
            color="#c0c0c0"
            metalness={1.0}
            roughness={0.2}
            emissive="#888888"
            emissiveIntensity={0.2}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
};

// 3D Retro Donut Component
const RetroDonut = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(30); // Start after balls disappear
  const [visible, setVisible] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    timeRef.current += delta;
    const time = timeRef.current - 30;

    if (time >= 0) {
      setVisible(true);
      
      // Spinning
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.03;
      
      // Zooming in and out
      const scale = 1 + Math.sin(time * 1.5) * 0.5;
      meshRef.current.scale.set(scale, scale, scale);
      
      // Slight movement
      meshRef.current.position.y = Math.sin(time * 0.5) * 0.5;
    }
  });

  if (!visible) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 50 }}
          style={{ background: 'hsl(220, 25%, 8%)' }}
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