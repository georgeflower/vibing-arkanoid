import { useEffect, useState } from "react";

interface BossDefeatAnimationProps {
  onComplete: () => void;
  canvasWidth: number;
  canvasHeight: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export const BossDefeatAnimation = ({ onComplete, canvasWidth, canvasHeight }: BossDefeatAnimationProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flash, setFlash] = useState(true);
  const [textScale, setTextScale] = useState(0);

  useEffect(() => {
    // Create initial particle burst
    const newParticles: Particle[] = [];
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const hue = Math.random() * 60 + 180; // Cyan to blue range
      
      newParticles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 6,
        color: `hsl(${hue}, 100%, 60%)`,
        life: 1,
        maxLife: 1
      });
    }
    
    setParticles(newParticles);

    // Flash effect
    setTimeout(() => setFlash(false), 100);
    setTimeout(() => setFlash(true), 200);
    setTimeout(() => setFlash(false), 300);

    // Text zoom animation
    let scale = 0;
    const scaleInterval = setInterval(() => {
      scale += 0.05;
      if (scale <= 1.2) {
        setTextScale(scale);
      } else {
        clearInterval(scaleInterval);
        // Start pulsing
        let pulse = 1.2;
        let growing = false;
        const pulseInterval = setInterval(() => {
          if (growing) {
            pulse += 0.02;
            if (pulse >= 1.3) growing = false;
          } else {
            pulse -= 0.02;
            if (pulse <= 1.1) growing = true;
          }
          setTextScale(pulse);
        }, 30);

        // Complete after 2.5 seconds
        setTimeout(() => {
          clearInterval(pulseInterval);
          onComplete();
        }, 2500);
      }
    }, 16);

    // Animate particles
    const particleInterval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // Gravity
          life: Math.max(0, p.life - 0.015)
        })).filter(p => p.life > 0)
      );
    }, 16);

    return () => {
      clearInterval(scaleInterval);
      clearInterval(particleInterval);
    };
  }, [onComplete, canvasWidth, canvasHeight]);

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      style={{
        background: flash ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
        transition: 'background 0.1s'
      }}
    >
      {/* Particle canvas */}
      <svg className="absolute inset-0 w-full h-full">
        {particles.map((particle, i) => (
          <circle
            key={i}
            cx={particle.x}
            cy={particle.y}
            r={particle.size}
            fill={particle.color}
            opacity={particle.life}
            style={{
              filter: 'blur(1px)',
              mixBlendMode: 'screen'
            }}
          />
        ))}
      </svg>

      {/* Boss defeated text */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `scale(${textScale})`,
          transition: 'none'
        }}
      >
        <h1 
          className="retro-pixel-text text-4xl md:text-6xl lg:text-7xl font-bold"
          style={{
            color: 'hsl(200, 70%, 50%)',
            textShadow: `
              0 0 20px hsl(200, 70%, 50%),
              0 0 40px hsl(200, 70%, 50%),
              0 0 60px hsl(200, 70%, 50%),
              4px 4px 0px hsl(0, 0%, 20%)
            `,
            WebkitTextStroke: '2px hsl(200, 100%, 30%)',
            paintOrder: 'stroke fill'
          }}
        >
          BOSS DEFEATED!
        </h1>
      </div>
    </div>
  );
};
