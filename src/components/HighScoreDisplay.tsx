import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import metalBallTexture from "@/assets/metal-ball-texture.png";
import { useHighScores, type LeaderboardType } from "@/hooks/useHighScores";

interface HighScoreDisplayProps {
  onClose: () => void;
  leaderboardType?: LeaderboardType;
}

const MetalBalls = () => {
  const groupRef = useRef<THREE.Group>(null);
  const ballsRef = useRef<THREE.Mesh[]>([]);
  const texture = useLoader(THREE.TextureLoader, metalBallTexture);

  useFrame(() => {
    ballsRef.current.forEach((ball) => {
      if (ball) {
        ball.rotation.x += 0.03;
        ball.rotation.y += 0.02;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} ref={(el) => { if (el) ballsRef.current[i] = el; }} position={[i - 4.5, 0, 0]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial map={texture} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  );
};

const Scene3D = () => (
  <>
    <ambientLight intensity={0.5} />
    <pointLight position={[10, 10, 10]} intensity={1.5} />
    <Environment preset="city" />
    <MetalBalls />
  </>
);

export const HighScoreDisplay = ({ onClose, leaderboardType = 'all-time' }: HighScoreDisplayProps) => {
  const { highScores, isLoading } = useHighScores(leaderboardType);

  return (
    <div className="fixed inset-0 w-full h-screen overflow-hidden">
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <Scene3D />
        </Canvas>
      </div>
      <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
        <div className="relative z-10 bg-slate-900/90 backdrop-blur-md rounded-lg p-8 border-2 border-cyan-500/50 max-w-3xl w-full">
          <h2 className="text-5xl font-bold text-center mb-8 text-cyan-400 font-mono">
            {leaderboardType === 'daily' && 'DAILY '}
            {leaderboardType === 'weekly' && 'WEEKLY '}
            HIGH SCORES
          </h2>
          <div className="space-y-3 mb-8 max-h-[60vh] overflow-y-auto">
            {isLoading ? (
              <div className="text-center text-slate-400 py-12 font-mono">Loading scores...</div>
            ) : highScores.length === 0 ? (
              <div className="text-center text-slate-500 py-12 font-mono">No scores yet!</div>
            ) : (
              highScores.map((entry, index) => (
                <div key={entry.id || index} className="flex justify-between items-center font-mono px-6 py-3 bg-slate-800/60 rounded-lg border border-cyan-500/30 gap-4">
                  <span className="text-cyan-300 w-12">{index + 1}.</span>
                  <span className="text-pink-400 font-bold flex items-center gap-2 flex-1">
                    {entry.beatLevel50 && <span>👑</span>}
                    <span>{entry.name}</span>
                    {entry.difficulty === "godlike" && <span className="text-red-500 text-xs">GOD-MODE</span>}
                  </span>
                  <span className="text-amber-300 font-bold">{entry.score.toLocaleString()}</span>
                  <span className="text-purple-400 w-20 text-right">LVL {entry.level}</span>
                  <span className="text-green-400 w-24 text-right">{entry.startingLives || 3} ❤️</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={onClose} className="px-8 py-4 text-xl font-bold font-mono">CONTINUE</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
