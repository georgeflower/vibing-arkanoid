// Music Manager with support for both .xm tracker modules and MP3 files
// Includes volume groups, playlist management, and crossfading

export type MusicSource = "tracker" | "mp3";
export type RepeatMode = "off" | "repeatTrack" | "repeatList";
export type MusicState = "playing" | "paused" | "stopped";
export type VolumeGroup = "music" | "powerUps" | "bricks" | "explosions";

interface MusicAsset {
  key: string;
  title: string;
  path: string;
  type: "xm" | "mp3";
  metadata?: {
    bpm?: number;
    channels?: number;
    length?: number;
    defaultGain?: number;
  };
}

interface VolumeGroupGains {
  music: number;
  powerUps: number;
  bricks: number;
  explosions: number;
}

class MusicManager {
  private audioContext: AudioContext | null = null;
  private xmPlayer: any = null; // XMPlayer from xm.js
  private currentMp3Audio: HTMLAudioElement | null = null;
  private musicSource: MusicSource = "mp3";
  private musicState: MusicState = "stopped";
  private repeatMode: RepeatMode = "repeatList";
  private currentAssetIndex = 0;
  private musicEnabled = true;
  private volumeGroups: VolumeGroupGains = {
    music: 0.3,
    powerUps: 0.36, // +20% = 0.3 * 1.2
    bricks: 0.0805, // 0.07 * 1.15
    explosions: 0.088 // +20% = 0.088 * 1.2 (from existing 0.088)
  };

  // Music assets
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
    const saved = localStorage.getItem("musicManagerPrefs");
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        this.musicSource = prefs.musicSource || "mp3";
        this.repeatMode = prefs.repeatMode || "repeatList";
        this.musicEnabled = prefs.musicEnabled !== false;
        if (prefs.volumeGroups) {
          this.volumeGroups = { ...this.volumeGroups, ...prefs.volumeGroups };
        }
      } catch (e) {
        console.warn("Failed to load music preferences:", e);
      }
    }
  }

  private savePreferences() {
    localStorage.setItem("musicManagerPrefs", JSON.stringify({
      musicSource: this.musicSource,
      repeatMode: this.repeatMode,
      musicEnabled: this.musicEnabled,
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
    // XMPlayer will be loaded from xm.js script tag
    if (typeof window !== "undefined" && (window as any).XMPlayer) {
      this.xmPlayer = (window as any).XMPlayer;
      console.log("[MusicManager] XMPlayer initialized");
    }
  }

  // Public API Methods

  async play(key?: string) {
    if (!this.musicEnabled) {
      console.log("[MusicManager] Music disabled, not playing");
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
      console.warn("[MusicManager] No asset to play");
      return;
    }

    console.log(`[MusicManager Debug] musicEngine: "${this.musicSource === "tracker" ? "xmtracker" : "mp3"}", musicState: "playing", musicSource: "${this.musicSource}"`);

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
      console.warn("[MusicManager] XMPlayer not available, falling back to MP3");
      // Fallback to MP3 if tracker unavailable
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
        // Apply music volume group
        const gain = this.volumeGroups.music;
        for (let i = 0; i < left.length; i++) {
          left[i] *= gain;
          right[i] *= gain;
        }
      });

      console.log(`[MusicManager] Playing tracker: ${asset.title}`);
    } catch (error) {
      console.error("[MusicManager] Error playing tracker:", error);
    }
  }

  private async playMp3(asset: MusicAsset) {
    try {
      this.currentMp3Audio = new Audio(asset.path);
      this.currentMp3Audio.volume = this.volumeGroups.music;
      this.currentMp3Audio.addEventListener("ended", () => this.handleTrackEnd());
      
      const ctx = this.getAudioContext();
      await ctx.resume();
      
      await this.currentMp3Audio.play();
      console.log(`[MusicManager] Playing MP3: ${asset.title}`);
    } catch (error) {
      console.error("[MusicManager] Error playing MP3:", error);
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
    console.log("[MusicManager Debug] musicState: \"paused\"");
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
    console.log("[MusicManager Debug] musicState: \"playing\"");
  }

  stop() {
    this.stopCurrent();
    this.musicState = "stopped";
    console.log("[MusicManager Debug] musicState: \"stopped\"");
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
    console.log(`[MusicManager Debug] musicRepeat: "${this.repeatMode}" - Next track: ${playlist[this.currentAssetIndex].title}`);
    if (this.musicState === "playing") {
      this.play();
    }
  }

  previous() {
    const playlist = this.getCurrentPlaylist();
    this.currentAssetIndex = (this.currentAssetIndex - 1 + playlist.length) % playlist.length;
    console.log(`[MusicManager Debug] musicRepeat: "${this.repeatMode}" - Previous track: ${playlist[this.currentAssetIndex].title}`);
    if (this.musicState === "playing") {
      this.play();
    }
  }

  private handleTrackEnd() {
    console.log(`[MusicManager] Track ended, repeatMode: ${this.repeatMode}`);
    
    if (this.repeatMode === "repeatTrack") {
      this.play(); // Replay current track
    } else if (this.repeatMode === "repeatList") {
      this.next(); // Move to next track
    } else {
      this.stop(); // Stop playback
    }
  }

  async crossfade(targetKey: string, durationMs: number = 1000) {
    // Simple crossfade: fade out current, then play next
    const steps = 20;
    const stepDelay = durationMs / steps;
    const startVolume = this.volumeGroups.music;

    for (let i = 0; i < steps; i++) {
      const newVolume = startVolume * (1 - i / steps);
      this.setGroupGain("music", newVolume);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }

    await this.play(targetKey);

    for (let i = 0; i < steps; i++) {
      const newVolume = startVolume * (i / steps);
      this.setGroupGain("music", newVolume);
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  // Volume group management

  setGroupGain(group: VolumeGroup, gain: number) {
    // Clamp to prevent clipping
    this.volumeGroups[group] = Math.max(0, Math.min(1, gain));
    
    // Apply to current playback if music group
    if (group === "music") {
      if (this.currentMp3Audio) {
        this.currentMp3Audio.volume = this.volumeGroups.music;
      }
      // XMPlayer volume is applied in the play callback
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
      this.currentAssetIndex = 0; // Reset to first track of new source
      this.savePreferences();
      
      // Restart playback if currently playing
      if (this.musicState === "playing") {
        this.play();
      }
      
      console.log(`[MusicManager Debug] musicSource: "${source}"`);
    }
  }

  getRepeatMode(): RepeatMode {
    return this.repeatMode;
  }

  setRepeatMode(mode: RepeatMode) {
    this.repeatMode = mode;
    this.savePreferences();
    console.log(`[MusicManager Debug] musicRepeat: "${mode}"`);
  }

  getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    this.savePreferences();
    
    if (!enabled && this.musicState === "playing") {
      this.stop();
    }
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
}

export const musicManager = new MusicManager();
