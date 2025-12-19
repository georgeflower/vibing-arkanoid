// Simple sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;
  private musicTracks: HTMLAudioElement[] = [];
  private currentTrackIndex = 0;
  private highScoreMusic: HTMLAudioElement | null = null;
  private bossMusic: HTMLAudioElement | null = null;
  private savedBackgroundMusicPosition: number = 0;
  private savedBackgroundMusicIndex: number = 0;
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
    
    gainNode.gain.setValueAtTime(0.06, ctx.currentTime);
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
        // First hit - lower pitch, deep crack
        oscillator.frequency.value = 500;
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
        // Final hit - play glass breaking sound
        this.playCrackedBrickBreakSound();
        return;
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

  playExplosiveBrickSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Dramatic multi-layered explosion sound
    // Layer 1: Deep bass rumble
    const bass = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bass.connect(bassGain);
    bassGain.connect(ctx.destination);
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(80, ctx.currentTime);
    bass.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.6);
    bassGain.gain.setValueAtTime(0.25, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    bass.start(ctx.currentTime);
    bass.stop(ctx.currentTime + 0.6);
    
    // Layer 2: Mid-range crack
    const mid = ctx.createOscillator();
    const midGain = ctx.createGain();
    mid.connect(midGain);
    midGain.connect(ctx.destination);
    mid.type = 'square';
    mid.frequency.setValueAtTime(300, ctx.currentTime);
    mid.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
    midGain.gain.setValueAtTime(0.15, ctx.currentTime);
    midGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    mid.start(ctx.currentTime);
    mid.stop(ctx.currentTime + 0.3);
    
    // Layer 3: High sizzle/shrapnel
    const high = ctx.createOscillator();
    const highGain = ctx.createGain();
    const highFilter = ctx.createBiquadFilter();
    high.connect(highFilter);
    highFilter.connect(highGain);
    highGain.connect(ctx.destination);
    high.type = 'sawtooth';
    high.frequency.setValueAtTime(2000, ctx.currentTime);
    high.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    highFilter.type = 'bandpass';
    highFilter.frequency.value = 1500;
    highGain.gain.setValueAtTime(0.12, ctx.currentTime);
    highGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    high.start(ctx.currentTime);
    high.stop(ctx.currentTime + 0.2);
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

  private bossMusisUrls = [
    '/Boss_level_sphere.mp3',
    '/Boss_level_pyramid.mp3',
    '/Boss_level_cube.mp3'
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

  playCrackedBrickBreakSound() {
    // Sound removed - function kept for compatibility
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
    
    gainNode.gain.setValueAtTime(0.075, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.125, ctx.currentTime + 0.4);
    gainNode.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.8);
    
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
    
    gainNode.gain.setValueAtTime(0.224, ctx.currentTime); // 0.32 * 0.7 (30% reduction)
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
    
    // Duck music volume by 80% during boss intro
    const originalVolumes: number[] = [];
    this.musicTracks.forEach((track, index) => {
      if (track) {
        originalVolumes[index] = track.volume;
        track.volume = track.volume * 0.2; // Reduce to 20%
      }
    });
    
    const audio = new Audio('/siren-alarm-boss.ogg');
    audio.volume = 0.7;
    
    // Restore music volume after boss intro sound ends
    audio.addEventListener('ended', () => {
      this.musicTracks.forEach((track, index) => {
        if (track && originalVolumes[index] !== undefined) {
          track.volume = originalVolumes[index];
        }
      });
    });
    
    audio.play().catch(err => console.log('Boss intro sound failed:', err));
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

  playBossMusic(bossLevel: number) {
    if (!this.musicEnabled) return;
    
    // Save current background music state
    const currentTrack = this.musicTracks[this.currentTrackIndex];
    if (currentTrack && !currentTrack.paused) {
      this.savedBackgroundMusicPosition = currentTrack.currentTime;
      this.savedBackgroundMusicIndex = this.currentTrackIndex;
    }
    
    // Pause background music
    this.pauseBackgroundMusic();
    
    // Determine which boss music to play
    let bossTrackUrl = '';
    if (bossLevel === 5) {
      bossTrackUrl = '/Boss_level_cube.mp3';
    } else if (bossLevel === 10) {
      bossTrackUrl = '/Boss_level_sphere.mp3';
    } else if (bossLevel === 15) {
      bossTrackUrl = '/Boss_level_pyramid.mp3';
    }
    
    // Stop any existing boss music
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
    }
    
    // Create and play new boss music with looping
    this.bossMusic = new Audio(bossTrackUrl);
    this.bossMusic.loop = true;
    this.bossMusic.volume = 0.3;
    this.bossMusic.play().catch(err => console.log('Boss music play failed:', err));
  }

  stopBossMusic() {
    if (this.bossMusic) {
      this.bossMusic.pause();
      this.bossMusic.currentTime = 0;
      this.bossMusic = null;
    }
  }

  resumeBackgroundMusic() {
    if (!this.musicEnabled) return;
    
    // Restore the saved track and position
    this.currentTrackIndex = this.savedBackgroundMusicIndex;
    
    // Initialize track if not already loaded
    if (!this.musicTracks[this.currentTrackIndex]) {
      const audio = new Audio(this.trackUrls[this.currentTrackIndex]);
      audio.volume = 0.3;
      audio.addEventListener('ended', () => this.handleTrackEnd());
      this.musicTracks[this.currentTrackIndex] = audio;
    }
    
    const track = this.musicTracks[this.currentTrackIndex];
    if (track) {
      track.currentTime = this.savedBackgroundMusicPosition;
      track.play().catch(err => console.log('Resume music failed:', err));
    }
    
    // Reset saved position
    this.savedBackgroundMusicPosition = 0;
  }

  isBossMusicPlaying(): boolean {
    return this.bossMusic !== null && !this.bossMusic.paused;
  }

  // Boss power-up sound effects
  playBossStunnerSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Electric zap sound - synthesized
    const oscillator1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    oscillator1.connect(gain1);
    gain1.connect(ctx.destination);
    oscillator1.frequency.value = 800;
    oscillator1.type = 'square';
    gain1.gain.setValueAtTime(0.2, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    oscillator1.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.2);
    
    setTimeout(() => {
      const oscillator2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      oscillator2.connect(gain2);
      gain2.connect(ctx.destination);
      oscillator2.frequency.value = 1200;
      oscillator2.type = 'square';
      gain2.gain.setValueAtTime(0.15, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      oscillator2.start(ctx.currentTime);
      oscillator2.stop(ctx.currentTime + 0.15);
    }, 50);
    
    setTimeout(() => {
      const oscillator3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      oscillator3.connect(gain3);
      gain3.connect(ctx.destination);
      oscillator3.frequency.value = 600;
      oscillator3.type = 'square';
      gain3.gain.setValueAtTime(0.25, ctx.currentTime);
      gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      oscillator3.start(ctx.currentTime);
      oscillator3.stop(ctx.currentTime + 0.25);
    }, 100);
  }

  playReflectShieldSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Metallic shield activation
    [400, 600, 800].forEach((freq, i) => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(i === 2 ? 0.2 : 0.15, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.2);
      }, i * 100);
    });
  }

  playHomingBallSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Lock-on beep sequence
    [1000, 1200, 1400].forEach((freq, i) => {
      setTimeout(() => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(i === 2 ? 0.15 : 0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i === 2 ? 0.15 : 0.1));
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + (i === 2 ? 0.15 : 0.1));
      }, i * 150);
    });
  }

  playReflectedAttackSound() {
    if (!this.sfxEnabled) return;
    const ctx = this.getAudioContext();
    
    // Deflection ping
    const oscillator1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    oscillator1.connect(gain1);
    gain1.connect(ctx.destination);
    oscillator1.frequency.value = 900;
    oscillator1.type = 'sine';
    gain1.gain.setValueAtTime(0.1, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator1.start(ctx.currentTime);
    oscillator1.stop(ctx.currentTime + 0.1);
    
    const oscillator2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    oscillator2.connect(gain2);
    gain2.connect(ctx.destination);
    oscillator2.frequency.value = 1100;
    oscillator2.type = 'sine';
    gain2.gain.setValueAtTime(0.15, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    oscillator2.start(ctx.currentTime);
    oscillator2.stop(ctx.currentTime + 0.15);
  }
}

export const soundManager = new SoundManager();
