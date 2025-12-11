import multiballImg from "@/assets/powerup-multiball.png";
import turretsImg from "@/assets/powerup-turrets.png";
import fireballImg from "@/assets/powerup-fireball.png";
import lifeImg from "@/assets/powerup-life.png";
import slowdownImg from "@/assets/powerup-slowdown.png";
import extendImg from "@/assets/powerup-extend.png";
import shrinkImg from "@/assets/powerup-shrink.png";
import shieldImg from "@/assets/powerup-shield.png";
import stunnerImg from "@/assets/powerup-stunner.png";
import reflectImg from "@/assets/powerup-reflect.png";
import homingImg from "@/assets/powerup-homing.png";
import type { PowerUpType } from "@/types/game";

export const powerUpImages: Record<PowerUpType, string> = {
  multiball: multiballImg,
  turrets: turretsImg,
  fireball: fireballImg,
  life: lifeImg,
  slowdown: slowdownImg,
  paddleExtend: extendImg,
  paddleShrink: shrinkImg,
  shield: shieldImg,
  bossStunner: stunnerImg,
  reflectShield: reflectImg,
  homingBall: homingImg,
};

export const powerUpColors: Record<PowerUpType, string> = {
  multiball: "hsl(330, 100%, 65%)", // pink
  turrets: "hsl(30, 100%, 60%)", // orange
  fireball: "hsl(30, 100%, 60%)", // orange
  life: "hsl(0, 100%, 60%)", // red
  slowdown: "hsl(200, 100%, 60%)", // cyan
  paddleExtend: "hsl(120, 60%, 45%)", // green
  paddleShrink: "hsl(0, 75%, 55%)", // red
  shield: "hsl(280, 100%, 70%)", // purple
  bossStunner: "hsl(60, 100%, 50%)", // bright yellow
  reflectShield: "hsl(0, 0%, 75%)", // silver
  homingBall: "hsl(0, 100%, 50%)", // red
};
