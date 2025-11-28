# Audio System

Complete documentation of the sound and music management system in Vibing Arkanoid.

---

## Overview

The game features a comprehensive audio system with background music, sound effects, and volume controls. Audio is managed through a centralized sound manager utility.

**Primary Audio File**: `src/utils/sounds.ts`

---

## Sound Manager Architecture

### Audio Technologies Used

1. **HTMLAudioElement**: For music playback (MP3 files)
2. **Web Audio API**: For sound effects (future enhancement)
3. **Preloading**: All audio files loaded on game start

### Sound Manager Structure

```typescript
// Sound effect registry
const sounds: { [key: string]: HTMLAudioElement } = {};

// Music track registry
const musicTracks: { [key: string]: HTMLAudioElement } = {};

// Current music state
let currentMusic: HTMLAudioElement | null = null;
let musicVolume: number = 0.5;  // 0.0 - 1.0
let sfxVolume: number = 0.7;    // 0.0 - 1.0
```

---

## Music System

### Music Tracks

**Location**: `public/` directory

#### Background Music (15 Tracks)

| Track Name | File | Usage |
|------------|------|-------|
| Pixel Frenzy | `Pixel_Frenzy.mp3` | Levels 1-4 |
| Pixel Frenzy 2 | `Pixel_Frenzy-2.mp3` | Levels 6-9 |
| Turrican | `Turrican.mp3` | Levels 11-14 |
| Flubber Happy | `Flubber_Happy_Moderate_Amiga.mp3` | Levels 16-19 |
| Level 3 | `level_3.mp3` | Levels 21-24 |
| Level 4 | `level_4.mp3` | Levels 26-29 |
| Level 5 | `level_5.mp3` | Levels 31-34 |
| Level 7 | `level_7.mp3` | Levels 36-39 |
| Cave C64 | `level_cave_c64.mp3` | Levels 41-44 |
| Cave C64 2 | `level_cave_2_c64.mp3` | Levels 46-49 |
| Desert Atari | `level_dessert_chip_atari_2.mp3` | Alternative track |
| Desert Atari 2 | `level_dessert_chip_atari_2_2.mp3` | Alternative track |
| Cave Atari | `level_cave_chip_atari.mp3` | Alternative track |
| Cave Atari 2 | `level_cave_chip_atari_2.mp3` | Alternative track |
| Sound 2 | `sound_2.mp3` | Alternative track |

#### Boss Music (3 Tracks)

| Boss Type | File | Levels |
|-----------|------|--------|
| Cube | `Boss_level_cube.mp3` | 5, 15, 25, 35, 45 |
| Sphere | `Boss_level_sphere.mp3` | 10, 20, 30, 40, 50 |
| Pyramid | `Boss_level_pyramid.mp3` | 15, 25, 35, 45 (resurrection) |

**Additional Boss Track**:
- `leve_boss_chip_atari.mp3` (alternative boss music)
- `siren-alarm-boss.ogg` (boss warning siren)

#### Special Music

- **High Score Music**: `High_score.mp3` - Plays on high score entry screen

### Music Playback Functions

#### Play Music

```typescript
export const playMusic = (trackName: string, loop: boolean = true, volume?: number) => {
  // Stop current music
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
  }
  
  // Get track from registry
  const track = musicTracks[trackName];
  if (!track) {
    console.warn(`Music track "${trackName}" not found`);
    return;
  }
  
  // Configure and play
  currentMusic = track;
  track.loop = loop;
  track.volume = volume ?? musicVolume;
  
  track.play().catch(err => {
    console.error('Music playback failed:', err);
    // Mobile devices require user interaction before audio
    document.addEventListener('click', () => {
      track.play();
    }, { once: true });
  });
};
```

#### Stop Music

```typescript
export const stopMusic = () => {
  if (currentMusic) {
    currentMusic.pause();
    currentMusic.currentTime = 0;
    currentMusic = null;
  }
};
```

#### Pause/Resume Music

```typescript
export const pauseMusic = () => {
  if (currentMusic && !currentMusic.paused) {
    currentMusic.pause();
  }
};

export const resumeMusic = () => {
  if (currentMusic && currentMusic.paused) {
    currentMusic.play().catch(err => {
      console.error('Resume music failed:', err);
    });
  }
};
```

#### Volume Control

```typescript
export const setMusicVolume = (volume: number) => {
  musicVolume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
  if (currentMusic) {
    currentMusic.volume = musicVolume;
  }
};

export const getMusicVolume = (): number => musicVolume;
```

#### Track Navigation

```typescript
const trackList = Object.keys(musicTracks);
let currentTrackIndex = 0;

export const nextTrack = () => {
  currentTrackIndex = (currentTrackIndex + 1) % trackList.length;
  playMusic(trackList[currentTrackIndex]);
};

export const previousTrack = () => {
  currentTrackIndex = (currentTrackIndex - 1 + trackList.length) % trackList.length;
  playMusic(trackList[currentTrackIndex]);
};

export const getCurrentTrackName = (): string => {
  return trackList[currentTrackIndex] || 'None';
};
```

### Music Assignment Logic

**File**: `src/components/Game.tsx`

Music changes every 5 levels:

```typescript
const selectLevelMusic = (level: number): string => {
  // Boss levels
  if (level % 5 === 0) {
    const bossType = getBossType(level);
    if (bossType === 'cube') return 'Boss_level_cube';
    if (bossType === 'sphere') return 'Boss_level_sphere';
    if (bossType === 'pyramid') return 'Boss_level_pyramid';
  }
  
  // Regular levels (cycle every 5)
  const musicIndex = Math.floor((level - 1) / 5) % musicTrackList.length;
  return musicTrackList[musicIndex];
};

// Start level music
useEffect(() => {
  if (gameState === 'playing') {
    const trackName = selectLevelMusic(currentLevel);
    playMusic(trackName, true);
  }
}, [currentLevel, gameState]);
```

---

## Sound Effects

### Sound Effect Files

**Location**: `public/` directory

| Sound | File | Usage |
|-------|------|-------|
| Extra Life | `extra_life.mp3` | Extra life power-up collected |
| Multiball | `multiball.mp3` | Multiball power-up |
| Turrets | `turrets.mp3` | Turret power-up activated |
| Shield | `shield.mp3` | Shield power-up activated |
| Fireball | `fireball.mp3` | Fireball power-up activated |
| Wider Paddle | `wider.mp3` | Paddle extend power-up |
| Shrink Paddle | `shrink.mp3` | Paddle shrink power-up |
| Slower Ball | `slower.mp3` | Slowdown power-up |
| Smaller Paddle | `smaller.mp3` | Alternative shrink sound |
| Glass Breaking | `glass-breaking.ogg` | Brick destruction, explosions |

### Sound Playback

```typescript
export const playSound = (soundName: string, volumeOverride?: number) => {
  const sound = sounds[soundName];
  if (!sound) {
    console.warn(`Sound "${soundName}" not found`);
    return;
  }
  
  // Clone for overlapping sounds
  const soundClone = sound.cloneNode() as HTMLAudioElement;
  soundClone.volume = volumeOverride ?? sfxVolume;
  
  soundClone.play().catch(err => {
    console.error(`Failed to play sound "${soundName}":`, err);
  });
};
```

### Sound Effect Volume

```typescript
export const setSFXVolume = (volume: number) => {
  sfxVolume = Math.max(0, Math.min(1, volume)); // Clamp 0-1
};

export const getSFXVolume = (): number => sfxVolume;
```

### Sound Categories

#### Brick Sounds
- **Normal Brick Hit**: `playSound('glass-breaking', 0.3)`
- **Metal Brick Hit**: `playSound('glass-breaking', 0.5)` (different pitch)
- **Explosive Brick**: `playSound('glass-breaking', 0.8)`

#### Power-up Sounds
```typescript
const POWERUP_SOUNDS: { [key in PowerUpType]: string } = {
  multiball: 'multiball',
  turrets: 'turrets',
  fireball: 'fireball',
  life: 'extra_life',
  slowdown: 'slower',
  paddleExtend: 'wider',
  paddleShrink: 'shrink',
  shield: 'shield'
};

// Play power-up sound
playSound(POWERUP_SOUNDS[powerUp.type]);
```

#### Boss Sounds
- **Boss Hit**: `playSound('glass-breaking', 0.6)`
- **Boss Attack**: `playSound('fireball', 0.4)`
- **Boss Defeat**: `playSound('glass-breaking', 1.0)` + background flash

---

## Audio Preloading

### Initialization

All audio files are preloaded when the game starts:

```typescript
export const initAudio = () => {
  // Preload sound effects
  const soundFiles = {
    'extra_life': '/extra_life.mp3',
    'multiball': '/multiball.mp3',
    'turrets': '/turrets.mp3',
    'shield': '/shield.mp3',
    'fireball': '/fireball.mp3',
    'wider': '/wider.mp3',
    'shrink': '/shrink.mp3',
    'slower': '/slower.mp3',
    'glass-breaking': '/glass-breaking.ogg'
  };
  
  Object.entries(soundFiles).forEach(([name, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    sounds[name] = audio;
  });
  
  // Preload music tracks
  const musicFiles = {
    'Pixel_Frenzy': '/Pixel_Frenzy.mp3',
    'Boss_level_cube': '/Boss_level_cube.mp3',
    'High_score': '/High_score.mp3',
    // ... all music tracks
  };
  
  Object.entries(musicFiles).forEach(([name, path]) => {
    const audio = new Audio(path);
    audio.preload = 'auto';
    musicTracks[name] = audio;
  });
};

// Called in src/main.tsx
initAudio();
```

---

## Music Settings UI

**File**: `src/components/MusicSettings.tsx`

### Controls

1. **Music Toggle**: Enable/disable background music
2. **Music Volume Slider**: 0-100%
3. **SFX Volume Slider**: 0-100%
4. **Track Navigation**: Previous/Next buttons
5. **Current Track Display**: Shows currently playing track name
6. **Repeat Mode**: Loop current track or play once

### Implementation

```typescript
const MusicSettings = () => {
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVol, setMusicVol] = useState(50);
  const [sfxVol, setSfxVol] = useState(70);
  const [currentTrack, setCurrentTrack] = useState('');
  
  const handleMusicToggle = () => {
    if (musicEnabled) {
      pauseMusic();
    } else {
      resumeMusic();
    }
    setMusicEnabled(!musicEnabled);
  };
  
  const handleMusicVolumeChange = (value: number) => {
    setMusicVol(value);
    setMusicVolume(value / 100);
  };
  
  const handleSFXVolumeChange = (value: number) => {
    setSfxVol(value);
    setSFXVolume(value / 100);
  };
  
  const handleNextTrack = () => {
    nextTrack();
    setCurrentTrack(getCurrentTrackName());
  };
  
  const handlePreviousTrack = () => {
    previousTrack();
    setCurrentTrack(getCurrentTrackName());
  };
  
  return (
    <div className="music-settings">
      <label>
        <input type="checkbox" checked={musicEnabled} onChange={handleMusicToggle} />
        Enable Music
      </label>
      
      <label>
        Music Volume: {musicVol}%
        <input type="range" min="0" max="100" value={musicVol} onChange={e => handleMusicVolumeChange(Number(e.target.value))} />
      </label>
      
      <label>
        SFX Volume: {sfxVol}%
        <input type="range" min="0" max="100" value={sfxVol} onChange={e => handleSFXVolumeChange(Number(e.target.value))} />
      </label>
      
      <div className="track-controls">
        <button onClick={handlePreviousTrack}>Previous</button>
        <span>Now Playing: {currentTrack}</span>
        <button onClick={handleNextTrack}>Next</button>
      </div>
    </div>
  );
};
```

---

## Mobile Audio Considerations

### Auto-Play Restrictions

Mobile browsers (especially iOS Safari) block audio playback until user interaction:

```typescript
// Workaround: Play on first user gesture
const enableAudioOnInteraction = () => {
  document.addEventListener('touchstart', () => {
    // Play silent audio to unlock
    const silentAudio = new Audio();
    silentAudio.play().then(() => {
      // Audio unlocked
      console.log('Audio enabled on mobile');
    }).catch(err => {
      console.warn('Audio unlock failed:', err);
    });
  }, { once: true });
};

// Called on mobile detection
if (isMobile()) {
  enableAudioOnInteraction();
}
```

### Pause on Background

```typescript
// Pause music when app goes to background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pauseMusic();
  } else {
    if (gameState === 'playing') {
      resumeMusic();
    }
  }
});
```

---

## Audio Synchronization

### Music Changes During Gameplay

Music changes are synchronized with level transitions:

```typescript
const nextLevel = () => {
  // Stop current music
  stopMusic();
  
  // Clear all entities
  clearEntities();
  
  // Increment level
  setCurrentLevel(prev => prev + 1);
  
  // Start new level (music starts in useEffect)
};
```

### High Score Music

Special music plays when entering high score initials:

```typescript
// In HighScoreEntry component
useEffect(() => {
  stopMusic(); // Stop level music
  playMusic('High_score', false); // Play once, no loop
  
  return () => {
    stopMusic(); // Clean up on unmount
  };
}, []);
```

---

## Performance Optimizations

### Audio Object Pooling

```typescript
// Reuse audio objects for frequent sounds
const brickHitSoundPool: HTMLAudioElement[] = [];
const POOL_SIZE = 5;

const initSoundPool = () => {
  for (let i = 0; i < POOL_SIZE; i++) {
    const sound = new Audio('/glass-breaking.ogg');
    sound.preload = 'auto';
    brickHitSoundPool.push(sound);
  }
};

let poolIndex = 0;
const playPooledSound = () => {
  const sound = brickHitSoundPool[poolIndex];
  sound.currentTime = 0; // Reset to start
  sound.volume = sfxVolume;
  sound.play();
  
  poolIndex = (poolIndex + 1) % POOL_SIZE;
};
```

### Sound Limiting

Prevent audio overload during intense gameplay:

```typescript
let lastBrickSoundTime = 0;
const SOUND_COOLDOWN = 50; // milliseconds

const playBrickSound = () => {
  const now = Date.now();
  if (now - lastBrickSoundTime < SOUND_COOLDOWN) {
    return; // Skip to avoid audio spam
  }
  
  playSound('glass-breaking', 0.3);
  lastBrickSoundTime = now;
};
```

---

## Debug Features

### Audio Debug Logging

```typescript
if (debugSettings.enableAudioLogging) {
  console.log(`[Audio] Playing music: ${trackName}`);
  console.log(`[Audio] Music volume: ${musicVolume}`);
  console.log(`[Audio] SFX volume: ${sfxVolume}`);
}
```

### Audio Context State

```typescript
export const getAudioDebugInfo = () => {
  return {
    currentMusic: currentMusic?.src || 'None',
    musicVolume,
    sfxVolume,
    musicPaused: currentMusic?.paused ?? true,
    loadedSounds: Object.keys(sounds).length,
    loadedTracks: Object.keys(musicTracks).length
  };
};
```

---

## Future Enhancements

### Planned Features

1. **Web Audio API Integration**:
   - Real-time audio effects (reverb, distortion)
   - Dynamic pitch shifting
   - 3D spatial audio for positional sounds

2. **Music Sequencing**:
   - Crossfade between tracks
   - Beat-synchronized gameplay events
   - Dynamic music layers (intensity-based)

3. **User Preferences**:
   - Persistent volume settings (localStorage)
   - Custom playlist creation
   - Per-sound volume controls

4. **Audio Visualization**:
   - Frequency spectrum analyzer
   - Waveform display
   - Beat detection for visual effects

---

## Related Files

- `src/utils/sounds.ts` - Sound manager
- `src/components/MusicSettings.tsx` - UI controls
- `src/components/Game.tsx` - Audio playback triggers
- `public/` - All audio files

---

**Last Updated**: 2025-01-18  
**Version**: 0.8.0+
