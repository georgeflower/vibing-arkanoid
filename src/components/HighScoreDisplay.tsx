import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";
import metalBallTexture from "@/assets/metal-ball-texture.png";
import { useHighScores, type LeaderboardType } from "@/hooks/useHighScores";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

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
  const [selectedType, setSelectedType] = useState<LeaderboardType>(leaderboardType);
  const { highScores: currentScores, isLoading: currentLoading } = useHighScores(selectedType);
  const containerRef = useRef<HTMLDivElement>(null);

  // Swipe gesture for mobile back navigation
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ("ontouchstart" in window && window.matchMedia("(max-width: 768px)").matches);
  
  useSwipeGesture(containerRef, onClose, { enabled: isMobileDevice });

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-screen overflow-hidden swipe-container">
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <Canvas camera={{ position: [0, 0, 15], fov: 50 }}>
          <Scene3D />
        </Canvas>
      </div>
      <div className="absolute inset-0 w-full h-full flex items-center justify-center p-4">
        <div className="relative z-10 bg-slate-900/90 backdrop-blur-md rounded-lg p-8 border-2 border-cyan-500/50 max-w-3xl w-full">
          <h2 className="text-5xl font-bold text-center mb-4 text-cyan-400">
            HIGH SCORES
          </h2>
          
          <div className="flex justify-center gap-2 mb-6">
            <Button
              onClick={() => setSelectedType('all-time')}
              variant={selectedType === 'all-time' ? 'default' : 'outline'}
              className="px-4 py-2 text-sm font-bold"
            >
              ALL TIME
            </Button>
            <Button
              onClick={() => setSelectedType('weekly')}
              variant={selectedType === 'weekly' ? 'default' : 'outline'}
              className="px-4 py-2 text-sm font-bold"
            >
              WEEKLY
            </Button>
            <Button
              onClick={() => setSelectedType('daily')}
              variant={selectedType === 'daily' ? 'default' : 'outline'}
              className="px-4 py-2 text-sm font-bold"
            >
              DAILY
            </Button>
          </div>

          <div className="space-y-2 mb-8 max-h-[60vh] overflow-y-auto">
            {currentLoading ? (
              <div className="text-center text-slate-400 py-12">Loading scores...</div>
            ) : currentScores.length === 0 ? (
              <div className="text-center text-slate-500 py-12">No scores yet!</div>
            ) : (
              currentScores.map((entry, index) => (
                <div key={entry.id || index} className="grid grid-cols-[auto_1fr_auto_auto] gap-2 sm:gap-3 md:gap-4 items-center text-[10px] sm:text-xs md:text-sm lg:text-xl px-2 sm:px-3 md:px-4 py-1 sm:py-2 bg-slate-800/60 rounded-lg border border-cyan-500/30">
                  <span className="text-cyan-300">{index + 1}.</span>
                  
                  <div className="flex flex-col min-w-0">
                    <span className="text-white font-bold flex items-center gap-1 truncate">
                      {entry.beatLevel50 && <span>👑</span>}
                      <span className="truncate">{entry.name}</span>
                    </span>
                    {entry.difficulty === "godlike" && (
                      <span className="text-red-500 text-[8px] sm:text-[9px] md:text-[10px] font-bold leading-tight">GOD-MODE</span>
                    )}
                  </div>
                  
                  <span className="text-white font-bold text-right tabular-nums">{entry.score.toString().padStart(6, '0')}</span>
                  
                  <span className="text-white text-right whitespace-nowrap">LVL{entry.level}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-center">
            <Button onClick={onClose} className="px-8 py-4 text-xl font-bold">CONTINUE</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
