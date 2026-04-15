import React from "react";
import styles from "./BottomBar.module.css";
import { useUIStore } from "@/stores/uiStore";
import { useTutorial } from "@/components/game/tutorial/TutorialProvider";
import { GAME_EVENT_CALL_WAVE } from "@/game/events";

const BottomBar: React.FC = () => {
  const { openBuildPanel } = useUIStore();
  const { isActive, advance, currentStep } = useTutorial();

  const handleAttack = () => {
    window.dispatchEvent(new CustomEvent(GAME_EVENT_CALL_WAVE));
  };

  const handleBuild = (e?: React.MouseEvent) => {
    console.log("[BottomBar] Build button clicked", e);
    if (e) {
      e.stopPropagation();
    }
    openBuildPanel(9, 9);

    // If tutorial is active and we're on step 0, advance to next step
    if (isActive && currentStep?.id === "welcome") {
      console.log("[BottomBar] Advancing tutorial from step 0");
      advance();
    }
  };

  return (
    <div
      className={styles.bottomBar}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={styles.leftGroup}>
        <button
          className={styles.buildButton}
          onClick={handleBuild}
          data-tutorial="build-button"
        >
          <div className={styles.buttonContent}>
            <span className="material-symbols-outlined">construction</span>
            <span className={styles.buttonText}>BUILD</span>
          </div>
        </button>
      </div>

      {/* Center: Day Progress (Removed) */}
      <div className={styles.centerGroup}></div>

      {/* Right Group: Attack/Wave */}
      <div className={styles.rightGroup}>
        <button
          className={styles.attackButton}
          onClick={handleAttack}
          disabled={true}
          style={{ opacity: 0.5, cursor: "not-allowed" }}
          title="Coming Soon"
        >
          <div className={styles.buttonContent}>
            <span className="material-symbols-outlined">swords</span>
            <span className={styles.buttonText}>ATTACK</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default BottomBar;
