// ──────────────────────────────────────────────────────────────────────────────
// TUTORIAL STEP CONFIGURATION
// Each step describes ONE action the player must perform.
// "targetId" maps to a data-tutorial="<id>" attribute on a DOM element.
// "action" is the event that advances to the next step.
// ──────────────────────────────────────────────────────────────────────────────

export type TutorialAction =
  | "click" // Player clicks the spotlight target
  | "auto" // Advance automatically (no user action needed)
  | "dismiss"; // Final step — player taps anywhere / a dismiss button

export interface TutorialStep {
  id: string;
  /** Short headline shown above the tooltip */
  title: string;
  /** 1-2 sentence body text */
  body: string;
  /** data-tutorial value of the DOM element to spotlight. null = no spotlight */
  targetId: string | null;
  /** What the player must do to advance */
  action: TutorialAction;
  /** Tooltip position relative to spotlight (auto = pick best fit) */
  tooltipPosition?: "top" | "bottom" | "left" | "right" | "auto";
  /** Padding around the spotlight cutout (px) */
  spotlightPadding?: number;
  /** If true: overlay click-through is blocked (player MUST click the spotlight target) */
  lockToTarget?: boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome, my Lord! 👑",
    body: "Your village awaits. Let's start by opening the Build menu.",
    targetId: "build-button",
    action: "click",
    tooltipPosition: "top",
    spotlightPadding: 14,
    lockToTarget: false,
  },
  {
    id: "select-farm",
    title: "Build a Farm 🌾",
    body: "A Farm produces Crop to feed your people. Select it to enter placement mode.",
    targetId: "build-card-farm",
    action: "click",
    tooltipPosition: "right",
    spotlightPadding: 16,
    lockToTarget: false,
  },
  {
    id: "drag-building",
    title: "Drag to Position 📍",
    body: "Drag the ghost building to any green tile. You can also tap to move it instantly.",
    targetId: null,
    action: "auto",
    tooltipPosition: "bottom",
    spotlightPadding: 0,
    lockToTarget: false,
  },
  {
    id: "place-building",
    title: "Confirm Placement ✅",
    body: "Once you're happy with the location, tap the checkmark to start building.",
    targetId: null,
    action: "auto",
    tooltipPosition: "bottom",
    spotlightPadding: 0,
    lockToTarget: false,
  },
  {
    id: "construction-timer",
    title: "Under Construction ⚒️",
    body: "Construction is underway! We'll speed it up so you can start producing immediately.",
    targetId: null,
    action: "auto",
    tooltipPosition: "bottom",
    spotlightPadding: 0,
    lockToTarget: false,
  },
  {
    id: "collect-resources",
    title: "Instant Harvest! 🎉",
    body: "Production is full! Tap the crop bubble to claim your first resources.",
    targetId: null,
    action: "auto",
    tooltipPosition: "top",
    spotlightPadding: 20,
    lockToTarget: false,
  },
  {
    id: "complete",
    title: "You're ready! ⚔️",
    body: "Keep building Farms, Lumber Mills, and Housing to grow your village. Good luck!",
    targetId: null,
    action: "dismiss",
    tooltipPosition: "auto",
    spotlightPadding: 0,
    lockToTarget: false,
  },
];

export const TUTORIAL_STORAGE_KEY = "kingdom-tutorial-complete-v2";
