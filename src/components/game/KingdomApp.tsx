"use client";

/**
 * KingdomApp — The root game component that initializes Phaser + all game UI.
 * Adapted from kingdom/src/App.tsx for Next.js / Realmkin environment.
 *
 * Replaces the old App.tsx which was the root of the Vite SPA.
 * Now mounted inside the /game/kingdom route via dynamic import.
 */

import { useEffect, useRef, useState } from "react";
import { Game } from "@/game/Game";
import TopBar from "@/components/game/TopBar/TopBar";
import BottomBar from "@/components/game/BottomBar";
import UpgradePanel from "@/components/game/upgrade/UpgradePanel";
import BuildPanel from "@/components/game/BuildPanel/BuildPanel";
import { GemStore } from "@/components/game/GemStore/GemStore";
import { LevelRewardsPopup } from "@/components/game/TopBar/LevelRewardsPopup";
import { ProfilePanel } from "@/components/game/Profile/ProfilePanel";
import { useLoadingContext } from "@/context/LoadingContext";
import { LoadingBoot } from "@/components/game/LoadingScreen/LoadingBoot";
import { LoadingScreen } from "@/components/game/LoadingScreen/LoadingScreen";
import { useUIStore } from "@/stores/uiStore";
import { useGameState } from "@/stores/gameStore";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { SoundProvider } from "@/audio/SoundProvider";
import { AudioSettingsPanel } from "@/audio/AudioSettingsPanel";
import { XPFloatingText } from "@/components/game/XP/XPFloatingText";
import { LevelUpScreen } from "@/components/game/XP/LevelUpScreen";
import { TutorialProvider } from "@/components/game/tutorial/TutorialProvider";
import { TutorialOverlay } from "@/components/game/tutorial/TutorialOverlay";
import { AutoPlayerCollectionToast } from "@/components/game/Notifications/AutoPlayerCollectionToast";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { useAutoPlayer } from "@/game/autoplayer/useAutoPlayer";

interface KingdomAppProps {
  onGameReady?: () => void;
}

export function KingdomApp({ onGameReady }: KingdomAppProps) {
  const gameRef = useRef<Game | null>(null);
  const [isGameReady, setIsGameReady] = useState(false);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [levelRewardsOpen, setLevelRewardsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Loading gate system — replaces old appLoading/villageReady dual-state
  const { screenVisible } = useLoadingContext();

  // Initialize AutoPlayer system
  const { lastCollection } = useAutoPlayer();

  // Listen for level rewards open event
  useEffect(() => {
    const handleOpen = () => setLevelRewardsOpen(true);
    window.addEventListener("open-level-rewards", handleOpen);
    return () => window.removeEventListener("open-level-rewards", handleOpen);
  }, []);

  // Listen for profile open event from TopBar
  useEffect(() => {
    const handleOpen = () => setProfileOpen(true);
    window.addEventListener("open-profile", handleOpen);
    return () => window.removeEventListener("open-profile", handleOpen);
  }, []);

  const {
    upgradePanelOpen,
    selectedBuildingId,
    selectedBuildingCol,
    selectedBuildingRow,
    closeUpgradePanel,
    buildPanelOpen,
    buildCol,
    buildRow,
    closeBuildPanel,
    gemStoreOpen,
    closeGemStore,
  } = useUIStore();

  const { currentScene } = useGameState();
  const { currentLevel } = useXPSystem();

  useEffect(() => {
    // Initialize Phaser game
    gameRef.current = new Game();

    // Mark game as ready after a short delay (Phaser needs time to boot)
    const timer = setTimeout(() => {
      setIsGameReady(true);
      onGameReady?.();
    }, 500);

    return () => {
      gameRef.current?.destroy(true);
      clearTimeout(timer);
    };
  }, [onGameReady]);

  // Sync UIStore audio settings toggle
  useEffect(() => {
    // Audio settings panel is controlled by local showAudioSettings state
  }, []);

  // Ensure scene transitions to Village upon login (only after game is ready)
  const { player } = useAuth();
  const { setCurrentScene } = useGameState();
  useEffect(() => {
    if (player && currentScene === "MainMenu" && isGameReady) {
      setCurrentScene("Village");
    }
  }, [player, currentScene, isGameReady, setCurrentScene]);

  return (
    <SoundProvider isGameReady={isGameReady}>
      <TutorialProvider>
        <div className="relative h-full w-full overflow-hidden bg-stone-900">
          {/* Boot the loading gate system — runs all stages sequentially */}
          <LoadingBoot />

          <div
            id="game-container"
            className="absolute inset-0 z-0 h-full w-full"
          />

          {/* UI Layer */}
          {currentScene === "Village" && (
            <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between">
              <TopBar onAudioSettings={() => setShowAudioSettings(true)} />
              <BottomBar />
            </div>
          )}

          {/* Level Rewards Popup - centered in game scene */}
          {levelRewardsOpen && (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
              <div className="pointer-events-auto">
                <LevelRewardsPopup
                  isOpen={levelRewardsOpen}
                  onClose={() => setLevelRewardsOpen(false)}
                  currentLevel={currentLevel}
                />
              </div>
            </div>
          )}

          {/* Profile Panel - slide-in from left */}
          {profileOpen && (
            <ProfilePanel
              isOpen={profileOpen}
              onClose={() => setProfileOpen(false)}
            />
          )}

          {buildPanelOpen && (
            <BuildPanel col={buildCol} row={buildRow} onClose={closeBuildPanel} />
          )}

          {upgradePanelOpen && selectedBuildingId && (
            <UpgradePanel
              buildingId={selectedBuildingId}
              col={selectedBuildingCol}
              row={selectedBuildingRow}
              onClose={closeUpgradePanel}
            />
          )}

          {gemStoreOpen && (
            <GemStore isOpen={gemStoreOpen} onClose={closeGemStore} />
          )}

          {/* Audio Settings */}
          {showAudioSettings && (
            <AudioSettingsPanel onClose={() => setShowAudioSettings(false)} />
          )}

          {/* Tutorial overlay — always on top */}
          <TutorialOverlay />

          {/* Game UI — hidden until loading is fully complete */}
          {!screenVisible && (
            <>
              <XPFloatingText />
              <LevelUpScreen />
              <AutoPlayerCollectionToast collection={lastCollection} />
            </>
          )}

          {/* Top-most Cinematic Loading Overlay — visible until ALL gates complete */}
          {screenVisible && (
            <LoadingScreen onFadeComplete={() => {}} />
          )}
        </div>
      </TutorialProvider>
    </SoundProvider>
  );
}
