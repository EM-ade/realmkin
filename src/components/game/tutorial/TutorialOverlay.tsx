// ──────────────────────────────────────────────────────────────────────────────
// TutorialOverlay — Visual layer: dark mask + spotlight + tooltip card
//
// Renders a full-screen overlay with:
//  - SVG dark mask covering everything EXCEPT the spotlit element
//  - Animated golden border around the spotlight
//  - Tooltip card positioned near the spotlight
//  - Step progress dots
//  - Skip / "Got it!" buttons
// ──────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useTutorial } from "./TutorialProvider";
import { useSoundManager } from "@/audio/useSoundManager";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { TUTORIAL_STEPS } from "./tutorialSteps";
import styles from "./TutorialOverlay.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SpotlightRect {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
}

interface TooltipPos {
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;
  transform?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DARKEN_ALPHA = 0.78; // overlay darkness
const SCREEN_PAD = 16; // keep tooltip inside viewport

// ── Helper: get element bounding rect in viewport space ──────────────────────
function getElementRect(targetId: string): DOMRect | null {
  const el = document.querySelector(`[data-tutorial="${targetId}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

// ── Helper: calculate tooltip position ───────────────────────────────────────
function calcTooltipPos(
  spotlight: SpotlightRect,
  tooltipW: number,
  tooltipH: number,
  position: string,
  vw: number,
  vh: number,
): TooltipPos {
  const GAP = 20;

  // Auto: pick whichever side has most space
  let dir = position;
  if (dir === "auto") {
    const spaceTop = spotlight.y;
    const spaceBottom = vh - (spotlight.y + spotlight.h);
    const spaceLeft = spotlight.x;
    const spaceRight = vw - (spotlight.x + spotlight.w);
    const max = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
    if (max === spaceBottom) dir = "bottom";
    else if (max === spaceTop) dir = "top";
    else if (max === spaceRight) dir = "right";
    else dir = "left";
  }

  let left = 0;
  let top = 0;

  switch (dir) {
    case "bottom":
      top = spotlight.y + spotlight.h + GAP;
      left = spotlight.x + spotlight.w / 2 - tooltipW / 2;
      break;
    case "top":
      top = spotlight.y - tooltipH - GAP;
      left = spotlight.x + spotlight.w / 2 - tooltipW / 2;
      break;
    case "right":
      top = spotlight.y + spotlight.h / 2 - tooltipH / 2;
      left = spotlight.x + spotlight.w + GAP;
      break;
    case "left":
      top = spotlight.y + spotlight.h / 2 - tooltipH / 2;
      left = spotlight.x - tooltipW - GAP;
      break;
  }

  // Clamp to viewport
  left = Math.max(SCREEN_PAD, Math.min(left, vw - tooltipW - SCREEN_PAD));
  top = Math.max(SCREEN_PAD, Math.min(top, vh - tooltipH - SCREEN_PAD));

  return { top, left };
}

// ── Component ─────────────────────────────────────────────────────────────────
export function TutorialOverlay() {
  const { isActive, currentStep, stepIndex, totalSteps, advance, skip } =
    useTutorial();
  const { play } = useSoundManager();

  const tooltipRef = useRef<HTMLDivElement>(null);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  });
  const [arrowDir, setArrowDir] = useState<string>("bottom");

  // ── Update spotlight position whenever step changes or window resizes ──────
  const updatePositions = useCallback(() => {
    if (!currentStep) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = currentStep.spotlightPadding ?? 10;

    let sl: SpotlightRect;

    if (currentStep.targetId) {
      const rect = getElementRect(currentStep.targetId);
      if (rect) {
        sl = {
          x: rect.left - pad,
          y: rect.top - pad,
          w: rect.width + pad * 2,
          h: rect.height + pad * 2,
          rx: 12,
        };
      } else {
        // Target prescribed but not found; show full-screen dim with centered tooltip
        sl = { x: vw / 2 - 60, y: vh / 2 - 60, w: 120, h: 120, rx: 60 };
      }
    } else {
      // No target — open up the whole screen clear (no dimming) so they can interact with the Phaser canvas
      sl = { x: 0, y: 0, w: vw, h: vh, rx: 0 };
    }

    setSpotlight(sl);

    // Tooltip position
    const tooltipW = tooltipRef.current?.offsetWidth ?? 280;
    const tooltipH = tooltipRef.current?.offsetHeight ?? 160;
    const dir = currentStep.tooltipPosition ?? "bottom";
    const pos = calcTooltipPos(sl, tooltipW, tooltipH, dir, vw, vh);
    setTooltipPos(pos);

    // Arrow direction (opposite of tooltip placement)
    const dirMap: Record<string, string> = {
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left",
      auto: "top",
    };
    setArrowDir(dirMap[dir] ?? "top");
  }, [currentStep]);

  useEffect(() => {
    if (!isActive) return;
    // Initial position — defer so tooltipRef dimensions are available
    updatePositions();
    const t = setTimeout(updatePositions, 80);
    window.addEventListener("resize", updatePositions);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updatePositions);
    };
  }, [isActive, updatePositions, stepIndex]);

  // Re-measure periodically in case DOM elements shift (animations, panels)
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(updatePositions, 500);
    return () => clearInterval(interval);
  }, [isActive, updatePositions]);

  if (!isActive || !currentStep) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const sl = spotlight ?? {
    x: vw / 2 - 60,
    y: vh / 2 - 60,
    w: 120,
    h: 120,
    rx: 60,
  };

  // ── Action button label ───────────────────────────────────────────────────
  const isLast = stepIndex === totalSteps - 1;
  const lockClick = currentStep.lockToTarget && currentStep.action === "click";
  const isAuto = currentStep.action === "auto";

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (currentStep.action === "dismiss") {
      e.stopPropagation();
      play("button_click");
      useXPSystem
        .getState()
        .awardXP(isLast ? "tutorial_complete" : "tutorial_step");
      advance();
    }
  };

  const handleNextClick = () => {
    if (isLast) {
      play("tutorial_complete");
      useXPSystem.getState().awardXP("tutorial_complete");
      advance();
    } else if (!lockClick && !isAuto) {
      play("tutorial_step");
      useXPSystem.getState().awardXP("tutorial_step");
      advance();
    }
  };

  // ── SVG mask path: full rect minus spotlight cutout ───────────────────────
  // The SVG uses a compound path with even-odd fill rule:
  // outer rect (whole screen) + inner rect (cutout) = spotlight effect
  const maskPath = [
    `M 0 0 H ${vw} V ${vh} H 0 Z`, // outer
    `M ${sl.x + sl.rx} ${sl.y}`, // cutout (rounded rect)
    `H ${sl.x + sl.w - sl.rx}`,
    `Q ${sl.x + sl.w} ${sl.y} ${sl.x + sl.w} ${sl.y + sl.rx}`,
    `V ${sl.y + sl.h - sl.rx}`,
    `Q ${sl.x + sl.w} ${sl.y + sl.h} ${sl.x + sl.w - sl.rx} ${sl.y + sl.h}`,
    `H ${sl.x + sl.rx}`,
    `Q ${sl.x} ${sl.y + sl.h} ${sl.x} ${sl.y + sl.h - sl.rx}`,
    `V ${sl.y + sl.rx}`,
    `Q ${sl.x} ${sl.y} ${sl.x + sl.rx} ${sl.y} Z`,
  ].join(" ");

  return (
    <div className={styles.overlayRoot}>
      {/* ── Dark SVG mask ── */}
      <svg
        className={styles.maskLayer}
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <path
          d={maskPath}
          fill={`rgba(0,0,0,${DARKEN_ALPHA})`}
          fillRule="evenodd"
        />
      </svg>

      {/* ── Dismiss layer (final step) ── */}
      {currentStep.action === "dismiss" && (
        <div
          style={{ position: "absolute", inset: 0, pointerEvents: "all" }}
          onClick={handleOverlayClick}
        />
      )}

      {/* ── Click Guard (blocks clicks outside spotlight) ── */}
      {lockClick && (
        <div className={styles.clickGuard} onClick={handleOverlayClick}>
          {/* Spotlight hole — absolute positioned rect that is clear.
              Clicks here pass through to game elements. */}
          <div
            className={styles.spotlightWindow}
            style={{
              left: sl.x,
              top: sl.y,
              width: sl.w,
              height: sl.h,
              borderRadius: sl.rx,
              pointerEvents: "none", // Window border itself is non-interactive
              visibility: "visible",
            }}
          />
          {/* We use the SVG mask for the visual, this div is for the logic */}
          <div
            style={{
              position: "absolute",
              left: sl.x,
              top: sl.y,
              width: sl.w,
              height: sl.h,
              borderRadius: sl.rx,
              pointerEvents: "none", // Allow clicks to pass THROUGH the guard in this specific area
            }}
          />
        </div>
      )}

      {/* ── Golden spotlight border (Visual only) ── */}
      {!lockClick && currentStep.targetId && (
        <div
          className={styles.spotlightWindow}
          style={{
            left: sl.x,
            top: sl.y,
            width: sl.w,
            height: sl.h,
            borderRadius: sl.rx,
            pointerEvents: "none",
          }}
        />
      )}

      {/* ── Tooltip Card ── */}
      <div
        ref={tooltipRef}
        className={`${styles.tooltip} ${styles[`arrow${arrowDir.charAt(0).toUpperCase() + arrowDir.slice(1)}`] ?? ""} ${styles.fadeEnter}`}
        style={{
          position: "absolute",
          ...tooltipPos,
          pointerEvents: "all",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step dots */}
        <div className={styles.stepIndicator}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`${styles.stepDot} ${
                i === stepIndex
                  ? styles.stepDotActive
                  : i < stepIndex
                    ? styles.stepDotDone
                    : ""
              }`}
            />
          ))}
        </div>

        <h3 className={styles.tooltipTitle}>{currentStep.title}</h3>
        <p className={styles.tooltipBody}>{currentStep.body}</p>

        <div className={styles.tooltipActions}>
          {/* Skip */}
          {!isLast && (
            <button
              className={styles.skipButton}
              onClick={(e) => {
                e.stopPropagation();
                skip();
              }}
            >
              Skip Tutorial
            </button>
          )}

          {/* Tap hint OR Next/Done button */}
          {lockClick ? (
            <span className={styles.tapHint}>
              <span className={styles.tapHintIcon}>👆</span>
              Tap the highlighted element
            </span>
          ) : isAuto ? (
            <span className={styles.tapHint}>
              <span className={styles.tapHintIcon}>⏳</span>
              Please wait…
            </span>
          ) : (
            <button
              className={styles.nextButton}
              onClick={(e) => {
                e.stopPropagation();
                handleNextClick();
              }}
            >
              {isLast ? "Got it! ⚔️" : "Next →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
