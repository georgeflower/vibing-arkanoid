// Sound Manager with integrated music playback (tracker + MP3)
export type MusicSource = "tracker" | "mp3";
export type RepeatMode = "off" | "repeatTrack" | "repeatList";
export type MusicState = "playing" | "paused" | "stopped";
export type VolumeGroup = "music" | "powerUps" | "bricks" | "explosions";

interface MusicAsset {
  key: string;
  title: string;
  path: string;
  type: "xm" | "mp3";
}

interface VolumeGroupGains {
  music: number;
  powerUps: number;
  bricks: number;
  explosions: number;
}

class SoundManager {
  private audioContext: AudioContext | null = null;
  private xmPlayer: any = null;
  private currentMp3Audio: HTMLAudioElement | null = null;
  private highScoreMusic: HTMLAudioElement | null = null;
  private musicSource: MusicSource = "mp3";
  private musicState: MusicState = "stopped";
  private repeatMode: RepeatMode = "repeatList";
  private currentAssetIndex = 0;
  private musicEnabled = true;
  private sfxEnabled = true;
  private volumeGroups: VolumeGroupGains = {
    music: 0.3,
    powerUps: 0.36,
    bricks: 0.0805,
    explosions: 0.088
  };
  private analyser: AnalyserNode | null = null;
  private audioSource: MediaElementAudioSourceNode | null = null;

  private trackerAssets: MusicAsset[] = [
    { key: "omar", title: "Omar", path: "/music/OMAR.XM", type: "xm" },
    { key: "hero", title: "Hero", path: "/music/HERO.XM", type: "xm" },
    { key: "qumcam", title: "Qum Cam", path: "/music/qum-cam.xm", type: "xm" },
    { key: "sparkman", title: "Sparkman", path: "/music/SPARKMAN.XM", type: "xm" },
    { key: "orientp", title: "Orient Palace", path: "/music/orientp.xm", type: "xm" }
  ];

  private mp3Assets: MusicAsset[] = [
    { key: "pixel1", title: "Pixel Frenzy", path: "/Pixel_Frenzy-2.mp3", type: "mp3" },
    { key: "sound2", title: "Sound 2", path: "/sound_2.mp3", type: "mp3" },
    { key: "level3", title: "Level 3", path: "/level_3.mp3", type: "mp3" },
    { key: "level4", title: "Level 4", path: "/level_4.mp3", type: "mp3" },
    { key: "level5", title: "Level 5", path: "/level_5.mp3", type: "mp3" },
    { key: "level7", title: "Level 7", path: "/level_7.mp3", type: "mp3" },
    { key: "turrican", title: "Turrican", path: "/Turrican.mp3", type: "mp3" },
    { key: "turrican2", title: "Turrican 2", path: "/Turrican_2.mp3", type: "mp3" },
    { key: "flubber", title: "Flubber Happy", path: "/Flubber_Happy_Moderate_Amiga.mp3", type: "mp3" }
  ];

  constructor() {
    this.loadPreferences();
    this.initXMPlayer();
  }

  private loadPreferences() {
    const saved = localStorage.getItem("soundManagerPrefs");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        this.musicSource = prefs.musicSource || "mp3";
        this.repeatMode = prefs.repeatMode || "repeatList";
        this.musicEnabled = prefs.musicEnabled !== false;
        this.sfxEnabled = prefs.sfxEnabled !== false;
        if (prefs.volumeGroups) {
          this.volumeGroups = { ...this.volumeGroups, ...prefs.volumeGroups };
        }
      } catch (e) {
        console.warn("Failed to load sound preferences:", e);
      }
    }
  }

  private savePreferences() {
    localStorage.setItem("soundManagerPrefs", JSON.stringify({
      musicSource: this.musicSource,
      repeatMode: this.repeatMode,
      musicEnabled: this.musicEnabled,
      sfxEnabled: this.sfxEnabled,
      volumeGroups: this.volumeGroups
    }));
  }

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private async initXMPlayer() {
    if (typeof window !== "undefined" && (window as any).XMPlayer) {
      this.xmPlayer = (window as any).XMPlayer;
      console.log("[SoundManager] XMPlayer initialized");
    }
  }

  // Music playback API
  async play(key?: string) {
    if (!this.musicEnabled) {
      console.log("[SoundManager] Music disabled, not playing");
      return;
    }

    const playlist = this.getCurrentPlaylist();
    
    if (key) {
      const index = playlist.findIndex(asset => asset.key === key);
      if (index !== -1) {
        this.currentAssetIndex = index;
      }
    }

    const asset = playlist[this.currentAssetIndex];
    if (!asset) {
      console.warn("[SoundManager] No asset to play");
      return;
    }

    console.log(`[SoundManager Debug] musicEngine: "${this.musicSource === "tracker" ? "xmtracker" : "mp3"}", musicState: "playing", musicSource: "${this.musicSource}"`);

    await this.stopCurrent();

    if (this.musicSource === "tracker" && asset.type === "xm") {
      await this.playTracker(asset);
    } else if (this.musicSource === "mp3" && asset.type === "mp3") {
      await this.playMp3(asset);
    }

    this.musicState = "playing";
  }

  private async playTracker(asset: MusicAsset) {
    if (!this.xmPlayer) {
      console.warn("[SoundManager] XMPlayer not available, falling back to MP3");
      if (this.mp3Assets.length > 0) {
        this.musicSource = "mp3";
        this.savePreferences();
        await this.playMp3(this.mp3Assets[0]);
      }
      return;
    }

    try {
      const response = await fetch(asset.path);
      const arrayBuffer = await response.arrayBuffer();
      
      const ctx = this.getAudioContext();
      await ctx.resume();

      this.xmPlayer.load(arrayBuffer);
      this.xmPlayer.play(ctx.sampleRate, (left: Float32Array, right: Float32Array) => {
        const gain = this.volumeGroups.music;
        for (let i = 0; i < left.length; i++) {
          left[i] *= gain;
          right[i] *= gain;
        }
      });

      console.log(`[SoundManager] Playing tracker: ${asset.title}`);
    } catch (error) {
      console.error("[SoundManager] Error playing tracker:", error);
    }
  }

  private async playMp3(asset: MusicAsset) {
    try {
      this.currentMp3Audio = new Audio(asset.path);
      this.currentMp3Audio.volume = this.volumeGroups.music;
      this.currentMp3Audio.addEventListener("ended", () => this.handleTrackEnd());
      
      const ctx = this.getAudioContext();
      await ctx.resume();

      // Setup analyser for visualization
      if (!this.audioSource) {
        this.audioSource = ctx.createMediaElementSource(this.currentMp3Audio);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = 2048;
        this.audioSource.connect(this.analyser);
        this.analyser.connect(ctx.destination);
      }
      
      await this.currentMp3Audio.play();
      console.log(`[SoundManager] Playing MP3: ${asset.title}`);
    } catch (error) {
      console.error("[SoundManager] Error playing MP3:", error);
    }
  }

  pause() {
    if (this.musicState !== "playing") return;

    if (this.xmPlayer && this.musicSource === "tracker") {
      this.xmPlayer.pause();
    } else if (this.currentMp3Audio) {
      this.currentMp3Audio.pause();
    }

    this.musicState = "paused";
    console.log("[SoundManager Debug] musicState: \"paused\"");
  }

  async resume() {
    if (this.musicState !== "paused") return;

    if (this.xmPlayer && this.musicSource === "tracker") {
      const ctx = this.getAudioContext();
      await ctx.resume();
      this.xmPlayer.play(ctx.sampleRate);
    } else if (this.currentMp3Audio) {
      await this.currentMp3Audio.play();
    }

    this.musicState = "playing";
    console.log("[SoundManager Debug] musicState: \"playing\"");
  }

  stop() {
    this.stopCurrent();
    this.musicState = "stopped";
    console.log("[SoundManager Debug] musicState: \"stopped\"");
  }

  private async stopCurrent() {
    if (this.xmPlayer) {
      this.xmPlayer.stop();
    }
    if (this.currentMp3Audio) {
      this.currentMp3Audio.pause();
      this.currentMp3Audio.currentTime = 0;
      this.currentMp3Audio = null;
    }
  }

  next() {
    const playlist = this.getCurrentPlaylist();
    this.currentAssetIndex = (this.currentAssetIndex + 1) % playlist.length;
    console.log(`[SoundManager Debug] musicRepeat: "${this.repeatMode}" - Next track: ${playlist[this.currentAssetIndex].title}`);
    if (this.musicState === "playing") {
      this.play();
    }
  }

  previous() {
    const playlist = this.getCurrentPlaylist();
    this.currentAssetIndex = (this.currentAssetIndex - 1 + playlist.length) % playlist.length;
    console.log(`[SoundManager Debug] musicRepeat: "${this.repeatMode}" - Previous track: ${playlist[this.currentAssetIndex].title}`);
    if (this.musicState === "playing") {
      this.play();
    }
  }

  private handleTrackEnd() {
    console.log(`[SoundManager] Track ended, repeatMode: ${this.repeatMode}`);
    
    if (this.repeatMode === "repeatTrack") {
      this.play();
    } else if (this.repeatMode === "repeatList") {
      this.next();
    } else {
      this.stop();
    }
  }

  initializeRandomTrack() {
    const playlist = this.getCurrentPlaylist();
    this.currentAssetIndex = Math.floor(Math.random() * playlist.length);
  }

  // Volume group management
  setGroupGain(group: VolumeGroup, gain: number) {
    this.volumeGroups[group] = Math.max(0, Math.min(1, gain));
    
    if (group === "music" && this.currentMp3Audio) {
      this.currentMp3Audio.volume = this.volumeGroups.music;
    }
    
    this.savePreferences();
  }

  adjustGroupGain(group: VolumeGroup, percentChange: number) {
    const currentGain = this.volumeGroups[group];
    const newGain = currentGain * (1 + percentChange / 100);
    this.setGroupGain(group, newGain);
  }

  getGroupGain(group: VolumeGroup): number {
    return this.volumeGroups[group];
  }

  // Getters and setters
  getMusicSource(): MusicSource {
    return this.musicSource;
  }

  setMusicSource(source: MusicSource) {
    if (this.musicSource !== source) {
      this.musicSource = source;
      this.currentAssetIndex = 0;
      this.savePreferences();
      
      if (this.musicState === "playing") {
        this.play();
      }
      
      console.log(`[SoundManager Debug] musicSource: "${source}"`);
    }
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  setRepeatMode(mode: RepeatMode) {
    this.repeatMode = mode;
    this.savePreferences();
    console.log(`[SoundManager Debug] musicRepeat: "${mode}"`);
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.savePreferences();
    
    if (!enabled && this.musicState === "playing") {
      this.stop();
    }
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
    this.savePreferences();
  }

  getSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  getMusicState(): MusicState {
    return this.musicState;
  }

  getCurrentPlaylist(): MusicAsset[] {
    return this.musicSource === "tracker" ? this.trackerAssets : this.mp3Assets;
  }

  getCurrentTrackIndex(): number {
    return this.currentAssetIndex;
  }

  getTrackNames(): string[] {
    return this.getCurrentPlaylist().map(asset => asset.title);
  }

  isMusicPlaying(): boolean {
    return this.musicState === "playing";
  }

  getCurrentTrackTitle(): string {
    const playlist = this.getCurrentPlaylist();
    return playlist[this.currentAssetIndex]?.title || "No Track";
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  // High score music
  playHighScoreMusic() {
    this.stopCurrent();
    
    if (!this.highScoreMusic) {
      this.highScoreMusic = new Audio('/High_score.mp3');
      this.highScoreMusic.volume = 0.5;
      this.highScoreMusic.loop = true;
    }
    
    if (this.highScoreMusic) {
      this.highScoreMusic.currentTime = 0;
      this.highScoreMusic.play();
    }
  }

  stopHighScoreMusic() {
    if (this.highScoreMusic) {
      this.highScoreMusic.pause();
      this.highScoreMusic.currentTime = 0;
    }
  }

  // Sound effects
  playBounce() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 400;
    gainNode.gain.value = 0.1;
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.05);
  }

  playBrickHit() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(this.volumeGroups.bricks, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.15);
  }

  playPowerUp() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(523, context.currentTime);
    oscillator.frequency.setValueAtTime(659, context.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(784, context.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(this.volumeGroups.powerUps, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  }

  playShoot() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, context.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.1);
  }

  playLoseLife() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(55, context.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.3, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.5);
  }

  playWin() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const notes = [523, 659, 784, 1047];
    
    notes.forEach((freq, i) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = freq;
      gainNode.gain.setValueAtTime(0.2, context.currentTime + i * 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + i * 0.15 + 0.3);
      
      oscillator.start(context.currentTime + i * 0.15);
      oscillator.stop(context.currentTime + i * 0.15 + 0.3);
    });
  }

  playExplosion() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const bufferSize = context.sampleRate * 0.5;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.1));
    }
    
    const source = context.createBufferSource();
    const gainNode = context.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    gainNode.gain.value = this.volumeGroups.explosions;
    
    source.start(context.currentTime);
  }

  // Power-up specific sounds
  playMultiballSound() {
    const audio = new Audio('/multiball.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playTurretsSound() {
    const audio = new Audio('/turrets.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playFireballSound() {
    const audio = new Audio('/fireball.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playBombDropSound() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.setValueAtTime(800, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.3);
    gainNode.gain.setValueAtTime(0.15, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  }

  playPyramidBulletSound() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.value = 600;
    gainNode.gain.setValueAtTime(0.08, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.08);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.08);
  }

  playExtraLifeSound() {
    const audio = new Audio('/extra_life.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playSlowerSound() {
    const audio = new Audio('/slower.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playWiderSound() {
    const audio = new Audio('/wider.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playShrinkSound() {
    const audio = new Audio('/shrink.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playShieldSound() {
    const audio = new Audio('/shield.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playSmallerSound() {
    const audio = new Audio('/smaller.mp3');
    audio.volume = this.volumeGroups.powerUps;
    audio.play();
  }

  playBonusLetterPickup() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.setValueAtTime(1760, context.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.15);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.15);
  }

  playBonusComplete() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const frequencies = [523.25, 659.25, 783.99, 1046.50];
    
    frequencies.forEach((freq, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      
      const startTime = context.currentTime + index * 0.1;
      gainNode.gain.setValueAtTime(0.3, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.4);
    });
  }

  playMenuClick() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 800;
    gainNode.gain.setValueAtTime(0.1, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.05);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.05);
  }

  playMenuHover() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 600;
    gainNode.gain.setValueAtTime(0.05, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.03);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.03);
  }

  playSliderChange() {
    if (!this.sfxEnabled) return;
    const context = this.getAudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    
    oscillator.frequency.value = 300;
    gainNode.gain.setValueAtTime(0.03, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.02);
    
    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.02);
  }

  toggleMute() {
    console.warn("[SoundManager] toggleMute is deprecated");
    if (this.musicState === "playing") {
      this.pause();
    } else {
      this.resume();
    }
  }
}

export const soundManager = new SoundManager();
