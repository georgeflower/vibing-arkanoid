// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private musicTracks: HTMLAudioElement[] = [];
  private currentTrackIndex = 0;
  private highScoreMusic: HTMLAudioElement | null = null;
  private musicEnabled = true;
  private trackUrls = [
    '/Pixel_Frenzy-2.mp3',
    '/sound_2.mp3',
    '/level_3.mp3',
    '/level_4.mp3'
  ];

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playBackgroundMusic(level: number = 1) {
    if (!this.musicEnabled) return;

    // Initialize track if not already loaded
    if (!this.musicTracks[this.currentTrackIndex]) {
      const audio = new Audio(this.trackUrls[this.currentTrackIndex]);
      audio.volume = 0.3;
      audio.addEventListener('ended', () => this.handleTrackEnd());
      this.musicTracks[this.currentTrackIndex] = audio;
    }

    // Play current track
    this.musicTracks[this.currentTrackIndex]?.play().catch(err => console.log('Audio play failed:', err));
  }

  private handleTrackEnd() {
    // Move to next track and play it continuously
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackUrls.length;
    
    // Play next song immediately if music is enabled
    if (this.musicEnabled) {
      this.playBackgroundMusic();
    }
  }

  pauseBackgroundMusic() {
    this.musicTracks.forEach(track => track?.pause());
  }

  stopBackgroundMusic() {
    this.musicTracks.forEach(track => {
      if (track) {
        track.pause();
        track.currentTime = 0;
      }
    });
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    }
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setCurrentTrack(trackIndex: number) {
    const wasPlaying = this.musicTracks[this.currentTrackIndex] && 
                       !this.musicTracks[this.currentTrackIndex].paused;
    
    this.stopBackgroundMusic();
    this.currentTrackIndex = trackIndex;
    
    if (wasPlaying && this.musicEnabled) {
      this.playBackgroundMusic();
    }
  }

  getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  getTrackNames(): string[] {
    return [
      'Pixel Frenzy',
      'Sound 2',
      'Level 3',
      'Level 4'
    ];
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

  playExplosion() {
    const ctx = this.getAudioContext();
    // Low rumble explosion sound
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(150, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);
    oscillator.type = 'sawtooth';
    
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }
}

export const soundManager = new SoundManager();
