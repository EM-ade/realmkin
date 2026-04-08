// ──────────────────────────────────────────────────────────────────────────────
// useSoundManager — React hook for sound system access
// ──────────────────────────────────────────────────────────────────────────────
import { useCallback, useState, useEffect } from 'react';
import { soundManager, type PlayOptions } from './SoundManager';

interface UseSoundManagerReturn {
  play: (soundId: string, options?: PlayOptions) => void;
  stop: (soundId: string) => void;
  playMusic: (trackId: string, fadeInMs?: number) => void;
  stopMusic: (fadeOutMs?: number) => void;
  playAmbient: (ambientId: string, fadeInMs?: number) => void;
  stopAmbient: (fadeOutMs?: number) => void;
  isMuted: boolean;
  toggleMute: () => boolean;
  muteAll: () => void;
  unmuteAll: () => void;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
  setMusicVolume: (vol: number) => void;
  setSfxVolume: (vol: number) => void;
  setUiVolume: (vol: number) => void;
  isAudioUnlocked: boolean;
  unlockAudio: () => void;
}

// Cache settings to avoid re-render on every call
let cachedSettings = soundManager.getSettings();
let cachedUnlocked = soundManager.isAudioUnlocked;

export function useSoundManager(): UseSoundManagerReturn {
  const [isMuted, setIsMuted] = useState(cachedSettings.masterMuted);
  const [musicVolume, setMusicVol] = useState(cachedSettings.musicVolume);
  const [sfxVolume, setSfxVol] = useState(cachedSettings.sfxVolume);
  const [uiVolume, setUiVol] = useState(cachedSettings.uiVolume);
  const [isAudioUnlocked, setIsUnlocked] = useState(cachedUnlocked);

  // Poll settings periodically (lightweight — no Howler calls)
  useEffect(() => {
    const interval = setInterval(() => {
      const settings = soundManager.getSettings();
      const unlocked = soundManager.isAudioUnlocked;
      setIsMuted(settings.masterMuted);
      setMusicVol(settings.musicVolume);
      setSfxVol(settings.sfxVolume);
      setUiVol(settings.uiVolume);
      setIsUnlocked(unlocked);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const play = useCallback((soundId: string, options?: PlayOptions) => {
    soundManager.play(soundId, options);
  }, []);

  const stop = useCallback((soundId: string) => {
    soundManager.stop(soundId);
  }, []);

  const playMusic = useCallback((trackId: string, fadeInMs?: number) => {
    soundManager.playMusic(trackId, fadeInMs);
  }, []);

  const stopMusic = useCallback((fadeOutMs?: number) => {
    soundManager.stopMusic(fadeOutMs);
  }, []);

  const playAmbient = useCallback((ambientId: string, fadeInMs?: number) => {
    soundManager.playAmbient(ambientId, fadeInMs);
  }, []);

  const stopAmbient = useCallback((fadeOutMs?: number) => {
    soundManager.stopAmbient(fadeOutMs);
  }, []);

  const toggleMute = useCallback(() => {
    const newState = soundManager.toggleMute();
    setIsMuted(newState);
    return newState;
  }, []);

  const muteAll = useCallback(() => {
    soundManager.muteAll();
    setIsMuted(true);
  }, []);

  const unmuteAll = useCallback(() => {
    soundManager.unmuteAll();
    setIsMuted(false);
  }, []);

  const setMusicVolume = useCallback((vol: number) => {
    soundManager.setMusicVolume(vol);
    setMusicVol(vol);
  }, []);

  const setSfxVolume = useCallback((vol: number) => {
    soundManager.setSfxVolume(vol);
    setSfxVol(vol);
  }, []);

  const setUiVolume = useCallback((vol: number) => {
    soundManager.setUiVolume(vol);
    setUiVol(vol);
  }, []);

  const unlockAudio = useCallback(() => {
    soundManager.unlockAudio();
    setIsUnlocked(true);
  }, []);

  return {
    play,
    stop,
    playMusic,
    stopMusic,
    playAmbient,
    stopAmbient,
    isMuted,
    toggleMute,
    muteAll,
    unmuteAll,
    musicVolume,
    sfxVolume,
    uiVolume,
    setMusicVolume,
    setSfxVolume,
    setUiVolume,
    isAudioUnlocked,
    unlockAudio,
  };
}
