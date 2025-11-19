// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private musicTracks: HTMLAudioElement[] = [];
  private currentTrackIndex = 0;
  private highScoreMusic: HTMLAudioElement | null = null;
  private musicEnabled = true;
  private sfxEnabled = true;
  private trackUrls = [
    '/Pixel_Frenzy-2.mp3',
    '/sound_2.mp3',
    '/level_3.mp3',
    '/level_4.mp3',
    '/level_5.mp3',
    '/level_7.mp3',
    '/Turrican.mp3',
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

  playBackgroundMusic(level: number = 1) {
    if (!this.musicEnabled) return;

    // Stop all currently playing tracks first
    this.musicTracks.forEach((track, index) => {
      if (track && !track.paused) {
        track.pause();
        track.currentTime = 0;
      }
    });

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
      'Sound 2',
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

  playBrickHit(brickType?: string, hitsRemaining?: number) {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Progressive sound effects for cracked bricks
    if (brickType === "cracked" && hitsRemaining !== undefined) {
      if (hitsRemaining === 3) {
        // Light crack - high pitch, quick
        oscillator.frequency.value = 1000;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.04);
      } else if (hitsRemaining === 2) {
        // Medium crack - mid pitch, slightly longer
        oscillator.frequency.value = 700;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.10, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.06);
      } else if (hitsRemaining === 1) {
        // Heavy crack - low pitch, longer with rumble
        oscillator.frequency.setValueAtTime(500, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.08);
      }
    } else {
      // Default brick hit sound
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.092, ctx.currentTime); // +15%
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.05);
    }
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
    
    gainNode.gain.setValueAtTime(0.1056, ctx.currentTime); // +20%
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  // Power-up specific sounds
  // AudioBuffer cache for preloaded sounds
  private audioBuffers: { [key: string]: AudioBuffer } = {};
  private soundsLoaded = false;

  private soundUrls = [
    '/multiball.mp3',
    '/turrets.mp3',
    '/fireball.mp3',
    '/extra_life.mp3',
    '/slower.mp3',
    '/wider.mp3',
    '/smaller.mp3',
    '/shield.mp3'
  ];

  async preloadSounds(): Promise<void> {
    if (this.soundsLoaded) return;

    const ctx = this.getAudioContext();
    
    try {
      const loadPromises = this.soundUrls.map(async (url) => {
        try {
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          this.audioBuffers[url] = audioBuffer;
        } catch (err) {
          console.warn(`Failed to load sound ${url}:`, err);
        }
      });

      await Promise.all(loadPromises);
      this.soundsLoaded = true;
      console.log('Power-up sounds preloaded successfully');
    } catch (err) {
      console.error('Error preloading sounds:', err);
    }
  }

  private playAudioBuffer(buffer: AudioBuffer, volume: number): void {
    if (!buffer) return;

    const ctx = this.getAudioContext();
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Apply 20% volume boost for power-up sounds
    gainNode.gain.value = volume * 1.2;

    source.start(0);
  }

  playMultiballSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/multiball.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playTurretsSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/turrets.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playFireballSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/fireball.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
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

  playLaserChargingSound() {
    if (!this.sfxEnabled) return;
    
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.8);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);
  }

  playBossHitSound() {
    if (!this.sfxEnabled) return;
    
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  playBossDefeatSound() {
    if (!this.sfxEnabled) return;
    
    const ctx = this.getAudioContext();
    
    // Multiple oscillators for dramatic effect
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(400 - i * 100, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.5);
        
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      }, i * 100);
    }
  }

  playBossPhaseTransitionSound() {
    if (!this.sfxEnabled) return;
    
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  }

  playBossIntroSound() {
    if (!this.sfxEnabled) return;
    
    const ctx = this.getAudioContext();
    
    // Dramatic intro sound
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(100 + i * 50, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      }, i * 100);
    }
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
    const buffer = this.audioBuffers['/extra_life.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playSlowerSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/slower.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playWiderSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/wider.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playShrinkSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/smaller.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playShieldSound() {
    if (!this.sfxEnabled) return;
    const buffer = this.audioBuffers['/shield.mp3'];
    if (buffer) {
      this.playAudioBuffer(buffer, 0.6);
    }
  }

  playBonusLetterPickup() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Brilliant sparkle sound with multiple harmonics
    [0, 0.05, 0.1].forEach((time, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      const freq = [800, 1200, 1600][i];
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + time);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + time + 0.2);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.2);

      oscillator.start(ctx.currentTime + time);
      oscillator.stop(ctx.currentTime + time + 0.2);
    });
  }

  playBonusComplete() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    // Grand triumphant fanfare with rich harmonics
    const melody = [
      { time: 0, freq: 523 },     // C5
      { time: 0.12, freq: 659 },  // E5
      { time: 0.24, freq: 784 },  // G5
      { time: 0.36, freq: 1047 }, // C6
      { time: 0.48, freq: 1319 }, // E6
      { time: 0.6, freq: 1568 },  // G6
      { time: 0.72, freq: 2093 }, // C7
    ];

    melody.forEach(({ time, freq }) => {
      // Main note
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.35, ctx.currentTime + time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.5);
      oscillator.start(ctx.currentTime + time);
      oscillator.stop(ctx.currentTime + time + 0.5);

      // Harmonic (octave)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = freq * 2;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + time);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + time + 0.5);
      osc2.start(ctx.currentTime + time);
      osc2.stop(ctx.currentTime + time + 0.5);
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

  // Menu UI sounds
  playMenuClick() {
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

  playMenuHover() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.04);
  }

  playSliderChange() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 600;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.03);
  }
}

export const soundManager = new SoundManager();
