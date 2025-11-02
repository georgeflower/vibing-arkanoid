// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private bgMusic: HTMLAudioElement | null = null;
  private turricanMusic: HTMLAudioElement | null = null;
  private highScoreMusic: HTMLAudioElement | null = null;
  private currentTrack: 'pixel' | 'turrican' = 'pixel';

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playBackgroundMusic(level: number = 1) {
    // Switch to Turrican track from level 10 onwards
    if (level >= 10 && this.currentTrack !== 'turrican') {
      this.stopBackgroundMusic();
      this.currentTrack = 'turrican';
    } else if (level < 10 && this.currentTrack !== 'pixel') {
      this.stopBackgroundMusic();
      this.currentTrack = 'pixel';
    }

    if (this.currentTrack === 'turrican') {
      if (!this.turricanMusic) {
        this.turricanMusic = new Audio('/Turrican.mp3');
        this.turricanMusic.loop = true;
        this.turricanMusic.volume = 0.3;
      }
      this.turricanMusic.play().catch(err => console.log('Turrican audio play failed:', err));
    } else {
      if (!this.bgMusic) {
        this.bgMusic = new Audio('/Pixel_Frenzy.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.3;
      }
      this.bgMusic.play().catch(err => console.log('Audio play failed:', err));
    }
  }

  pauseBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
    if (this.turricanMusic) {
      this.turricanMusic.pause();
    }
  }

  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
    if (this.turricanMusic) {
      this.turricanMusic.pause();
      this.turricanMusic.currentTime = 0;
    }
  }

  playHighScoreMusic() {
    this.stopBackgroundMusic(); // Stop game music
    if (!this.highScoreMusic) {
      this.highScoreMusic = new Audio('/High_score.mp3');
      this.highScoreMusic.loop = true;
      this.highScoreMusic.volume = 0.4;
    }
    this.highScoreMusic.play().catch(err => console.log('High score audio play failed:', err));
  }

  stopHighScoreMusic() {
    if (this.highScoreMusic) {
      this.highScoreMusic.pause();
      this.highScoreMusic.currentTime = 0;
    }
  }

  playBounce() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 200;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  playBrickHit() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  playPowerUp() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  playShoot() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  playLoseLife() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(400, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  playWin() {
    const ctx = this.getAudioContext();
    [0, 0.1, 0.2, 0.3].forEach((time, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const freq = [262, 330, 392, 523][i]; // C, E, G, C
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.3);

      oscillator.start(ctx.currentTime + time);
      oscillator.stop(ctx.currentTime + time + 0.3);
    });
  }
}

export const soundManager = new SoundManager();
