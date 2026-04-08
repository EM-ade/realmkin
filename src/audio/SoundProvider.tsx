// ──────────────────────────────────────────────────────────────────────────────
// SoundProvider — Wraps the game, handles iOS unlock + phased preloading
// ──────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, type ReactNode } from 'react';
import { soundManager } from './SoundManager';
import { PHASE1_CRITICAL, PHASE2_HIGH } from './soundConfig';

interface SoundProviderProps {
  children: ReactNode;
  /** Whether the game canvas is ready (triggers Phase 2 preload) */
  isGameReady?: boolean;
  /** Whether to start ambient + music when game loads */
  autoStartAudio?: boolean;
}

export function SoundProvider({
  children,
  isGameReady = false,
  autoStartAudio = true,
}: SoundProviderProps) {
  const hasUnlocked = useRef(false);
  const hasStartedAmbient = useRef(false);

  // Initialize SoundManager on mount
  useEffect(() => {
    soundManager.initialize();
  }, []);

  // iOS audio unlock — listen for first user gesture
  useEffect(() => {
    const unlock = () => {
      if (hasUnlocked.current) return;
      hasUnlocked.current = true;
      soundManager.unlockAudio();
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  // Phase 1: Preload critical sounds immediately
  useEffect(() => {
    soundManager.preloadBatch(PHASE1_CRITICAL);
  }, []);

  // Phase 2: Preload HIGH sounds when game canvas is ready
  useEffect(() => {
    if (isGameReady) {
      soundManager.preloadBatch(PHASE2_HIGH);
    }
  }, [isGameReady]);

  // Start ambient + music after game is ready and user has interacted
  useEffect(() => {
    if (!isGameReady || !autoStartAudio || hasStartedAmbient.current) return;

    const tryStart = () => {
      if (!soundManager.isAudioUnlocked) return;
      hasStartedAmbient.current = true;
      soundManager.playAmbient('ambient_village', 2000);
      soundManager.playMusic('music_main_theme', 2000);
    };

    // Try immediately (if already unlocked)
    tryStart();

    // Also try on next user gesture (if not yet unlocked)
    const unlockAndStart = () => {
      soundManager.unlockAudio();
      tryStart();
    };
    window.addEventListener('pointerdown', unlockAndStart, { once: true });
    window.addEventListener('keydown', unlockAndStart, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAndStart);
      window.removeEventListener('keydown', unlockAndStart);
    };
  }, [isGameReady, autoStartAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      soundManager.destroy();
    };
  }, []);

  return <>{children}</>;
}
