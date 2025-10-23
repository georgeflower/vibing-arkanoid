import multiballImg from "@/assets/powerup-multiball.png";
import turretsImg from "@/assets/powerup-turrets.png";
import fireballImg from "@/assets/powerup-fireball.png";
import lifeImg from "@/assets/powerup-life.png";
import type { PowerUpType } from "@/types/game";

export const powerUpImages: Record<PowerUpType, string> = {
  multiball: multiballImg,
  turrets: turretsImg,
  fireball: fireballImg,
  life: lifeImg,
};

export const powerUpColors: Record<PowerUpType, string> = {
  multiball: "hsl(330, 100%, 65%)", // pink
  turrets: "hsl(30, 100%, 60%)", // orange
  fireball: "hsl(30, 100%, 60%)", // orange
  life: "hsl(0, 100%, 60%)", // red
};
