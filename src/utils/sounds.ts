// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private musicTracks: HTMLAudioElement[] = [];
  private currentTrackIndex = 0;
  private highScoreMusic: HTMLAudioElement | null = null;
  private introMusic: HTMLAudioElement | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private trackUrls = [
    '/Pixel_Frenzy-2.mp3',
    '/level_3.mp3',
    '/level_4.mp3',
    '/level_5.mp3',
    '/level_7.mp3',
    '/Turrican.mp3',
    '/Turrican_2.mp3',
    '/Flubber_Happy_Moderate_Amiga.mp3',
    '/leve_boss_chip_atari.mp3',
    '/level_cave_c64.mp3',
    '/level_cave_2_c64.mp3',
    '/level_cave_chip_atari.mp3',
    '/level_cave_chip_atari_2.mp3',
    '/level_dessert_chip_atari_2.mp3',
    '/level_dessert_chip_atari_2_2.mp3'
  ];

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private stopAllMusic() {
    // Stop all music types to ensure only one plays at a time
    this.stopBackgroundMusic();
    this.stopIntroMusic();
    this.stopHighScoreMusic();
  }

  playBackgroundMusic(level: number = 1) {
    if (!this.musicEnabled) return;

    // Stop all other music types first
    this.stopAllMusic();

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
    // Move to next track in sequence
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackUrls.length;
    
    // Play next song immediately if music is enabled
    if (this.musicEnabled) {
      this.playBackgroundMusic();
    }
  }

  initializeRandomTrack() {
    // Only used at game start to pick random first track
    this.currentTrackIndex = Math.floor(Math.random() * this.trackUrls.length);
  }

  pauseBackgroundMusic() {
    this.musicTracks.forEach(track => track?.pause());
  }

  resumeBackgroundMusic() {
    if (!this.musicEnabled) return;
    const currentTrack = this.musicTracks[this.currentTrackIndex];
    if (currentTrack) {
      currentTrack.play().catch(err => console.log('Resume audio failed:', err));
    }
  }

  pauseIntroMusic() {
    if (this.introMusic) {
      this.introMusic.pause();
    }
  }

  resumeIntroMusic() {
    if (!this.musicEnabled || !this.introMusic) return;
    this.introMusic.play().catch(err => console.log('Resume intro music failed:', err));
  }

  pauseHighScoreMusic() {
    if (this.highScoreMusic) {
      this.highScoreMusic.pause();
    }
  }

  resumeHighScoreMusic() {
    if (!this.musicEnabled || !this.highScoreMusic) return;
    this.highScoreMusic.play().catch(err => console.log('Resume high score music failed:', err));
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
      // Pause all music instead of stopping
      this.pauseBackgroundMusic();
      this.pauseIntroMusic();
      this.pauseHighScoreMusic();
    } else {
      // Resume whichever music was playing
      this.resumeBackgroundMusic();
      this.resumeIntroMusic();
      this.resumeHighScoreMusic();
    }
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  getSfxEnabled(): boolean {
    return this.sfxEnabled;
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
      'Level 3',
      'Level 4',
      'Level 5',
      'Level 7',
      'Turrican',
      'Turrican 2',
      'Flubber Happy',
      'Boss Chip Atari',
      'Cave C64',
      'Cave 2 C64',
      'Cave Chip Atari',
      'Cave Chip Atari 2',
      'Desert Chip Atari 2',
      'Desert Chip Atari 2-2'
    ];
  }

  playIntroMusic() {
    if (!this.musicEnabled) return;
    
    // Stop all other music first
    this.stopAllMusic();
    
    if (!this.introMusic) {
      this.introMusic = new Audio('/sound_2.mp3');
      this.introMusic.loop = true;
      this.introMusic.volume = 0.3;
    }
    this.introMusic.play().catch(err => console.log('Intro music play failed:', err));
  }

  stopIntroMusic() {
    if (this.introMusic) {
      this.introMusic.pause();
      this.introMusic.currentTime = 0;
    }
  }

  // UI Sound effects
  playUIClick() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.05);
  }

  playUIToggle() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  }

  playUISlider() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }

  playHighScoreMusic() {
    this.stopAllMusic(); // Stop all other music
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    if (!this.sfxEnabled) return;
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
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  // Power-up specific sounds
  playMultiballSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/multiball.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Multiball sound failed:', err));
  }

  playTurretsSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/turrets.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Turrets sound failed:', err));
  }

  playFireballSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/fireball.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Fireball sound failed:', err));
  }

  playBombDropSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Pew sound - quick descending pitch
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }

  playPyramidBulletSound() {
    if (!this.sfxEnabled) return;
    const audioContext = this.getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Swooshing pew sound - sweep from high to mid with wave modulation
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  }

  playExtraLifeSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/extra_life.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Extra life sound failed:', err));
  }

  playSlowerSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/slower.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Slower sound failed:', err));
  }

  playWiderSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/wider.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Wider sound failed:', err));
  }

  playShrinkSound() {
    if (!this.sfxEnabled) return;
    const audio = new Audio('/smaller.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Shrink sound failed:', err));
  }

  playBonusLetterPickup() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // "Duuuip" - robotic blip sound
    oscillator.frequency.setValueAtTime(600, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }

  playBonusComplete() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    // Victory fanfare - triumphant ascending notes
    [0, 0.15, 0.3, 0.45, 0.6].forEach((time, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const freq = [523, 659, 784, 1047, 1319][i]; // C5, E5, G5, C6, E6
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.4);

      oscillator.start(ctx.currentTime + time);
      oscillator.stop(ctx.currentTime + time + 0.4);
    });
  }

  isMusicPlaying(): boolean {
    return this.musicTracks.some(track => track && !track.paused && track.currentTime > 0);
  }

  nextTrack() {
    this.stopBackgroundMusic();
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.trackUrls.length;
    
    if (this.musicEnabled) {
      this.playBackgroundMusic();
    }
  }

  previousTrack() {
    this.stopBackgroundMusic();
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.trackUrls.length) % this.trackUrls.length;
    
    if (this.musicEnabled) {
      this.playBackgroundMusic();
    }
  }

  toggleMute() {
    this.musicEnabled = !this.musicEnabled;
    if (!this.musicEnabled) {
      this.pauseBackgroundMusic();
    } else {
      this.playBackgroundMusic();
    }
    return this.musicEnabled;
  }
}

export const soundManager = new SoundManager();
