// ──────────────────────────────────────────────────────────────────────────────
// TutorialProvider — Context + orchestration logic
//
// How it works:
//  1. On mount, checks localStorage. If tutorial was already completed → noop.
//  2. Waits for the Village scene to load (currentScene === "Village").
//  3. Steps 1-2: spotlight DOM elements; player clicks them.
//  4. Step 3: player taps any tile → Phaser fires TUTORIAL_BUILDING_PLACED event.
//  5. Step 4: auto-completes the building instantly, then auto-advances.
//  6. Step 5: spotlights the production bubble once it appears in DOM.
//  7. Step 6: dismiss.
// ──────────────────────────────────────────────────────────────────────────────

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEY,
  type TutorialStep,
} from "./tutorialSteps";
import { useGameState } from "@/stores/gameStore";
import { useUIStore } from "@/stores/uiStore";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { useLoadingContext } from "@/context/LoadingContext";
import { supabase } from "@/lib/supabase";

// ── Context type ──────────────────────────────────────────────────────────────
export interface TutorialContextValue {
  isActive: boolean;
  currentStep: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  advance: () => void;
  skip: () => void;
  /** ID of the DOM element the tutorial system is currently watching for */
  activeTargetId: string | null;
  /** Tells overlay: the player has finished placing a building (step 3→4) */
  tutorialBuildingId: string | null;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────
interface TutorialProviderProps {
  children: ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { currentScene } = useGameState();
  const { openBuildPanel, closeBuildPanel, buildPanelOpen } = useUIStore();
  const { player } = useAuth();
  const { state: loadingState } = useLoadingContext();

  const [stepIndex, setStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [tutorialBuildingId, setTutorialBuildingId] = useState<string | null>(
    null,
  );
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Check if already completed (localStorage + Supabase) + load persisted building context ──────────
  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    const supabaseDone = player?.tutorialComplete === true;
    
    // If Supabase says done but localStorage doesn't, sync localStorage
    if (supabaseDone && !done) {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    }
    
    if (!done && !supabaseDone) {
      const bId = localStorage.getItem("kingdom-tutorial-building-id");
      if (bId) setTutorialBuildingId(bId);
    }
  }, [player]);

  // ── Activate when Village scene loads (first time only) ───────────────────
  useEffect(() => {
    if (currentScene !== "Village") return;
    if (!loadingState.isFullyReady) return;
    
    const done = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (done) return;
    
    const supabaseDone = player?.tutorialComplete === true;
    if (supabaseDone) return;

    localStorage.setItem("kingdom-tutorial-active", "true");
    setIsActive(true);
  }, [currentScene, loadingState.isFullyReady, player?.tutorialComplete]);

  const currentStep = isActive ? (TUTORIAL_STEPS[stepIndex] ?? null) : null;

  // ── Advance to next step ──────────────────────────────────────────────────
  const advance = useCallback(() => {
    setStepIndex((prev) => {
      const next = prev + 1;
      if (next > TUTORIAL_STEPS.length) {
        return prev;
      }
      return next;
    });
  }, []);

  // Watch for step reaching the end
  useEffect(() => {
    if (!isActive) return;
    if (stepIndex >= TUTORIAL_STEPS.length) {
      setIsActive(false);
      localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
      localStorage.removeItem("kingdom-tutorial-active");

      // Update Supabase to mark tutorial as complete
      if (player?.id) {
        supabase
          .from("players")
          .update({ tutorial_complete: true })
          .eq("id", player.id)
          .then(({ error }) => {
            if (error) {
              console.error("[TutorialProvider] Failed to update tutorial_complete in Supabase:", error);
            } else {
              console.log("[TutorialProvider] Updated tutorial_complete to true in Supabase");
            }
          });
      }
    }
  }, [isActive, stepIndex, player]);

  // ── Skip tutorial ─────────────────────────────────────────────────────────
  const skip = useCallback(() => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    closeBuildPanel();
    setIsActive(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
    localStorage.removeItem("kingdom-tutorial-active"); // FIXED: Clear the tutorial active flag
  }, [closeBuildPanel]);

  // ── Step-specific side-effects ────────────────────────────────────────────
  useEffect(() => {
    if (!isActive || !currentStep) return;

    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    // Step 0 — "Welcome": open build panel when build button is clicked (if not already)
    // The button's onClick will open it - we just need to detect the click for tutorial advance
    if (currentStep.id === "welcome") {
      console.log("[TutorialProvider] Step 0 - Welcome: Click handler set up");
      // We don't need a separate handler - the global click handler will catch it
      // and advance the tutorial
    }

    // Step 1 — "Select Farm": open BuildPanel automatically so farm card is visible
    if (currentStep.id === "select-farm") {
      if (!buildPanelOpen) {
        openBuildPanel(16, 16);
      }
      // FIXED: Start the step 2 timer only when build panel is open (user can select a building)
      // This prevents auto-advancing if user can't select a building
    }

    // Step 2 — "Drag to Position": DO NOT auto-advance - wait for building placed event
    // FIXED: Removed auto-advance timer - user must actually place a building
    if (currentStep.id === "drag-building") {
      console.log("[TutorialProvider] Step 2 - Waiting for user to place building (no auto-advance)");
      // User must click the checkmark to confirm placement, which fires tutorial:building-placed
    }

    // Step 5 — "Under Construction": auto-complete the building then advance
    if (currentStep.id === "construction-timer") {
      autoTimerRef.current = setTimeout(() => {
        if (tutorialBuildingId) {
          window.dispatchEvent(
            new CustomEvent("tutorial:force-complete", {
              detail: { buildingId: tutorialBuildingId },
            }),
          );
        }
        autoTimerRef.current = setTimeout(() => advance(), 1200);
      }, 2000);
    }

    // Step 6 — "Collect": Auto-fill production instantly
    if (currentStep.id === "collect-resources") {
      useGameState
        .getState()
        .fillProductionInstantly(tutorialBuildingId ?? undefined);
    }

    const handleGlobalClick = (e: MouseEvent) => {
      if (currentStep.action !== "click" || !currentStep.targetId) return;

      // ISSUE 2 FIX: Prevent advancement if loading screen is still visible
      const loadingOverlay = document.querySelector('[class*="LoadingScreen"]') ||
                             document.querySelector('[class*="loading"]');
      const isStillLoading = loadingOverlay && !loadingOverlay.classList.contains('fadeOut') &&
                             !loadingOverlay.classList.contains('hidden');
      if (isStillLoading) {
        console.log("[TutorialProvider] Ignoring click - loading screen still visible");
        return;
      }

      const targetEl = document.querySelector(
        `[data-tutorial="${currentStep.targetId}"]`,
      );
      if (!targetEl) {
        console.log("[TutorialProvider] Target element not found:", currentStep.targetId);
        return;
      }

      const clickedElement = e.target as HTMLElement;

      // ISSUE 2 FIX: Use contains() to check if click is within the target element
      // This handles clicks on child elements (icons, text, etc.) within the target
      const isWithinTarget = targetEl.contains(clickedElement);

      if (!isWithinTarget) {
        console.log("[TutorialProvider] Click outside target, ignoring");
        return;
      }

      // ISSUE 2 FIX: Additional debounce to prevent rapid-fire advances
      if (autoTimerRef.current) {
        console.log("[TutorialProvider] Debouncing rapid click");
        return;
      }

      console.log("[TutorialProvider] Click matched target, advancing...");
      autoTimerRef.current = setTimeout(() => {
        autoTimerRef.current = null;
        advance();
      }, 100);
    };

    if (currentStep.action === "click" && currentStep.targetId) {
      window.addEventListener("click", handleGlobalClick, { capture: true });
    }

    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      window.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, [isActive, currentStep?.id]);

  // ── Listen for Phaser events ──────────────────────────────────────────────

  // Place-building step: advance when building is placed
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ buildingId: string }>).detail;
      const bId = detail?.buildingId ?? null;

      console.log("[TutorialProvider] Building placed event received:", bId);

      setTutorialBuildingId(bId);
      if (bId) {
        localStorage.setItem("kingdom-tutorial-building-id", bId);
      }

      setStepIndex((prev) => {
        const step = TUTORIAL_STEPS[prev];
        console.log("[TutorialProvider] Current step index:", prev, "Step ID:", step?.id);
        if (step?.id === "drag-building" || step?.id === "place-building") {
          console.log("[TutorialProvider] Advancing from step", prev, "to", prev + 1);
          return prev + 1;
        }
        console.log("[TutorialProvider] Not advancing - wrong step");
        return prev;
      });
    };
    window.addEventListener("tutorial:building-placed", handler);
    console.log("[TutorialProvider] Registered tutorial:building-placed listener");
    return () => {
      console.log("[TutorialProvider] Removed tutorial:building-placed listener");
      window.removeEventListener("tutorial:building-placed", handler);
    };
  }, [isActive]);

  // Collect-resources step: advance when resource is collected
  useEffect(() => {
    if (!isActive) return;
    const handler = () => {
      setStepIndex((prev) => {
        const step = TUTORIAL_STEPS[prev];
        if (step?.id === "collect-resources") return prev + 1;
        return prev;
      });
    };
    window.addEventListener("tutorial:resource-collected", handler);
    return () =>
      window.removeEventListener("tutorial:resource-collected", handler);
  }, [isActive]);

  const value: TutorialContextValue = {
    isActive,
    currentStep,
    stepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    advance,
    skip,
    activeTargetId: currentStep?.targetId ?? null,
    tutorialBuildingId,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}
