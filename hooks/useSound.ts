import { useRef, useCallback, useEffect } from 'react';

export type SoundType =
  | 'spin'
  | 'symbol-land'
  | 'win-small'
  | 'win-medium'
  | 'win-big'
  | 'tumble'
  | 'scatter'
  | 'freespins'
  | 'button-click'
  | 'bg-music';

interface UseSoundOptions {
  volume?: number;
  loop?: boolean;
}

export function useSound() {
  const audioRefs = useRef<Map<SoundType, HTMLAudioElement>>(new Map());
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  // Preload all sounds
  useEffect(() => {
    const sounds: SoundType[] = [
      'spin',
      'symbol-land',
      'win-small',
      'win-medium',
      'win-big',
      'tumble',
      'scatter',
      'freespins',
      'button-click',
    ];

    sounds.forEach((sound) => {
      const audio = new Audio(`/sounds/${sound}.mp3`);
      audio.preload = 'auto';
      audio.volume = 0.5; // Default volume
      audioRefs.current.set(sound, audio);
    });

    // Preload background music separately
    const bgMusic = new Audio('/sounds/bg-music.mp3');
    bgMusic.preload = 'auto';
    bgMusic.volume = 0.2; // Lower volume for background music
    bgMusic.loop = true;
    bgMusicRef.current = bgMusic;

    return () => {
      // Cleanup: pause and remove all audio elements
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.src = '';
      }
      audioRefs.current.clear();
    };
  }, []);

  const play = useCallback((
    sound: SoundType,
    options?: UseSoundOptions
  ) => {
    const audio = audioRefs.current.get(sound);
    if (!audio) {
      console.warn(`Sound "${sound}" not found. Make sure the file exists at /public/sounds/${sound}.mp3`);
      return;
    }

    // Set options
    if (options?.volume !== undefined) {
      audio.volume = Math.max(0, Math.min(1, options.volume));
    }
    if (options?.loop !== undefined) {
      audio.loop = options.loop;
    }

    // Reset and play
    audio.currentTime = 0;
    audio.play().catch((error) => {
      // Ignore errors (e.g., user hasn't interacted with page yet)
      console.debug(`Could not play sound "${sound}":`, error.message);
    });
  }, []);

  const stop = useCallback((sound: SoundType) => {
    const audio = audioRefs.current.get(sound);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, []);

  const playBackgroundMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.play().catch((error) => {
        console.debug('Could not play background music:', error.message);
      });
    }
  }, []);

  const stopBackgroundMusic = useCallback(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
    }
  }, []);

  const setVolume = useCallback((sound: SoundType, volume: number) => {
    const audio = audioRefs.current.get(sound);
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    audioRefs.current.forEach((audio) => {
      audio.volume = normalizedVolume * 0.5; // Sound effects at 50% of master
    });
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = normalizedVolume * 0.2; // Music at 20% of master
    }
  }, []);

  return {
    play,
    stop,
    playBackgroundMusic,
    stopBackgroundMusic,
    setVolume,
    setMasterVolume,
  };
}
