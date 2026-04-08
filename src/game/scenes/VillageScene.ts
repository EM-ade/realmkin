import Phaser from "phaser";

// ──────────────────────────────────────────────────────────────────────────────
// DEV MODE FLAG - Must match gameStore.ts
// When true: shows "DEV MODE" watermark on screen
// ──────────────────────────────────────────────────────────────────────────────
// DEV_MODE moved to gameStore.ts
import {
  BUILDINGS,
  getBuildingCost,
  getBuildingScale,
  getBuildingOffset,
  TILE_STYLE_BUILDINGS,
  getMaxCount,
  getLevelBuildTimeMs,
} from "@/game/config/buildings";
import { UNITS, getUnitTrainingCost } from "@/game/config/units";
import { SCENARIOS } from "@/game/config/scenarios";
import { useGameState } from "@/stores/gameStore";
import { useUIStore } from "@/stores/uiStore";
import type { Building, UnitType, Obstacle } from "@/stores/gameStore";
import {
  GridRenderer,
  encodeSlot,
  decodeSlot,
  DEFENSE_MIN,
  DEFENSE_MAX,
  BUILD_MIN,
  BUILD_MAX,
  TOWN_HALL_COL,
  TOWN_HALL_ROW,
  GRID_SIZE,
} from "@/game/ui/GridRenderer";
import { canPlace, getFootprintCells } from "@/game/utils/OccupiedGrid";
import { BuildingRenderer } from "@/game/ui/BuildingRenderer";
import { CollectorOverlay } from "@/game/ui/CollectorOverlay";
import { ObjectivesOverlay } from "@/game/ui/ObjectivesOverlay";
import { PhaserSoundBridge } from "@/audio/PhaserSoundBridge";
import {
  GAME_EVENT_BUILD,
  GAME_EVENT_UPGRADE,
  GAME_EVENT_CALL_WAVE,
  GAME_EVENT_BACK_TO_MENU,
} from "@/game/events";
import {
  TUTORIAL_BUILDING_PLACED,
  TUTORIAL_RESOURCE_COLLECTED,
} from "@/game/events";

// ── Grid constants ─────────────────────────────────────────────────────────────
// All coordinates are in the full 33×33 padded overscan grid space,
// matching GridRenderer's exported constants.
const DMIN = DEFENSE_MIN; // defense ring: first col/row  (= 9)
const DMAX = DEFENSE_MAX; // defense ring: last  col/row  (= 24)
const BMIN = BUILD_MIN; // first inner buildable col/row (= 11)
const BMAX = BUILD_MAX; // last  inner buildable col/row (= 21)
const TH_COL = TOWN_HALL_COL; // Town Hall col (= 16)
const TH_ROW = TOWN_HALL_ROW; // Town Hall row (= 16)

// Defense-only buildings (placed on the perimeter ring)
const DEFENSE_BUILDINGS = ["wall", "tower"] as const;
type DefenseBuildingType = (typeof DEFENSE_BUILDINGS)[number];

// Village buildings (placed inside the inner buildable zone)
const PLACEABLE = [
  "farm",
  "lumber-mill",
  "quarry",
  "iron-mine",
  "barracks",
  "warehouse",
  "house",
] as const;
type PlaceableType = (typeof PLACEABLE)[number] | DefenseBuildingType;

// RESOURCE_ICON_KEYS moved to React UI

interface SlotPos {
  cx: number; // center X of tile
  cy: number; // center Y of tile
  tileSize: number; // pixel size of one tile
  depth: number; // render depth
  // Legacy aliases kept so existing panel/badge code still compiles
  dBot: number; // = cy + tileSize/2
  dWaist: number; // = cy
  dTop: number; // = dWaist - (dBot - dWaist)
  halfW: number; // = tileSize/2
  tileW: number; // = tileSize
  imgX: number; // = cx - tileSize/2
  imgY: number; // = cy - tileSize/2
}

// ──────────────────────────────────────────────────────────────────────────────
export class VillageScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Container;
  private panelOpen = false;
  private hudTexts: Record<string, Phaser.GameObjects.Text> = {};
  private resourceTickTimer?: Phaser.Time.TimerEvent;
  private objectivesPanel!: Phaser.GameObjects.Container;
  // private dayText!: Phaser.GameObjects.Text; // Removed
  private uiContainer!: Phaser.GameObjects.Container;
  private uiCamera!: Phaser.Cameras.Scene2D.Camera;

  // Grid renderer (handles all isometric grid rendering)
  private gridRenderer!: GridRenderer;
  private buildingRenderer!: BuildingRenderer;
  private collectorOverlay!: CollectorOverlay;
  private objectivesOverlay!: ObjectivesOverlay;

  // Per-tile tracking (cleared on each create)
  private slotPos = new Map<number, SlotPos>();
  private slotSprite = new Map<number, Phaser.GameObjects.Image>();
  private tileBases = new Map<number, Phaser.GameObjects.Image>();
  private damagedOverlays = new Map<number, Phaser.GameObjects.Graphics>();
  private levelBadges = new Map<number, Phaser.GameObjects.Text>();
  /** Construction overlay containers keyed by slot index */
  private constructionOverlays = new Map<
    number,
    Phaser.GameObjects.Container
  >();
  /** Collector UI containers (progress bars / harvest buttons) keyed by slot index */
  private collectorOverlays = new Map<number, Phaser.GameObjects.Container>();
  /** Map of active timers for resource collection ticks keyed by building ID */
  private collectorTimers = new Map<string, Phaser.Time.TimerEvent>();
  private builderHudText?: Phaser.GameObjects.Text;
  private isPlacing = false;
  private placementType: string | null = null;
  private placementGhost: Phaser.GameObjects.Image | null = null;
  private placementUI: Phaser.GameObjects.Container | null = null;
  private placementCol = 0;
  private placementRow = 0;
  private lastPlacementValid: boolean | null = null; // Track validity state for sound triggers
  private longPressTimer?: Phaser.Time.TimerEvent;
  private longPressDuration = 800; // ms
  private relocatingBuildingOriginalSlot: number | null = null;

  constructor() {
    super({ key: "VillageScene" });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  create(): void {
    const { width, height } = this.cameras.main;
    this.slotPos.clear();
    this.slotSprite.clear();
    this.tileBases.clear();
    this.damagedOverlays.clear();

    // ── Tutorial Event Listeners ─────────────────────────────────────────
    window.addEventListener("tutorial:force-complete", (e: any) => {
      const bId = e.detail?.buildingId;
      if (bId) {
        useGameState.getState().completeConstruction(bId);
        this.showToast("⚒️ Instant build!");
      }
    });

    this.cameras.main.setBackgroundColor("#1c3a10"); // forest green — blends with map border

    // ── Static background: 8 chunks of 1271×1180 (actual pixel dims from slice) ─
    // CW/CH must match the real chunk pixel dimensions — mismatch causes blur.
    const CW = 1271; // actual chunk width  (5084 / 4)
    const CH = 1180; // actual chunk height (2360 / 2)
    const bgKeys = [
      ["bg-c0r0", "bg-c1r0", "bg-c2r0", "bg-c3r0"], // row 0 (world y=0)
      ["bg-c0r1", "bg-c1r1", "bg-c2r1", "bg-c3r1"], // row 1 (world y=CH)
    ];
    bgKeys.forEach((row, r) =>
      row.forEach((key, c) => {
        // 1px overlap on seam-facing edges prevents sub-pixel gaps
        const x = c === 0 ? 0 : c * CW - 1;
        const y = r === 0 ? 0 : r * CH - 1;
        const w = CW + (c > 0 ? 1 : 0) + (c < 3 ? 1 : 0);
        const h = CH + (r > 0 ? 1 : 0) + (r < 1 ? 1 : 0);
        this.add
          .image(x, y, key)
          .setOrigin(0, 0)
          .setDisplaySize(w, h)
          .setDepth(-1);
      }),
    );

    // Load starting resources from scenario on first run
    const store = useGameState.getState();
    const scenario = SCENARIOS.find((s) => s.id === store.currentScenario);
    if (
      scenario &&
      store.resources.wood === 500 &&
      store.resources.clay === 500
    ) {
      store.addResources({
        wood: scenario.startingResources.wood - 500,
        clay: scenario.startingResources.clay - 500,
        iron: scenario.startingResources.iron - 200,
        crop: scenario.startingResources.crop - 500,
      });
    }

    // Title — hidden (HUD strip replaces it, saves vertical space)
    // Kept minimal: show in HUD bar center

    this.objectivesPanel = this.add
      .container(0, 0)
      .setDepth(250)
      .setScrollFactor(0);

    // Initialize tick bar graphics (used for legacy purposes, can be removed later)
    // this.tickBarGraphics = this.add.graphics();
    // this.tickBarBg = this.add.graphics();

    // ResourceHUD is now DEPRECATED and handled by the React TopBar.
    // We keep the timer logic below to sync progress to the store.

    // Initialize collector overlay
    this.collectorOverlay = new CollectorOverlay({
      scene: this,
      container: this.add.container(0, 0),
      onHarvest: (buildingId) => this.handleHarvest(buildingId),
    });
    this.collectorOverlay.setSlotPos(this.slotPos);

    // Initialize objectives overlay
    this.objectivesOverlay = new ObjectivesOverlay({
      scene: this,
      container: this.objectivesPanel,
    });
    this.objectivesOverlay.refresh();

    // this.createEndTurnButton(width, height); // Removed - handled by React BottomBar
    // No longer need Phuket HUD timer

    // ── Visual resource tick countdown (5 seconds) ────────────────────────
    const TICK_MS = 5000;
    this.resourceTickTimer = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => {
        const st = useGameState.getState();
        const prod = st.tickResources();

        // Check research queue
        if (st.activeResearch && Date.now() >= st.activeResearch.finishesAt) {
          st.completeResearch();
          this.showToast("🔬 Research completed!");
        }

        st.checkObjectives();
        st.save();
        // this.resourceHUD.refresh(); // Removed
        const total = prod.wood + prod.clay + prod.iron + prod.crop;
        if (total <= 0) return;
        const sw = this.scale.width;
        const msg = `+${Math.floor(prod.wood)} 🪵  +${Math.floor(prod.clay)} 🧱  +${Math.floor(prod.iron)} ⛏  +${Math.floor(prod.crop)} 🌾`;
        const toast = this.add
          .text(sw / 2, 108, msg, {
            fontSize: "13px",
            fontFamily: "Arial",
            color: "#aaffaa",
            backgroundColor: "#000000bb",
            padding: { x: 10, y: 5 },
            stroke: "#004400",
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(400)
          .setScrollFactor(0);
        this.tweens.add({
          targets: toast,
          y: 80,
          alpha: 0,
          duration: 1800,
          ease: "Power2",
          onComplete: () => toast.destroy(),
        });
      },
    });

    // ── Per-building collector tick (1 second) ────────────────────────────────
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const store = useGameState.getState();
        store.buildings.forEach((b) => {
          const cfg = BUILDINGS[b.type];
          if (cfg?.tickIntervalMs) {
            store.tickBuildingCollector(b.id);
          }
        });
      },
    });
    // Let's actually create independent timers per building so they don't sync up exactly.
    // We'll manage those in a scene Map.

    // Update tick progress bar every frame and sync to store
    this.events.on("update", () => {
      if (!this.resourceTickTimer) return;
      // Push progress (0 to 1) to the game store for the React TopBar to pick up
      const progress = this.resourceTickTimer.getProgress();
      useGameState.getState().setProductionProgress(progress);

      // Also update collector overlays if needed
      this.collectorOverlay?.updateAll();
      this.updateObstacleOverlays();
    });

    // Spawn obstacles if none exist
    store.spawnInitialObstacles();
    this.refreshObstacles();

    // Menu button — Moved to React UI
    /*
    const menuBtn = this.add
      .text(14, height - 24, "← MENU", {
        ...
      });
    ...
    */

    // Hint text — fixed bottom center
    this.add
      .text(
        width / 2,
        height - 12,
        "Tap tile to build  •  Resources auto-generate  •  Call Wave to fight",
        {
          fontSize: "11px",
          fontFamily: "Manrope, sans-serif",
          fontStyle: "bold",
          color: "#d7ccc8",
          stroke: "#000",
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setDepth(300)
      .setScrollFactor(0);

    this.panel = this.add.container(0, 0).setDepth(500).setVisible(false);
    // .setScrollFactor(0); // Removed setScrollFactor here as it's added to uiContainer later

    // Initialize grid renderer and create the isometric grid
    // centerX/centerY = world center of full_map.webp (5084×2360)
    const bgTotalW = 5084;
    const bgTotalH = 2360;

    useGameState.getState().setCurrentScene("Village");

    this.gridRenderer = new GridRenderer({
      scene: this,
      centerX: bgTotalW / 2, // 2542
      centerY: bgTotalH / 2, // 1180
      onTileClick: (col, row) => this.handleTileClick(col, row),
    });
    this.gridRenderer.createGrid();

    // ── Camera: strictly prevent letterboxing on Desktop, allow buffer on Mobile ────────────
    const isMobile = width < 768;
    const minZoomX = width / bgTotalW;
    const minZoomY = height / bgTotalH;
    const baseMinZoom = Math.max(minZoomX, minZoomY);

    // On PC, we strictly prevent seeing the "void" background (no multiplier).
    // On Mobile, we lock zoom to map height (minZoomY) and allow full horizontal panning.
    const MIN_ZOOM = isMobile ? minZoomY : baseMinZoom;
    const DEFAULT_ZOOM = isMobile ? minZoomY : Math.max(MIN_ZOOM, 0.3);

    const bgCam = this.cameras.main;
    bgCam.setZoom(DEFAULT_ZOOM);
    bgCam.centerOn(bgTotalW / 2, bgTotalH / 2);

    // Add horizontal buffer on mobile strictly inside map artwork
    const horizontalBuffer = 0;
    const verticalBuffer = 0; // Lock vertically
    bgCam.setBounds(
      -horizontalBuffer,
      -verticalBuffer,
      bgTotalW + horizontalBuffer * 2,
      bgTotalH + verticalBuffer * 2,
    );

    // Save MIN_ZOOM on instance so input handlers can enforce it
    (this as any).globalMinZoom = MIN_ZOOM;

    // Sync tile positions to legacy slotPos map for backward compatibility
    this.gridRenderer.getAllTilePositions().forEach((pos, slot) => {
      this.slotPos.set(slot, {
        cx: pos.cx,
        cy: pos.dWaist,
        tileSize: pos.tileW,
        depth: pos.depth,
        dBot: pos.dBot,
        dWaist: pos.dWaist,
        dTop: pos.dTop,
        halfW: pos.halfW,
        tileW: pos.tileW,
        imgX: pos.imgX,
        imgY: pos.imgY,
      });
    });

    // Initialize building renderer
    this.buildingRenderer = new BuildingRenderer({
      scene: this,
      slotPos: this.slotPos,
      slotSprite: this.slotSprite,
      levelBadges: this.levelBadges,
      damagedOverlays: this.damagedOverlays,
      constructionOverlays: this.constructionOverlays,
    });

    // Initialize sound bridge — connects Phaser to the shared SoundManager
    PhaserSoundBridge.init(this);

    // Expose getState globally for BuildingRenderer (avoids circular dependency)
    (window as any).__KINGDOM_GET_STATE__ = useGameState.getState;

    // ── Floating cloud decorations ────────────────────────────────────────────
    // Reduced opacity and count for better game board visibility
    const cloudKeys = ["deco-cloud1", "deco-cloud2"];
    const cloudCount = isMobile ? 3 : 4;
    const cloudAlphaMin = isMobile ? 0.1 : 0.15;
    const cloudAlphaMax = isMobile ? 0.2 : 0.25;

    for (let i = 0; i < cloudCount; i++) {
      const ck = cloudKeys[i % 2];
      if (!this.textures.exists(ck)) continue;
      const cx2 = Phaser.Math.Between(100, width - 100);
      const cy2 = Phaser.Math.Between(60, height * 0.3);
      const cloud = this.add
        .image(cx2, cy2, ck)
        .setAlpha(Phaser.Math.FloatBetween(cloudAlphaMin, cloudAlphaMax))
        .setScale(Phaser.Math.FloatBetween(0.4, 0.8))
        .setDepth(2000)
        .setScrollFactor(0.05); // very slow parallax
      // Drift slowly across screen
      this.tweens.add({
        targets: cloud,
        x: cx2 + Phaser.Math.Between(80, 200),
        duration: Phaser.Math.Between(20000, 40000),
        repeat: -1,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }

    // ── First-time hint — pulsing "Tap a green tile to build!" ───────────────
    const hasBuiltBefore = useGameState.getState().buildings.length > 1;
    if (!hasBuiltBefore) {
      const sw2 = this.scale.width;
      const hint = this.add
        .text(sw2 * 0.75, 220, "👆 Tap a green tile to build!", {
          fontSize: "14px",
          fontFamily: "Lilita One, cursive, Arial",
          color: "#ffffff",
          stroke: "#000000",
          strokeThickness: 4,
          backgroundColor: "#00000088",
          padding: { x: 12, y: 8 },
        })
        .setOrigin(0.5)
        .setDepth(600)
        .setScrollFactor(0);
      this.tweens.add({
        targets: hint,
        alpha: { from: 1, to: 0.3 },
        duration: 900,
        yoyo: true,
        repeat: 4,
        onComplete: () => hint.destroy(),
      });
    }

    // ── Mobile: handle screen resize (orientation change, etc.) ─────────────
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      const w = gameSize.width,
        h = gameSize.height;
      this.cameras.main.setViewport(0, 0, w, h);
      // Restart scene to re-layout grid and UI at new dimensions
      this.scene.restart();
    });

    this.autoPlaceWalls();
    this.renderExistingBuildings();
    this.buildingRenderer.renderDamagedOverlays();
    this.renderExistingLevelBadges();

    // ── Zoom and Panning Controls ─────────────────────────────────────────────
    const cam = this.cameras.main;

    // No mouse wheel zoom on desktop — fixed zoom only
    // Pinch-to-zoom kept for mobile only
    const MAX_ZOOM = 2.0;
    let initialZoom = cam.zoom;
    this.input.on("pinchstart", () => {
      initialZoom = cam.zoom;
    });
    this.input.on(
      "pinch",
      (_p: any, _dx: number, _dy: number, _dd: number, dragScale: number) => {
        if (this.panelOpen) return;
        cam.setZoom(
          Phaser.Math.Clamp(
            initialZoom * dragScale,
            (this as any).globalMinZoom,
            MAX_ZOOM,
          ),
        );
      },
    );

    // Mouse wheel zoom for desktop
    this.input.on(
      "wheel",
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: any,
        _deltaX: number,
        deltaY: number,
        _deltaZ: number,
      ) => {
        if (this.panelOpen) return;
        const zoomAmount = deltaY > 0 ? 0.9 : 1.1;
        cam.setZoom(
          Phaser.Math.Clamp(
            cam.zoom * zoomAmount,
            (this as any).globalMinZoom,
            MAX_ZOOM,
          ),
        );
      },
    );

    // Drag to pan or move building ghost
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // If we move too much while trying to long-press, cancel it (user is panning)
      if (
        this.longPressTimer &&
        Phaser.Math.Distance.Between(
          pointer.x,
          pointer.y,
          pointer.downX,
          pointer.downY,
        ) > 10
      ) {
        this.longPressTimer.remove();
        this.longPressTimer = undefined;
      }

      if (this.isPlacing) {
        // Clash-Style: Only move the building if dragging (pointer is down)
        // This allows the user to hover and click the checkmark without the ghost following.
        if (pointer.isDown && this.placementGhost) {
          const isTouch = pointer.id !== 0;
          const offsetY = isTouch ? -60 / this.cameras.main.zoom : 0;

          const hovered = this.gridRenderer.getSlotFromPosition(
            pointer.worldX,
            pointer.worldY + offsetY,
          );

          if (
            hovered &&
            (hovered.col !== this.placementCol ||
              hovered.row !== this.placementRow)
          ) {
            this.placementCol = hovered.col;
            this.placementRow = hovered.row;
            this.updateGhostVisuals();
          }
        } else if (this.isPlacing) {
          // Keep showing the highlight at the current position even when not dragging
          this.updateGhostVisuals();
        }
        return;
      }

      if (this.isInputBlocked()) return;
      if (!pointer.isDown) return;

      cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
      cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
    });

    // --- TUTORIAL LISTENERS ---
    window.addEventListener("tutorial:force-complete", (e: any) => {
      const bId = e.detail?.buildingId;
      if (bId) {
        console.log(`[Tutorial] Forced completion of building: ${bId}`);
        const store = useGameState.getState();
        const building = store.buildings.find((b) => b.id === bId);

        store.completeConstruction(bId);

        if (building) {
          // Remove timer and scaffold
          this.buildingRenderer.removeConstructionOverlay(building.slotIndex);

          // Refresh visuals
          this.renderExistingBuildings();
          this.buildingRenderer.renderDamagedOverlays();
          this.renderExistingLevelBadges();

          // Small delay to let the store update, then force collector refresh
          this.time.delayedCall(100, () => {
            this.collectorOverlay?.updateAll();
          });
        }
      }
    });

    // Close panel on background click
    this.input.on(
      "pointerdown",
      (
        pointer: Phaser.Input.Pointer,
        objs: Phaser.GameObjects.GameObject[],
      ) => {
        // --- INPUT SHIELDING ---
        // If we're placing/relocating, OR we clicked a UI object (like the checkmark),
        // don't process background tile clicks.
        if (this.isPlacing || objs.length > 0) return;

        // --- LONG PRESS DETECTION ---
        const hovered = this.gridRenderer.getSlotFromPosition(
          pointer.worldX,
          pointer.worldY,
        );
        if (hovered && !this.panelOpen) {
          const slotIndex = encodeSlot(hovered.col, hovered.row);
          const bldg = useGameState
            .getState()
            .buildings.find((b) => b.slotIndex === slotIndex);

          if (bldg && bldg.type !== "town-hall") {
            // TH is usually fixed or requires special lift
            this.longPressTimer = this.time.delayedCall(
              this.longPressDuration,
              () => {
                useUIStore.getState().startRelocation(bldg.id);
              },
            );
          }
        }

        if (this.isInputBlocked() && objs.length === 0) {
          // If a legacy Phaser panel is open, close it
          if (this.panelOpen) this.closePanel();
        }
      },
    );

    this.input.on("pointerup", () => {
      if (this.longPressTimer) {
        this.longPressTimer.remove();
        this.longPressTimer = undefined;
      }
    });

    // Wait, the end turned out to be earlier, so we moved it to the actual end of create().
    // ── Bind all static UI elements into a dedicated UI Camera ───────────────
    // We do this to bypass the world's global zoom when interacting with UI, preventing hitbox bugs.
    this.uiContainer = this.add.container(0, 0).setDepth(5000);
    const staticUI = this.children.list.filter(
      (c) => (c as any).scrollFactorX === 0 && c !== this.uiContainer,
    );
    // Remove scrollFactor(0) from them because the dedicated camera won't scroll anyway
    staticUI.forEach((c) => (c as any).setScrollFactor(1));
    this.uiContainer.add(staticUI);

    this.uiCamera = this.cameras.add(0, 0, width, height);
    this.uiCamera.setZoom(1.0); // 1:1 zoom — panel positions match screen coords exactly
    this.uiCamera.setScroll(0, 0); // Always anchored at top-left

    // Make main camera ignore the UI container
    this.cameras.main.ignore(this.uiContainer);

    // ── Listen for React UI events ──────────────────────────────────────────
    const handleBuildEvent = (e: any) => {
      const { type, col, row } = e.detail;
      this.handleBuild(col, row, type);
    };

    const handleUpgradeEvent = (e: any) => {
      const { buildingId, col, row, nextLevel, cost } = e.detail;
      this.handleUpgrade(col, row, buildingId, nextLevel, cost);
    };

    const handleCallWave = () => this.handleEndTurn();
    const handleBackToMenu = () => this.scene.start("MainMenuScene");

    window.addEventListener(GAME_EVENT_BUILD, handleBuildEvent);
    window.addEventListener(GAME_EVENT_UPGRADE, handleUpgradeEvent);
    window.addEventListener(GAME_EVENT_CALL_WAVE, handleCallWave);
    window.addEventListener(GAME_EVENT_BACK_TO_MENU, handleBackToMenu);

    // Tutorial forced completion (e.g. step 4)
    const handleTutorialForceComplete = ((e: Event) => {
      const ce = e as CustomEvent<{ buildingId: string }>;
      const store = useGameState.getState();
      const bldg = store.buildings.find((b) => b.id === ce.detail.buildingId);
      if (bldg && bldg.underConstruction) {
        const col = bldg.slotIndex % 50;
        const row = Math.floor(bldg.slotIndex / 50);
        store.completeConstruction(bldg.id);
        this.buildingRenderer.removeConstructionOverlay(bldg.slotIndex);
        this.buildingRenderer.animateBuilding(
          col,
          row,
          `${bldg.type}-l${bldg.level}`,
          false,
        );
      }
    }) as EventListener;
    window.addEventListener(
      "tutorial:force-complete",
      handleTutorialForceComplete,
    );

    // ── Subscribe to UIStore for placement mode ───────────────────────────
    // Initialized at the END of create() to ensure all scene members (this.panel, etc) are ready.
    let prevPlacementMode = useUIStore.getState().placementMode;
    const unsubscribeUI = useUIStore.subscribe((state) => {
      // Safety check: if scene is destroyed or shutting down, don't process
      if (!this.scene || !this.scene.isActive()) return;

      const mode = state.placementMode;
      const type = state.selectedBuildingType;
      const isRelocating = state.isRelocating;
      const relId = state.relocatingBuildingId;

      if (mode && !prevPlacementMode) {
        if (isRelocating && relId) {
          const store = useGameState.getState();
          const b = store.buildings.find((b) => b.id === relId);
          if (b) {
            const pos = this.gridRenderer.getTilePosition(
              decodeSlot(b.slotIndex).col,
              decodeSlot(b.slotIndex).row,
            );
            this.playDustPoof(pos.cx, pos.cy);
          }
          this.startRelocation(relId);
        } else if (type) {
          this.startPlacement(type);
        }
      } else if (!mode && prevPlacementMode) {
        this.destroyPlacementGhost();
        this.fadeOtherBuildings(false);
      }
      prevPlacementMode = mode;
    });

    let prevBuildingsHash = JSON.stringify(
      useGameState.getState().buildings.map((b) => ({
        id: b.id,
        type: b.type,
        level: b.level,
        slotIndex: b.slotIndex,
        underConstruction: b.underConstruction,
      })),
    );

    const unsubscribeGame = useGameState.subscribe((state) => {
      // Safety check: if scene is destroyed or shutting down, don't process
      if (!this.scene || !this.scene.isActive()) return;

      const currentBuildingsHash = JSON.stringify(
        state.buildings.map((b) => ({
          id: b.id,
          type: b.type,
          level: b.level,
          slotIndex: b.slotIndex,
          underConstruction: b.underConstruction,
        })),
      );

      if (currentBuildingsHash !== prevBuildingsHash) {
        console.log(
          `[VillageScene] Buildings structure changed, re-rendering...`,
        );
        prevBuildingsHash = currentBuildingsHash;
        this.renderExistingBuildings();
        this.buildingRenderer.renderDamagedOverlays();
        this.renderExistingLevelBadges();
      }
    });

    this.events.on("shutdown", () => {
      window.removeEventListener(
        "tutorial:force-complete",
        handleTutorialForceComplete,
      );
      window.removeEventListener(GAME_EVENT_BUILD, handleBuildEvent);
      window.removeEventListener(GAME_EVENT_UPGRADE, handleUpgradeEvent);
      window.removeEventListener(GAME_EVENT_CALL_WAVE, handleCallWave);
      window.removeEventListener(GAME_EVENT_BACK_TO_MENU, handleBackToMenu);
      unsubscribeUI();
      unsubscribeGame();
    });
    this.events.once("destroy", () => {
      unsubscribeUI();
      unsubscribeGame();
    });
  }

  update(_time: number, _delta: number): void {
    if (this.uiCamera && this.uiContainer) {
      // Ensure the UI camera ignores all game objects, even dynamically created ones
      const gameObjects = this.children.list.filter(
        (c) => c !== this.uiContainer,
      );
      this.uiCamera.ignore(gameObjects);
    }
  }

  shutdown(): void {
    this.destroyPlacementGhost();
  }

  // handleHarvest moved to avoid duplicate implementation error. See line ~1140.

  private showFloatingText(x: number, y: number, text: string): void {
    const txt = this.add
      .text(x, y, text, {
        fontSize: "18px",
        fontFamily: "Bangers, cursive, Arial Black",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.tweens.add({
      targets: txt,
      y: y - 50,
      alpha: 0,
      duration: 1000,
      ease: "Power2",
      onComplete: () => txt.destroy(),
    });
  }

  // DEPRECATED: Use resourceHUD.refresh instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _refreshHUD(): void {
    const state = useGameState.getState();
    const { resources, resourceProduction } = state;
    (["wood", "clay", "iron", "crop"] as const).forEach((k) => {
      if (this.hudTexts[k]) {
        const prod = Math.floor(resourceProduction[k]);
        const prodStr = prod > 0 ? ` +${prod}` : "";
        this.hudTexts[k].setText(`${Math.floor(resources[k])}${prodStr}`);
      }
    });
    if (this.hudTexts["army"]) {
      this.hudTexts["army"].setText(
        `Army: ${state.getTotalUnits()}/${state.getMaxArmySize()}`,
      );
    }
    // Day text removed as it's now in the React TopBar
    // Builder status badge
    if (this.builderHudText) {
      const { busy, total } = state.getBuilderCount();
      const free = total - busy;
      this.builderHudText.setText(`🔨 ${free}/${total} free`);
      this.builderHudText.setColor(free === 0 ? "#ff8866" : "#88ddff");
    }
    this.objectivesOverlay.refresh();
  }

  // ── End Turn button ────────────────────────────────────────────────────────
  // createEndTurnButton removed as it's now handled by React UI

  private handleEndTurn(): void {
    const store = useGameState.getState();
    const { resourcesGained, waveIndex } = store.endTurn();
    store.checkObjectives();
    store.save();
    // this.resourceHUD.refresh(); // Removed

    const scenario = SCENARIOS.find((s) => s.id === store.currentScenario);
    const wave = scenario?.enemyWaves?.[waveIndex];

    // Show resources gained toast
    const { width, height } = this.cameras.main;
    const msg = `+${Math.floor(resourcesGained.wood)}🪵  +${Math.floor(resourcesGained.clay)}🧱 \n +${Math.floor(resourcesGained.iron)}⛏  +${Math.floor(resourcesGained.crop)}🌾`;
    const toast = this.add
      .text(width / 2, height / 2 - 60, `RESOURCES COLLECTED!\n${msg}`, {
        fontSize: "20px",
        fontFamily: "Bangers, cursive, Arial Black",
        color: "#FFD700",
        stroke: "#000",
        strokeThickness: 5,
        backgroundColor: "#231912dd",
        padding: { x: 20, y: 12 },
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(500);
    this.tweens.add({
      targets: toast,
      y: toast.y - 40,
      alpha: 0,
      duration: 2000,
      delay: wave ? 600 : 200,
      onComplete: () => toast.destroy(),
    });

    if (wave) {
      // Small delay then launch enemy march + battle
      this.time.delayedCall(1200, () => this.launchEnemyMarch(wave, waveIndex));
    }
  }

  // ── Enemy march on village then cut to BattleScene ────────────────────────
  private launchEnemyMarch(
    wave: { delay: number; units: { type: string; count: number }[] },
    waveIndex: number,
  ): void {
    const { width, height } = this.cameras.main;
    const store = useGameState.getState();

    // Show "Enemy Approaching!" banner
    const banner = this.add
      .text(width / 2, height / 2 - 20, "⚔ ENEMY APPROACHING! ⚔", {
        fontSize: "36px",
        fontFamily: "Bangers, cursive, Arial Black",
        color: "#ff2222",
        stroke: "#000",
        strokeThickness: 6,
        backgroundColor: "#231912ee",
        padding: { x: 30, y: 15 },
      })
      .setOrigin(0.5)
      .setDepth(600)
      .setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 400 });

    // Spawn enemy sprites marching from top-right toward center
    const enemySprites: Phaser.GameObjects.Image[] = [];
    const unitTypes = wave.units.map((u) => u.type);
    unitTypes.slice(0, 5).forEach((uType, i) => {
      const texKey = `unit-enemy-${uType}`;
      const fallback = `unit-${uType}-t1`;
      const key = this.textures.exists(texKey)
        ? texKey
        : this.textures.exists(fallback)
          ? fallback
          : null;
      if (!key) return;
      const startX = width * 0.85 + i * 30;
      const startY = height * 0.15 + i * 20;
      const spr = this.add
        .image(startX, startY, key)
        .setDisplaySize(48, 48)
        .setDepth(700)
        .setTint(0xff4444);
      enemySprites.push(spr);
      this.tweens.add({
        targets: spr,
        x: width / 2 + (i - 2) * 40,
        y: height / 2 + 20,
        duration: 1200,
        ease: "Sine.easeIn",
        delay: i * 80,
      });
    });

    // After march, cut to BattleScene
    this.time.delayedCall(2200, () => {
      enemySprites.forEach((s) => s.destroy());
      banner.destroy();
      this.scene.start("BattleScene", {
        waveIndex,
        scenarioId: store.currentScenario,
      });
    });
  }

  // ── Objectives overlay ─────────────────────────────────────────────────────
  private createObjectivesOverlay(width: number): void {
    this.objectivesPanel.removeAll(true);
    const store = useGameState.getState();
    const scenario = SCENARIOS.find((s) => s.id === store.currentScenario);
    if (!scenario) return;

    const pw = 220,
      lineH = 26,
      pad = 12;
    const ph = lineH * (scenario.objectives.length + 1) + pad * 2;
    const px = width - pw - 10,
      py = 100;

    const bg = this.add.graphics();
    bg.fillStyle(0x231912, 0.95); // CoC wood/border color
    bg.fillRoundedRect(px, py, pw, ph, 12);
    bg.lineStyle(3, 0x000000, 1);
    bg.strokeRoundedRect(px, py, pw, ph, 12);
    this.objectivesPanel.add(bg);

    this.objectivesPanel.add(
      this.add
        .text(px + pw / 2, py + pad, "OBJECTIVES", {
          fontSize: "16px",
          fontFamily: "Bangers, cursive, Arial Black",
          color: "#FFD700",
          stroke: "#000",
          strokeThickness: 3,
        })
        .setOrigin(0.5, 0),
    );

    scenario.objectives.forEach((obj, i) => {
      const done = store.completedObjectives.includes(obj.id);
      const icon = done ? "✓" : "○";
      const col = done ? "#4ade80" : "#ffffff";
      this.objectivesPanel.add(
        this.add.text(
          px + 12,
          py + pad + lineH * (i + 1),
          `${icon} ${obj.description}`,
          {
            fontSize: "12px",
            fontFamily: "Manrope, sans-serif",
            color: col,
            wordWrap: { width: pw - 24 },
            stroke: "#000",
            strokeThickness: 2,
          },
        ),
      );
    });
  }

  // DEPRECATED: Use objectivesOverlay.refresh instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _refreshObjectivesOverlay(): void {
    const { width } = this.cameras.main;
    this.createObjectivesOverlay(width);
  }

  // ── Render all existing buildings from store (CHUNKED to prevent freeze) ──
  private renderExistingBuildingsChunked(index: number = 0, chunkSize: number = 3): void {
    const store = useGameState.getState();
    const endIndex = Math.min(index + chunkSize, store.buildings.length);

    // Render this chunk
    for (let i = index; i < endIndex; i++) {
      const b = store.buildings[i];
      const { col, row } = decodeSlot(b.slotIndex);
      const texKey = `${b.type}-l${b.level}`;

      // Only render if texture exists
      if (this.textures.exists(texKey)) {
        const pos = this.slotPos.get(b.slotIndex);
        if (!pos) {
          console.warn(
            `[renderExistingBuildings] No slotPos for ${b.type} at ${col},${row} (slot ${b.slotIndex})`,
          );
          continue;
        }
        if (b.underConstruction) {
          const now = Date.now();
          const remainingMs = b.constructionFinishesAt
            ? Math.max(0, b.constructionFinishesAt - now)
            : 0;

          if (remainingMs > 0) {
            this.buildingRenderer.animateBuilding(
              col,
              row,
              "construction-site",
              false,
            );

            const completeBuild = () => {
              store.completeConstruction(b.id);
              store.checkObjectives();
              store.save();
              this.buildingRenderer.removeConstructionOverlay(b.slotIndex);

              const updatedBldg = useGameState
                .getState()
                .buildings.find((bl) => bl.id === b.id);
              const finalLevel = updatedBldg
                ? updatedBldg.level
                : b.isUpgrade
                ? b.level + 1
                : 1;
              const finalTexKey = `${b.type}-l${finalLevel}`;

              const constrSpr = this.slotSprite.get(b.slotIndex);
              if (constrSpr) {
                this.tweens.add({
                  targets: constrSpr,
                  alpha: 0,
                  duration: 150,
                  onComplete: () => {
                    constrSpr.destroy();
                    this.buildingRenderer.animateBuilding(
                      col,
                      row,
                      finalTexKey,
                      false,
                    );
                    this.buildingRenderer.addLevelBadge(col, row, finalLevel);
                  },
                });
              } else {
                this.buildingRenderer.animateBuilding(
                  col,
                  row,
                  finalTexKey,
                  false,
                );
                this.buildingRenderer.addLevelBadge(col, row, finalLevel);
              }
              this.showToast(
                `🏗 ${BUILDINGS[b.type as keyof typeof BUILDINGS]?.name ?? b.type} finished!`,
              );
              this.syncCollectorTimers();
            };

            this.buildingRenderer.addConstructionOverlay(
              col,
              row,
              b.slotIndex,
              b.id,
              remainingMs,
              false,
              completeBuild,
            );

            this.time.delayedCall(remainingMs, completeBuild);
          } else {
            store.completeConstruction(b.id);
            store.save();

            const updatedBldg = useGameState
              .getState()
              .buildings.find((bl) => bl.id === b.id);
            const finalLevel = updatedBldg
              ? updatedBldg.level
              : b.isUpgrade
              ? b.level + 1
              : 1;
            const finalTexKey = `${b.type}-l${finalLevel}`;

            this.buildingRenderer.animateBuilding(col, row, finalTexKey, false);
            this.buildingRenderer.addLevelBadge(col, row, finalLevel);
          }
        } else {
          this.buildingRenderer.animateBuilding(col, row, texKey, false);

          if (b.type === "wall") {
            const isCorner =
              (col === DMIN && row === DMIN) ||
              (col === DMIN && row === DMAX) ||
              (col === DMAX && row === DMIN) ||
              (col === DMAX && row === DMAX);

            const needsFlip = !isCorner && (row === DMIN || row === DMAX);
            if (needsFlip) {
              const spr = this.slotSprite.get(b.slotIndex);
              if (spr) spr.setFlipX(true);
            }
          }
        }
      } else {
        console.warn(`[renderExistingBuildings] Missing texture: ${texKey}`);
      }
    }

    // Schedule next chunk if more buildings remain
    if (endIndex < store.buildings.length) {
      requestAnimationFrame(() => this.renderExistingBuildingsChunked(endIndex, chunkSize));
    }
  }

  // ── Original renderExistingBuildings (kept for backward compatibility) ──
  private renderExistingBuildings(): void {
    this.renderExistingBuildingsChunked(0, 3);
  }

  // ── Render level badges (CHUNKED to prevent freeze) ──────────────────────
  private renderExistingLevelBadgesChunked(index: number = 0, chunkSize: number = 5): void {
    const store = useGameState.getState();
    const endIndex = Math.min(index + chunkSize, store.buildings.length);

    for (let i = index; i < endIndex; i++) {
      const b = store.buildings[i];
      const { col, row } = decodeSlot(b.slotIndex);
      this.buildingRenderer.addLevelBadge(col, row, b.level);
    }

    if (endIndex < store.buildings.length) {
      requestAnimationFrame(() => this.renderExistingLevelBadgesChunked(endIndex, chunkSize));
    }
  }

  // ── Damaged building overlays ──────────────────────────────────────────────
  private renderExistingLevelBadges(): void {
    this.renderExistingLevelBadgesChunked(0, 5);
  }

  // ── Auto-place walls on defense ring at game start ────────────────────────
  private autoPlaceWalls(): void {
    // ── STEP 1: Purge all illegal buildings from the store ────────────────
    // We do this FIRST and re-fetch a fresh store snapshot before placement.
    // Using an old ref after setState causes all slots to appear occupied.
    const purgeSnapshot = useGameState.getState();
    const illegalBuildings = purgeSnapshot.buildings.filter((b) => {
      const { col, row } = decodeSlot(b.slotIndex);
      const isWallOrTower = b.type === "wall" || b.type === "tower";
      const isOutOfBounds =
        col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE;
      // Also clear anything sitting on the defense ring that's NOT a wall/tower
      const isOnDefenseRing =
        col === DMIN || col === DMAX || row === DMIN || row === DMAX;
      const isIllegalDefense = isOnDefenseRing && !isWallOrTower;

      return isOutOfBounds || isIllegalDefense;
    });

    useGameState.setState((s) => ({
      buildings: s.buildings.filter((b) => !illegalBuildings.includes(b)),
    }));

    // ── STEP 2: Fetch a FRESH store snapshot after purging ────────────────
    const store = useGameState.getState();
    const thLevel = store.getTownHallLevel();

    // Build a Set of already-occupied slots for fast lookup
    const occupiedSlots = new Set(store.buildings.map((b) => b.slotIndex));

    // ── STEP 3: Walk every tile on the outermost perimeter ───────────────
    // Outermost edge = row===0, row===18, col===0, OR col===18
    for (let col = DMIN; col <= DMAX; col++) {
      for (let row = DMIN; row <= DMAX; row++) {
        // Only the outer border ring — skip interior tiles
        const isPerimeter =
          col === DMIN || col === DMAX || row === DMIN || row === DMAX;
        if (!isPerimeter) continue;

        const slot = encodeSlot(col, row);

        // Skip if something already occupies this slot
        if (occupiedSlots.has(slot)) continue;

        // Corners get towers, all other perimeter tiles get walls
        const isCorner =
          (col === DMIN && row === DMIN) ||
          (col === DMIN && row === DMAX) ||
          (col === DMAX && row === DMIN) ||
          (col === DMAX && row === DMAX);
        const bType = isCorner ? "tower" : "wall";

        const buildingId = crypto.randomUUID();

        // Add and immediately complete construction (no build timer)
        // FIXED: skipXP true prevents auto-placed walls from awarding XP
        store.addBuilding({
          id: buildingId,
          type: bType,
          level: thLevel,
          slotIndex: slot,
        }, { skipXP: true });
        store.completeConstruction(buildingId);
        occupiedSlots.add(slot); // track locally so the inner loop stays sync

        // Render the sprite at the correct isometric position
        this.buildingRenderer.animateBuilding(
          col,
          row,
          `${bType}-l${thLevel}`,
          false,
        );

        // ── Wall flip logic: determine orientation per isometric edge ──────────
        // In isometric projection the 4 perimeter edges map as:
        //   col === DMIN → top-left edge  (palisade faces left)   → DEFAULT orientation
        //   col === DMAX → bottom-right edge (faces right)         → DEFAULT orientation
        //   row === DMIN → top-right edge  (faces right-upward)    → FLIP X
        //   row === DMAX → bottom-left edge (faces left-downward)  → FLIP X
        // Only flip on the row-dominant edges; col-dominant edges are already correct.
        const needsFlip = !isCorner && (row === DMIN || row === DMAX);

        if (needsFlip) {
          this.time.delayedCall(200, () => {
            const spr = this.slotSprite.get(slot);
            if (spr) spr.setFlipX(true);
          });
        }

        this.buildingRenderer.addLevelBadge(col, row, thLevel);
      }
    }

    // Persist the updated state to local storage
    useGameState.getState().save();
  }

  // ── Auto-upgrade defense ring when TH upgrades ────────────────────────────
  private upgradeDefenseRing(newLevel: number): void {
    const store = useGameState.getState();
    store.buildings
      .filter((b) => b.type === "wall" || b.type === "tower")
      .forEach((b) => {
        if (b.level >= newLevel) return;
        store.upgradeBuilding(b.id);
        // Upgrade to new level directly
        const { col, row } = decodeSlot(b.slotIndex);
        const texKey = `${b.type}-l${newLevel}`;
        this.buildingRenderer.animateBuilding(col, row, texKey, true);
        // Restore flip for top/bottom walls
        if (b.type === "wall" && (row === DMIN || row === DMAX)) {
          this.time.delayedCall(200, () => {
            const spr = this.slotSprite.get(b.slotIndex);
            if (spr) spr.setFlipX(true);
          });
        }
        this.buildingRenderer.addLevelBadge(col, row, newLevel);
      });
    store.save();
  }

  // ── Level badges ──────────────────────────────────────────────────────────
  // DEPRECATED: Use buildingRenderer.addLevelBadge instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _addLevelBadge(col: number, row: number, level: number): void {
    const slot = encodeSlot(col, row);
    // Remove old badge if any
    const old = this.levelBadges.get(slot);
    if (old) old.destroy();

    const pos = this.slotPos.get(slot);
    if (!pos) return;
    const { cx, dBot, depth } = pos;

    const stars = "★".repeat(level) + "☆".repeat(3 - level);
    const badge = this.add
      .text(cx, dBot - 6, stars, {
        fontSize: "10px",
        fontFamily: "Arial",
        color: level === 3 ? "#FFD700" : level === 2 ? "#aaddff" : "#aaaaaa",
        stroke: "#000000",
        strokeThickness: 3,
        backgroundColor: "#00000066",
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(depth + 10);

    this.levelBadges.set(slot, badge);
  }

  // DEPRECATED: Use buildingRenderer.renderDamagedOverlays instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _renderDamagedOverlays(): void {
    const store = useGameState.getState();
    this.damagedOverlays.forEach((g) => g.destroy());
    this.damagedOverlays.clear();

    store.buildings
      .filter((b) => b.damaged)
      .forEach((b) => {
        const pos = this.slotPos.get(b.slotIndex);
        if (!pos) return;
        const { cx, dWaist, halfW, depth } = pos;
        const g = this.add.graphics().setDepth(depth + 8);
        g.fillStyle(0xff0000, 0.25);
        g.fillPoints(
          [
            { x: cx, y: pos.dBot - (dWaist - pos.dBot) * 2 },
            { x: cx + halfW, y: dWaist },
            { x: cx, y: pos.dBot },
            { x: cx - halfW, y: dWaist },
          ],
          true,
        );
        // Damaged label
        const lbl = this.add
          .text(cx, dWaist - 8, "🔥 Damaged", {
            fontSize: "9px",
            fontFamily: "Arial",
            color: "#ff4444",
            backgroundColor: "#000000aa",
            padding: { x: 3, y: 2 },
          })
          .setOrigin(0.5)
          .setDepth(depth + 9);
        this.damagedOverlays.set(b.slotIndex, g);
        void lbl;
      });
  }

  // ── Panel helpers ─────────────────────────────────────────────────────────────
  private closePanel(): void {
    this.panel.setVisible(false);
    this.panel.removeAll(true);
    this.panelOpen = false;

    // Synchronize with React UI Store to ensure panels are closed
    const uiState = useUIStore.getState();
    if (uiState.buildPanelOpen) uiState.closeBuildPanel();
    if (uiState.upgradePanelOpen) uiState.closeUpgradePanel();
    if (uiState.gemStoreOpen) {
      // closeGemStore doesn't exist? Use setGemStoreOpen(false) if available,
      // or just trust the individual panel closes.
    }
  }

  private handleHarvest(buildingId: string): void {
    const store = useGameState.getState();
    const res = store.collectFromBuilding(buildingId);
    if (res) {
      // Play resource collection sound
      PhaserSoundBridge.play(this, 'resource_collect');

      store.save();
      // Notify tutorial system that resources were collected
      window.dispatchEvent(
        new CustomEvent("tutorial:resource-collected", {
          detail: { buildingId },
        }),
      );
      const building = store.buildings.find((b) => b.id === buildingId);
      if (!building) return;
      const pos = this.slotPos.get(building.slotIndex);
      if (!pos) return;

      let emoji = "📦";
      if (res.resource === "wood") emoji = "🪵";
      if (res.resource === "clay") emoji = "🧱";
      if (res.resource === "iron") emoji = "⛏️";
      if (res.resource === "crop") emoji = "🌾";

      const floatY = pos.dWaist - (pos.dBot - pos.dWaist) - 60;
      this.showFloatingText(pos.cx, floatY, `+${res.amount} ${emoji}`);
      this.playRingBurst(pos.cx, pos.dBot, pos.halfW, pos.depth, 0xffffff);
    }
    this.collectorOverlay?.updateAll();
  }

  // ── Obstacle Rendering ──────────────────────────────────────────────────

  private obstacleSprites = new Map<string, Phaser.GameObjects.Image>();
  private obstacleOverlays = new Map<string, Phaser.GameObjects.Container>();

  private refreshObstacles(): void {
    const store = useGameState.getState();

    // Clear old sprites
    this.obstacleSprites.forEach((s) => s.destroy());
    this.obstacleSprites.clear();

    store.obstacles.forEach((obs) => {
      const pos = this.slotPos.get(obs.slotIndex);
      if (!pos) return;

      const key = obs.type === "tree" ? "tree_new" : "rock_new";
      const sprite = this.add
        .image(pos.cx, pos.dBot, key)
        .setOrigin(0.5, 1) // Bottom-center anchored
        .setDepth(pos.depth + 5)
        .setInteractive({ useHandCursor: true });

      sprite.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        pointer.event.stopPropagation();
        this.handleObstacleClick(obs.id);
      });

      this.obstacleSprites.set(obs.id, sprite);
    });
  }

  private handleObstacleClick(obstacleId: string): void {
    const store = useGameState.getState();
    const obstacle = store.obstacles.find((o) => o.id === obstacleId);
    if (!obstacle || obstacle.clearing) return;

    const { busy, total } = store.getBuilderCount();
    if (busy >= total) {
      this.showToast("All builders are busy!");
      return;
    }

    // Assign builder
    store.startClearingObstacle(obstacleId);
    this.showToast(`Clearing ${obstacle.type}...`);
  }

  private updateObstacleOverlays(): void {
    const store = useGameState.getState();
    const now = Date.now();

    store.obstacles.forEach((obs) => {
      if (!obs.clearing || !obs.clearingFinishesAt) {
        this.removeObstacleOverlay(obs.id);
        return;
      }

      if (now >= obs.clearingFinishesAt) {
        store.completeClearingObstacle(obs.id);
        this.removeObstacleOverlay(obs.id);
        this.showToast("Obstacle cleared! 💎");
        return;
      }

      // Render or update overlay
      let container = this.obstacleOverlays.get(obs.id);
      if (!container) {
        container = this.createObstacleOverlay(obs);
        this.obstacleOverlays.set(obs.id, container);
      }

      const remaining = (obs.clearingFinishesAt - now) / 1000;
      const duration = obs.type === "tree" ? 10 : 20;
      const progress = 1 - remaining / duration;

      // Update progress bar
      const bar = container.getByName("bar") as Phaser.GameObjects.Graphics;
      const label = container.getByName("label") as Phaser.GameObjects.Text;
      const gemBtn = container.getByName(
        "gemBtn",
      ) as Phaser.GameObjects.Container;
      const gemText = gemBtn?.getByName("gemText") as Phaser.GameObjects.Text;

      bar.clear();
      bar.fillStyle(0x000000, 0.5);
      bar.fillRect(-50, -8, 100, 16);
      bar.fillStyle(0x44ff44, 1);
      bar.fillRect(-50, -8, 100 * progress, 16);

      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      label.setText(`${mins}:${secs.toString().padStart(2, "0")}`);

      if (gemBtn && gemText) {
        const gemCost = Math.ceil(remaining / 5);
        gemText.setText(`${gemCost} 💎`);
      }
    });
  }

  private createObstacleOverlay(obs: Obstacle): Phaser.GameObjects.Container {
    const pos = this.slotPos.get(obs.slotIndex);
    const cx = pos?.cx ?? 0;
    const cy = pos?.dBot ?? 0;
    const depth = (pos?.depth ?? 0) + 20;

    const container = this.add.container(cx, cy - 40).setDepth(depth);

    const bar = this.scene.systems.displayList.add(
      this.add.graphics(),
    ) as Phaser.GameObjects.Graphics;
    bar.setName("bar");
    container.add(bar);

    const label = this.add
      .text(0, -32, "", {
        fontSize: "32px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);
    label.setName("label");
    container.add(label);

    // Gem Finish Button
    const gemBtn = this.add.container(0, 36).setName("gemBtn");
    const gemBg = this.add.graphics();
    gemBg.fillStyle(0x44aa44, 1);
    gemBg.fillRoundedRect(-50, -20, 100, 40, 10);
    gemBtn.add(gemBg);

    const gemText = this.add
      .text(0, 0, "", {
        fontSize: "28px",
        fontFamily: "Arial",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setName("gemText");
    gemBtn.add(gemText);

    const gemHit = this.add
      .zone(0, 0, 120, 50)
      .setInteractive({ useHandCursor: true });
    gemBtn.add(gemHit);
    gemHit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      useGameState.getState().finishObstacleInstantly(obs.id);
    });

    container.add(gemBtn);
    return container;
  }

  private removeObstacleOverlay(id: string): void {
    const container = this.obstacleOverlays.get(id);
    if (container) {
      container.destroy();
      this.obstacleOverlays.delete(id);
    }
  }

  // Helper: is this col/row on the defense perimeter ring?
  private isDefenseRingTile(col: number, row: number): boolean {
    return (
      col >= DMIN &&
      col <= DMAX &&
      row >= DMIN &&
      row <= DMAX &&
      (col === DMIN || col === DMAX || row === DMIN || row === DMAX)
    );
  }

  // Helper to check if input should be ignored due to open UI
  private isInputBlocked(): boolean {
    const uiState = useUIStore.getState();
    return (
      this.panelOpen ||
      uiState.gemStoreOpen ||
      uiState.buildPanelOpen ||
      uiState.upgradePanelOpen
    );
  }

  // Handle tile click from GridRenderer
  private handleTileClick(col: number, row: number): void {
    if (this.isInputBlocked()) return;

    // Clash-Style: If we are in placement mode, tapping a tile should move the ghost.
    // This also prevents opening the build panel accidentally.
    if (this.isPlacing) {
      this.placementCol = col;
      this.placementRow = row;
      this.updateGhostVisuals();
      return;
    }

    this.openPanel(col, row);
  }

  // Called for any tile click
  private openPanel(col: number, row: number): void {
    const store = useGameState.getState();

    // Check if any building spans this tile (for multi-tile buildings)
    let exists = store.buildings.find(
      (b) => b.slotIndex === encodeSlot(col, row),
    );

    // If no building at this exact slot, check if it's part of a multi-tile building
    if (!exists) {
      for (const b of store.buildings) {
        const cfg = BUILDINGS[b.type];
        const footprint = cfg?.footprint ?? { w: 1, h: 1 };
        const { col: bCol, row: bRow } = decodeSlot(b.slotIndex);

        // Check if this tile is within the building's footprint
        if (
          col >= bCol &&
          col < bCol + footprint.w &&
          row >= bRow &&
          row < bRow + footprint.h
        ) {
          exists = b;
          break;
        }
      }
    }

    // If panel is already open and we're clicking a different building, close and reopen
    if (this.panelOpen && exists) {
      this.closePanel();
    }

    if (!exists) {
      // Check for obstacles first
      const obstacle = store.obstacles.find(
        (o) => o.slotIndex === encodeSlot(col, row),
      );
      if (obstacle) {
        this.handleObstacleClick(obstacle.id);
        return;
      }

      // Empty tile - open build panel if in buildable area
      if (col >= BMIN && col <= BMAX && row >= BMIN && row <= BMAX) {
        useUIStore.getState().openBuildPanel(col, row);
      }
      return;
    }

    console.log(`[openPanel] col=${col}, row=${row}, exists=${!!exists}`);

    if (exists) {
      // Harvest logic: if the building has collected resources, clicking harvests them instead of opening panel
      if (exists.collectedAmount && exists.collectedAmount > 0) {
        const res = store.collectFromBuilding(exists.id);
        if (res) {
          store.save();
          // Dispatch tutorial event
          window.dispatchEvent(new CustomEvent(TUTORIAL_RESOURCE_COLLECTED));

          // Floating text for harvest
          let emoji = "📦";
          if (res.resource === "wood") emoji = "🪵";
          if (res.resource === "clay") emoji = "🧱";
          if (res.resource === "iron") emoji = "⛏️";
          if (res.resource === "crop") emoji = "🌾";

          const posStr = this.slotPos.get(exists.slotIndex);
          if (posStr) {
            const floatY = posStr.dWaist - (posStr.dBot - posStr.dWaist) - 40;
            const text = this.add
              .text(posStr.cx, floatY, `+${res.amount} ${emoji}`, {
                fontSize: "120px",
                fontFamily: "Lilita One, Arial",
                color: "#ffffff",
                stroke: "#000000",
                strokeThickness: 12,
                shadow: {
                  offsetX: 0,
                  offsetY: 4,
                  color: "#000000",
                  blur: 4,
                  stroke: true,
                  fill: true,
                },
              })
              .setOrigin(0.5)
              .setDepth(posStr.depth + 100);

            // Float UP and fade OUT
            this.tweens.add({
              targets: text,
              y: floatY - 120,
              alpha: 0,
              duration: 1200,
              ease: "Cubic.easeOut",
              onComplete: () => text.destroy(),
            });

            // "Pop" pulse effect
            this.tweens.add({
              targets: text,
              scaleX: 1.2,
              scaleY: 1.2,
              duration: 100,
              yoyo: true,
              ease: "Quad.easeOut",
            });
          }
          return; // Don't open panel on harvest
        }
      }

      if (exists.type === "laboratory") {
        useUIStore.getState().closeBuildPanel();
        this.openLaboratoryPanel(col, row, exists);
      } else if (exists.type === "wall" || exists.type === "tower") {
        // Defense items are tied to TH; do not show upgrade/info panel
        return;
      } else {
        useUIStore.getState().closeBuildPanel();
        // Open React upgrade panel instead
        const uiStore = useUIStore.getState();
        uiStore.openUpgradePanel(exists.id, col, row);
      }
    } else if (this.isDefenseRingTile(col, row)) {
      // Do nothing for empty defense tiles
      return;
    } else if (col >= BMIN && col <= BMAX && row >= BMIN && row <= BMAX) {
      const uiStore = useUIStore.getState();
      uiStore.openBuildPanel(col, row);
    }
    // else: water tile — do nothing
  }

  // ── Build-menu panel (empty tile) — LEFT side slide-in card list ─────────────
  // DEPRECATED: Use buildPanel.open instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _openBuildMenu(col: number, row: number): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    // Panel on the LEFT side of screen (where water background is)
    const pw = Math.min(260, sw * 0.42);
    const ph = sh - 80;
    const px = 0;
    const py = 44;

    // Panel background
    const bg = this.add.graphics();
    bg.fillStyle(0x0d1b2a, 0.96);
    bg.fillRoundedRect(0, 0, pw, ph, { tr: 14, br: 14, tl: 0, bl: 0 });
    bg.lineStyle(2, 0xd4af37, 0.7);
    bg.strokeRoundedRect(0, 0, pw, ph, { tr: 14, br: 14, tl: 0, bl: 0 });
    this.panel.add(bg);

    // Header
    this.panel.add(
      this.add
        .text(pw / 2, 18, "⚒  Build", {
          fontSize: "17px",
          fontFamily: "Arial",
          color: "#D4AF37",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5),
    );
    // Zone label
    this.panel.add(
      this.add
        .text(pw / 2, 36, "🟩 Inner Village Tile", {
          fontSize: "10px",
          fontFamily: "Arial",
          color: "#88dd88",
        })
        .setOrigin(0.5),
    );

    const closeBtn = this.add
      .text(pw - 10, 10, "✕", {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#888",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.closePanel());
    this.panel.add(closeBtn);

    const store = useGameState.getState();
    const { resources } = store;

    // Card list — 2 columns
    const cols = 2;
    const cardW = Math.floor((pw - 24) / cols);
    const cardH = 110;
    const startY = 54;

    PLACEABLE.forEach((type, idx) => {
      const ci = idx % cols;
      const ri = Math.floor(idx / cols);
      const bx = 8 + ci * cardW;
      const by = startY + ri * (cardH + 6);

      const cfg = BUILDINGS[type];
      const cost = getBuildingCost(type, 1);
      const { allowed, reason } = store.canBuild(type as any);
      const canAfford =
        resources.wood >= cost.wood &&
        resources.clay >= cost.clay &&
        resources.iron >= cost.iron &&
        resources.crop >= cost.crop;
      const count = store.getBuildingCount(type as any);
      const thLvl = store.getTownHallLevel();
      const maxCount = getMaxCount(type, thLvl);
      const isClickable =
        allowed && canAfford && !(maxCount !== -1 && count >= maxCount);

      // Card background
      const card = this.add.graphics();
      const drawCard = (lit: boolean) => {
        card.clear();
        const fill = !allowed
          ? 0x1a0a0a
          : isClickable
            ? lit
              ? 0x1e4a1e
              : 0x0f2a18
            : 0x111828;
        const border = !allowed
          ? 0x441111
          : isClickable
            ? lit
              ? 0x55ff88
              : 0x2a6640
            : 0x334455;
        card.fillStyle(fill, 0.95);
        card.fillRoundedRect(bx, by, cardW - 4, cardH, 8);
        card.lineStyle(isClickable && lit ? 2 : 1, border, 1);
        card.strokeRoundedRect(bx, by, cardW - 4, cardH, 8);
      };
      drawCard(false);
      this.panel.add(card);

      // Building icon (frame 0 = idle frame from spritesheet)
      const imgKey = `${type}-l1`;
      const iconSize = 44;
      if (this.textures.exists(imgKey)) {
        const img = this.add
          .image(bx + (cardW - 4) / 2, by + 26, imgKey, 0)
          .setDisplaySize(iconSize, iconSize)
          .setOrigin(0.5);
        img.setAlpha(!allowed ? 0.35 : isClickable ? 1 : 0.5);
        this.panel.add(img);
      } else {
        // Emoji fallback
        const emojis: Record<string, string> = {
          farm: "🌾",
          "lumber-mill": "🪵",
          quarry: "⛏",
          "iron-mine": "⚙",
          barracks: "⚔",
          warehouse: "📦",
          house: "🏠",
        };
        this.panel.add(
          this.add
            .text(bx + (cardW - 4) / 2, by + 26, emojis[type] ?? "?", {
              fontSize: "28px",
            })
            .setOrigin(0.5),
        );
      }

      // Lock icon
      if (!allowed) {
        this.panel.add(
          this.add
            .text(bx + (cardW - 4) / 2, by + 8, "🔒", {
              fontSize: "12px",
            })
            .setOrigin(0.5),
        );
      }

      // Name
      this.panel.add(
        this.add
          .text(bx + (cardW - 4) / 2, by + 52, cfg.name, {
            fontSize: "9px",
            fontFamily: "Arial",
            color: isClickable ? "#ffffff" : "#666",
            wordWrap: { width: cardW - 8 },
            align: "center",
          })
          .setOrigin(0.5),
      );

      // Cost with icons
      if (allowed && !(maxCount !== -1 && count >= maxCount)) {
        const costStr = `🪵${cost.wood} 🧱${cost.clay}`;
        const costStr2 = `⛏${cost.iron} 🌾${cost.crop}`;
        this.panel.add(
          this.add
            .text(bx + (cardW - 4) / 2, by + 66, costStr, {
              fontSize: "9px",
              fontFamily: "Arial",
              color: canAfford ? "#aaffaa" : "#ff6666",
              align: "center",
            })
            .setOrigin(0.5),
        );
        this.panel.add(
          this.add
            .text(bx + (cardW - 4) / 2, by + 79, costStr2, {
              fontSize: "9px",
              fontFamily: "Arial",
              color: canAfford ? "#aaffaa" : "#ff6666",
              align: "center",
            })
            .setOrigin(0.5),
        );
      } else if (!allowed) {
        this.panel.add(
          this.add
            .text(bx + (cardW - 4) / 2, by + 72, reason ?? "Locked", {
              fontSize: "8px",
              fontFamily: "Arial",
              color: "#ff6666",
              wordWrap: { width: cardW - 8 },
              align: "center",
            })
            .setOrigin(0.5),
        );
      } else {
        const countColor = "#ff6666";
        // Show "3/3 at TH2" style label
        const nextUnlock = Object.keys(cfg.maxCountByTH)
          .map(Number)
          .sort((a, b) => a - b)
          .find((k) => k > thLvl);
        const upgradeHint = nextUnlock
          ? ` (TH${nextUnlock}: ${cfg.maxCountByTH[nextUnlock]})`
          : "";
        this.panel.add(
          this.add
            .text(
              bx + (cardW - 4) / 2,
              by + 72,
              `${count}/${maxCount}${upgradeHint}`,
              {
                fontSize: "8px",
                fontFamily: "Arial",
                color: countColor,
                align: "center",
              },
            )
            .setOrigin(0.5),
        );
      }

      // Count badge
      if (count > 0) {
        const badge = this.add.graphics();
        badge.fillStyle(0x333366, 0.9);
        badge.fillRoundedRect(bx + cardW - 22, by + 2, 18, 14, 4);
        this.panel.add(badge);
        this.panel.add(
          this.add
            .text(bx + cardW - 13, by + 9, `${count}`, {
              fontSize: "9px",
              fontFamily: "Arial",
              color: "#aaddff",
            })
            .setOrigin(0.5),
        );
      }

      // Hit zone
      if (isClickable) {
        const zone = this.add
          .zone(bx, by, cardW - 4, cardH)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => drawCard(true));
        zone.on("pointerout", () => drawCard(false));
        zone.on("pointerdown", () => this.handleBuild(col, row, type));
        this.panel.add(zone);
      }
    });

    // First-time hint arrow
    const hint = this.add
      .text(pw / 2, ph - 20, "👆 Tap a building to place it", {
        fontSize: "9px",
        fontFamily: "Arial",
        color: "#888",
      })
      .setOrigin(0.5);
    this.panel.add(hint);

    this.panel.setPosition(px, py).setVisible(true);
    this.panelOpen = true;
  }

  // Removed: Defense build menu (walls & towers now auto-placed based on Town Hall)

  // Kept for barracks training - can be called manually if needed
  // @ts-ignore
  private openInfoPanel(col: number, row: number, existing: Building): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const store = useGameState.getState();
    const type = existing.type as string;
    const cfg = BUILDINGS[type];
    if (!cfg) return;
    const lvl = existing.level,
      isMax = lvl >= cfg.maxLevel;
    const pw = Math.min(300, sw * 0.48);
    const ph = Math.min(400, sh - 60);
    const px = 0;
    const py = 44;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1b2a, 0.97);
    bg.fillRoundedRect(0, 0, pw, ph, 10);
    bg.lineStyle(2, 0xd4af37, 0.8);
    bg.strokeRoundedRect(0, 0, pw, ph, 10);
    this.panel.add(bg);

    const closeBtn = this.add
      .text(pw - 12, 12, "✕", {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#888",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.closePanel());
    this.panel.add(closeBtn);

    // Preview image
    const previewKey = `${type}-l${lvl}`;
    if (this.textures.exists(previewKey))
      this.panel.add(
        this.add
          .image(pw - 52, ph / 2 - 30, previewKey)
          .setDisplaySize(72, 72)
          .setOrigin(0.5),
      );

    const tw = pw - 100;
    const stars = "★".repeat(lvl) + "☆".repeat(cfg.maxLevel - lvl);
    this.panel.add([
      this.add.text(16, 14, cfg.name, {
        fontSize: "20px",
        fontFamily: "Arial",
        color: "#D4AF37",
        wordWrap: { width: tw },
      }),
      this.add.text(16, 40, stars, {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#FFD700",
      }),
      this.add.text(16, 62, cfg.description, {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#aaa",
        wordWrap: { width: tw },
      }),
    ]);

    const div = this.add.graphics();
    div.lineStyle(1, 0xd4af37, 0.25);
    div.lineBetween(16, 92, pw - 16, 92);
    this.panel.add(div);

    if (cfg.production) {
      const pp: string[] = [];
      if (cfg.production.wood) pp.push(`+${cfg.production.wood} Wood/s`);
      if (cfg.production.clay) pp.push(`+${cfg.production.clay} Clay/s`);
      if (cfg.production.iron) pp.push(`+${cfg.production.iron} Iron/s`);
      if (cfg.production.crop) pp.push(`+${cfg.production.crop} Crop/s`);
      this.panel.add(
        this.add.text(16, 98, pp.join("   "), {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#88ff88",
        }),
      );
    }

    if (!isMax) {
      const nextLvl = lvl + 1;
      const cost = getBuildingCost(type, nextLvl);
      const { resources } = store;

      const thLvl = store.getTownHallLevel();
      const needsTHUpgrade = nextLvl > thLvl && type !== "town-hall";

      const hasResources =
        resources.wood >= cost.wood &&
        resources.clay >= cost.clay &&
        resources.iron >= cost.iron &&
        resources.crop >= cost.crop;

      const can = hasResources && !needsTHUpgrade;

      let lbl = `Upgrade → Lv${nextLvl}`;
      if (needsTHUpgrade) {
        lbl = `Req. Town Hall Lv${nextLvl}`;
      } else if (!hasResources) {
        lbl = `${lbl} (need more)`;
      }

      // Cost row
      const costParts = [
        { k: "wood", v: cost.wood, have: resources.wood },
        { k: "clay", v: cost.clay, have: resources.clay },
        { k: "iron", v: cost.iron, have: resources.iron },
        { k: "crop", v: cost.crop, have: resources.crop },
      ];
      const RESOURCE_ICON_KEYS: Record<string, string> = {
        wood: "resource-wood",
        clay: "resource-clay",
        iron: "resource-iron",
        crop: "resource-crop",
      };
      const cspacing = (pw - 32) / 4;
      costParts.forEach((c, i) => {
        const ix = 16 + i * cspacing;
        const ik = RESOURCE_ICON_KEYS[c.k];
        if (this.textures.exists(ik))
          this.panel.add(
            this.add
              .image(ix + 10, 128, ik)
              .setDisplaySize(18, 18)
              .setOrigin(0.5),
          );
        this.panel.add(
          this.add
            .text(ix + 22, 128, `${c.v}`, {
              fontSize: "13px",
              fontFamily: "Arial",
              color: c.have >= c.v ? "#fff" : "#ff6666",
            })
            .setOrigin(0, 0.5),
        );
      });

      const bW = 180,
        bH = 36,
        bx = pw / 2 - bW / 2,
        by = ph - bH - 16;
      const bbg = this.add.graphics();
      const draw = (lit: boolean) => {
        bbg.clear();
        if (needsTHUpgrade) {
          bbg.fillStyle(0x444444, 0.8);
          bbg.fillRoundedRect(bx, by, bW, bH, 7);
          bbg.lineStyle(2, 0x666666, 0.8);
        } else {
          bbg.fillStyle(lit ? 0x3d8a3d : 0x2d6a2d, can ? 1 : 0.4);
          bbg.fillRoundedRect(bx, by, bW, bH, 7);
          bbg.lineStyle(2, lit ? 0x88ff88 : 0x44ff44, can ? 1 : 0.2);
        }
        bbg.strokeRoundedRect(bx, by, bW, bH, 7);
      };
      draw(false);
      this.panel.add(bbg);
      this.panel.add(
        this.add
          .text(
            pw / 2,
            by + bH / 2,
            needsTHUpgrade ? `🔒 ${lbl}` : `⚒ ${lbl}`,
            {
              fontSize: "13px",
              fontFamily: "Arial",
              color: can ? "#fff" : needsTHUpgrade ? "#ffcc44" : "#888",
              fontStyle: needsTHUpgrade ? "bold" : "normal",
            },
          )
          .setOrigin(0.5),
      );

      if (can) {
        const zone = this.add
          .zone(bx, by, bW, bH)
          .setOrigin(0, 0)
          .setInteractive({ useHandCursor: true });
        zone.on("pointerover", () => draw(true));
        zone.on("pointerout", () => draw(false));
        zone.on("pointerdown", () =>
          this.handleUpgrade(col, row, existing.id, nextLvl, cost),
        );
        this.panel.add(zone);
      }
    } else {
      this.panel.add(
        this.add
          .text(pw / 2, ph - 36, "✦ Max Level ✦", {
            fontSize: "14px",
            fontFamily: "Arial",
            color: "#D4AF37",
          })
          .setOrigin(0.5),
      );
    }

    // Sell button (not for Town Hall) - always at bottom of panel
    if (type !== "town-hall") {
      const sellY = ph - 40;
      const sellBg = this.add.graphics();
      sellBg.fillStyle(0x8b0000, 1);
      sellBg.fillRoundedRect(pw / 2 - 60, sellY, 120, 28, 6);
      this.panel.add(sellBg);

      this.panel.add(
        this.add
          .text(pw / 2, sellY + 14, "💰 SELL", {
            fontSize: "13px",
            fontFamily: "Arial",
            color: "#fff",
          })
          .setOrigin(0.5),
      );

      const sellZone = this.add
        .zone(pw / 2 - 60, sellY, 120, 28)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      sellZone.on("pointerdown", () => {
        const result = store.sellBuilding(existing.id);
        if (result.success) {
          this.showToast(`Sold for ${result.refund} wood`);
          this.closePanel();
          // this.resourceHUD.refresh(); // Removed
          store.save();

          // Destroy animation for the building (all tiles it occupies)
          const cfg = BUILDINGS[existing.type];
          const footprint = cfg?.footprint ?? { w: 1, h: 1 };
          for (let dc = 0; dc < footprint.w; dc++) {
            for (let dr = 0; dr < footprint.h; dr++) {
              const tileSlot = encodeSlot(col + dc, row + dr);
              const spr = this.slotSprite.get(tileSlot);
              if (spr) {
                this.tweens.add({
                  targets: spr,
                  alpha: 0,
                  scaleX: 0,
                  scaleY: 0,
                  duration: 300,
                  onComplete: () => spr.destroy(),
                });
              }
            }
          }
        } else {
          this.showToast(result.reason || "Cannot sell");
        }
      });
      this.panel.add(sellZone);
    }

    // Barracks: append training panel below
    if (type === "barracks") {
      this.appendTrainingPanel(pw, ph);
    }
    this.panel.setPosition(px, py).setVisible(true);
    this.panelOpen = true;
  }

  // ── Laboratory Panel (Research) ──────────────────────────────────────────────
  private openLaboratoryPanel(
    _col: number,
    _row: number,
    existing: Building,
  ): void {
    const sw = this.scale.width;
    const sh = this.scale.height;
    const store = useGameState.getState();
    const pw = Math.min(280, sw * 0.45);
    const ph = Math.min(400, sh - 80);
    const px = 0;
    const py = 44;

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1b2a, 0.97);
    bg.fillRoundedRect(0, 0, pw, ph, 10);
    bg.lineStyle(2, 0xd4af37, 0.8);
    bg.strokeRoundedRect(0, 0, pw, ph, 10);
    this.panel.add(bg);

    const closeBtn = this.add
      .text(pw - 12, 12, "✕", {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#888",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on("pointerdown", () => this.closePanel());
    this.panel.add(closeBtn);

    // Header
    this.panel.add([
      this.add.text(16, 14, "Laboratory", {
        fontSize: "20px",
        fontFamily: "Arial",
        color: "#D4AF37",
        stroke: "#000",
        strokeThickness: 2,
      }),
      this.add.text(16, 38, "Upgrade your troops for battle!", {
        fontSize: "12px",
        fontFamily: "Arial",
        color: "#aaa",
      }),
    ]);

    const div = this.add.graphics();
    div.lineStyle(1, 0xd4af37, 0.25);
    div.lineBetween(16, 60, pw - 16, 60);
    this.panel.add(div);

    // Research options
    // getUnitTrainingCost is imported at the top of the file
    const unitsList = ["militia", "swordsman", "archer", "cavalry"];

    let currentY = 70;
    const cardH = 64;

    unitsList.forEach((unitId, _idx) => {
      const currentLevel = store.unitLevels[unitId as UnitType] ?? 1;
      const isMax = currentLevel >= 3;
      const isResearchingThis = store.activeResearch?.unitType === unitId;
      const isResearchingOther =
        store.activeResearch !== null && !isResearchingThis;

      const card = this.add.graphics();
      card.fillStyle(0x1a2a3a, 0.9);
      card.fillRoundedRect(16, currentY, pw - 32, cardH, 6);
      card.lineStyle(1, isResearchingThis ? 0x66ff88 : 0x334466);
      card.strokeRoundedRect(16, currentY, pw - 32, cardH, 6);
      this.panel.add(card);

      const uName = unitId.charAt(0).toUpperCase() + unitId.slice(1);

      // Icon
      const iconKey = `unit-${unitId}`;
      if (this.textures.exists(iconKey)) {
        this.panel.add(
          this.add
            .image(40, currentY + cardH / 2, iconKey)
            .setDisplaySize(32, 32)
            .setOrigin(0.5),
        );
      } else {
        const emojis: Record<string, string> = {
          militia: "🛡️",
          swordsman: "⚔️",
          archer: "🏹",
          cavalry: "🐴",
        };
        this.panel.add(
          this.add
            .text(40, currentY + cardH / 2, emojis[unitId] ?? "🗡️", {
              fontSize: "24px",
            })
            .setOrigin(0.5),
        );
      }

      // Title & Level
      this.panel.add([
        this.add.text(64, currentY + 8, `${uName}`, {
          fontSize: "14px",
          color: "#ddd",
          fontStyle: "bold",
        }),
        this.add
          .text(pw - 24, currentY + 8, `Lv ${currentLevel}`, {
            fontSize: "12px",
            color: "#FFD700",
          })
          .setOrigin(1, 0),
      ]);

      if (isResearchingThis) {
        // Show progress bar
        const totalTime = (currentLevel + 1) * 10000;
        const timeRemaining = Math.max(
          0,
          store.activeResearch!.finishesAt - Date.now(),
        );
        const pct = 1 - timeRemaining / totalTime;

        const pBarBg = this.add.graphics();
        pBarBg.fillStyle(0x222222, 1);
        pBarBg.fillRoundedRect(64, currentY + 32, pw - 88, 12, 4);
        this.panel.add(pBarBg);

        const pBar = this.add.graphics();
        pBar.fillStyle(0x66ff88, 1);
        pBar.fillRoundedRect(64, currentY + 32, (pw - 88) * pct, 12, 4);
        this.panel.add(pBar);

        this.panel.add(
          this.add
            .text(
              64 + (pw - 88) / 2,
              currentY + 38,
              `${Math.ceil(timeRemaining / 1000)}s`,
              {
                fontSize: "9px",
                color: "#000",
                fontStyle: "bold",
              },
            )
            .setOrigin(0.5),
        );
      } else if (isMax) {
        this.panel.add(
          this.add.text(64, currentY + 30, "MAX LEVEL", {
            fontSize: "12px",
            color: "#66aa66",
          }),
        );
      } else {
        // Cost
        const nextTierCost = getUnitTrainingCost(unitId, currentLevel + 1);
        const costStr = `W:${nextTierCost.wood * 5} C:${nextTierCost.clay * 4} I:${nextTierCost.iron * 5} F:${nextTierCost.crop * 2}`;

        const canAfford =
          store.resources.wood >= nextTierCost.wood * 5 &&
          store.resources.clay >= nextTierCost.clay * 4 &&
          store.resources.iron >= nextTierCost.iron * 5 &&
          store.resources.crop >= nextTierCost.crop * 2;

        this.panel.add(
          this.add.text(64, currentY + 26, costStr, {
            fontSize: "10px",
            color: canAfford ? "#aaa" : "#ff6666",
          }),
        );

        // Upgrade button
        const btnBg = this.add.graphics();
        const canResearch =
          canAfford && !isResearchingOther && !existing.underConstruction;
        btnBg.fillStyle(canResearch ? 0x2e8b57 : 0x444444, 1);
        btnBg.fillRoundedRect(64, currentY + 42, 80, 16, 4);
        this.panel.add(btnBg);

        this.panel.add(
          this.add
            .text(64 + 40, currentY + 50, "RESEARCH", {
              fontSize: "9px",
              color: canResearch ? "#fff" : "#888",
              fontStyle: "bold",
            })
            .setOrigin(0.5),
        );

        if (canResearch) {
          const zone = this.add
            .zone(64, currentY + 42, 80, 16)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true });
          zone.on("pointerdown", () => {
            const { allowed, reason } = store.startResearch(unitId as UnitType);
            if (!allowed) {
              this.showToast(reason || "Can't research");
            } else {
              this.showToast("Research started!");
              // this.resourceHUD.refresh(); // Removed
            }
          });
          this.panel.add(zone);
        }
      }

      currentY += cardH + 10;
    });

    this.panel.setPosition(px, py).setVisible(true);
    this.panelOpen = true;
  }

  // ── Build / Upgrade handlers ──────────────────────────────────────────────────
  private handleBuild(col: number, row: number, type: PlaceableType): void {
    const store = useGameState.getState();

    // TH level + count + builder gate
    const { allowed, reason: buildGateReason } = store.canBuild(type as any);
    if (!allowed) {
      this.showToast(buildGateReason ?? "Cannot build here");
      return;
    }

    const cost = getBuildingCost(type, 1);
    if (!store.consumeResources(cost)) {
      PhaserSoundBridge.play(this, 'not_enough_resources');
      this.showToast("Not enough resources!");
      return;
    }

    // Play building place sound
    PhaserSoundBridge.play(this, 'building_place');

    // ── MULTI-TILE PLACEMENT VALIDATION ──────────────────────────────────────
    const cfg = BUILDINGS[type];
    const footprint = cfg.footprint ?? { w: 1, h: 1 };

    // Validate placement using occupied grid system
    // The clicked tile (col, row) becomes the TOP-LEFT anchor of the footprint
    const placementCheck = canPlace(row, col, footprint, store.buildings);

    if (!placementCheck.canPlace) {
      // Show visual error feedback (red flash on footprint tiles)
      this.showPlacementError(row, col, footprint);
      this.showToast(placementCheck.reason ?? "Cannot place here");
      // Refund resources since validation failed
      store.addResources(cost);
      return;
    }

    const slot = encodeSlot(col, row);
    const buildingId = crypto.randomUUID();
    store.addBuilding({
      id: buildingId,
      type,
      level: 1,
      slotIndex: slot,
    });
    store.save();
    // this.resourceHUD.refresh(); // Removed

    // Notify tutorial system that a building has been placed
    window.dispatchEvent(
      new CustomEvent(TUTORIAL_BUILDING_PLACED, {
        detail: { buildingId, type },
      }),
    );

    this.closePanel();

    // Swap tile base from forest to grass when building is placed
    const base = this.tileBases.get(slot);
    if (base && base.texture.key !== "grass") {
      const pos = this.slotPos.get(slot);
      if (pos) {
        const { cx, dWaist, halfW, dBot, depth } = pos;
        const dTop = dWaist - (dBot - dWaist);
        const overlap = 6;
        base.setTexture("grass");
        base.setOrigin(0.5, 0.5);
        base.setPosition(cx, dWaist);
        base.setDisplaySize(halfW * 2 + overlap, dBot - dTop + overlap);
        base.setDepth(depth);
        this.playRingBurst(cx, dBot, halfW, depth, 0x00ff00);
      } else {
        base.setTexture("grass");
      }
    }

    // Show construction overlay — building finishes after level-1 build time
    const buildTime = getLevelBuildTimeMs(type, 1);
    // Show construction-site sprite immediately
    this.buildingRenderer.animateBuilding(col, row, "construction-site", false);

    // Completion logic (shared between timer and gem button)
    const completeBuild = () => {
      delayTimer?.remove();
      store.completeConstruction(buildingId);
      store.checkObjectives();
      store.save();

      // Play building complete sound
      PhaserSoundBridge.play(this, 'building_complete');

      this.buildingRenderer.removeConstructionOverlay(slot);
      const constrSpr = this.slotSprite.get(slot);
      if (constrSpr) {
        this.tweens.add({
          targets: constrSpr,
          alpha: 0,
          duration: 150,
          onComplete: () => {
            constrSpr.destroy();
            this.buildingRenderer.animateBuilding(
              col,
              row,
              `${type}-l1`,
              false,
            );
            this.buildingRenderer.addLevelBadge(col, row, 1);
          },
        });
      } else {
        this.buildingRenderer.animateBuilding(col, row, `${type}-l1`, false);
        this.buildingRenderer.addLevelBadge(col, row, 1);
      }
      this.showToast(`🏗 ${cfg?.name ?? type} built!`);
      this.syncCollectorTimers();
    };

    this.buildingRenderer.addConstructionOverlay(
      col,
      row,
      slot,
      buildingId,
      buildTime,
      false,
      () => completeBuild(),
    );

    // After timer: swap in real sprite
    const delayTimer = this.time.delayedCall(buildTime, completeBuild);
  }

  /**
   * Show visual feedback for invalid placement
   * Flashes the footprint tiles red briefly
   */
  private showPlacementError(
    anchorRow: number,
    anchorCol: number,
    footprint: { w: number; h: number },
  ): void {
    const cells = getFootprintCells(anchorRow, anchorCol, footprint);
    const graphics = this.add.graphics().setDepth(1001);

    // Draw red highlight on each footprint cell
    cells.forEach((cell) => {
      const pos = this.gridRenderer.getTilePosition(cell.col, cell.row);
      const diamond = [
        { x: pos.cx, y: pos.dTop },
        { x: pos.cx + pos.halfW, y: pos.dWaist },
        { x: pos.cx, y: pos.dBot },
        { x: pos.cx - pos.halfW, y: pos.dWaist },
      ];

      graphics.fillStyle(0xff0000, 0.5);
      graphics.fillPoints(diamond, true);
      graphics.lineStyle(2, 0xff4444, 0.8);
      graphics.strokePoints(diamond, true);
    });

    // Fade out and destroy
    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 600,
      onComplete: () => graphics.destroy(),
    });
  }

  private showToast(msg: string): void {
    const { width, height } = this.cameras.main;
    const toast = this.add
      .text(width / 2, height / 2 - 80, msg, {
        fontSize: "15px",
        fontFamily: "Arial",
        color: "#ff9966",
        backgroundColor: "#000000cc",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setDepth(600);
    this.tweens.add({
      targets: toast,
      y: toast.y - 30,
      alpha: 0,
      duration: 1800,
      onComplete: () => toast.destroy(),
    });
  }

  private handleUpgrade(
    col: number,
    row: number,
    existingId: string,
    nextLevel: number,
    cost: { wood: number; clay: number; iron: number; crop: number },
  ): void {
    const store = useGameState.getState();

    // Check builder availability
    const { busy, total } = store.getBuilderCount();
    if (busy >= total) {
      this.showToast("All builders are busy!");
      return;
    }

    if (!store.consumeResources(cost)) {
      PhaserSoundBridge.play(this, 'not_enough_resources');
      this.showToast("Not enough resources!");
      return;
    }

    // Play upgrade start sound
    PhaserSoundBridge.play(this, 'upgrade_start');

    const bldg = store.buildings.find((b) => b.id === existingId);
    const bType = bldg?.type ?? "";
    // Use per-level build time from gameConfig (not the flat cfg.buildTime)
    const buildTime = getLevelBuildTimeMs(bType, nextLevel);

    store.upgradeBuilding(existingId);

    // Verify the store accepted the upgrade (e.g. TH level check passed)
    const storeAfter = useGameState.getState();
    const bldrAfter = storeAfter.buildings.find((b) => b.id === existingId);
    if (!bldrAfter?.underConstruction) {
      storeAfter.addResources(cost); // Refund
      this.showToast("Cannot upgrade: Town Hall too low!");
      return;
    }

    storeAfter.save();
    // this.resourceHUD.refresh(); // Removed
    this.closePanel();

    const slot = encodeSlot(col, row);

    // Smooth transition: fade out old building, fade in construction site
    this.transitionToConstructionSite(
      col,
      row,
      slot,
      existingId,
      buildTime,
      nextLevel,
    );
  }

  // ── Smooth transition to construction site for upgrades ──────────────────────
  private transitionToConstructionSite(
    col: number,
    row: number,
    slot: number,
    buildingId: string,
    durationMs: number,
    nextLevel: number,
  ): void {
    const pos = this.slotPos.get(slot);
    if (!pos) {
      console.error(
        `[transitionToConstructionSite] FAILED: No slotPos for ${slot}`,
      );
      return;
    }

    const { depth } = pos;
    const store = useGameState.getState();

    // Fade out old building sprite
    const old = this.slotSprite.get(slot);
    if (old) {
      this.tweens.add({
        targets: old,
        alpha: 0,
        scale: 0.9,
        duration: 200,
        ease: "Power2",
        onComplete: () => {
          old.destroy();

          // Get building type to determine positioning style
          const bldg = store.buildings.find((b) => b.id === buildingId);
          const bType = bldg?.type ?? "";
          const cfg = BUILDINGS[bType];
          const footprint = cfg?.footprint ?? { w: 1, h: 1 };

          // Centering logic matching BuildingRenderer isTileStyle
          const halfW = pos.halfW;
          const stepY = halfW / 2;
          let targetX = pos.cx;
          let targetY = pos.dTop + (footprint.w + footprint.h) * (stepY / 2);

          // Shift up slightly for scaffold visuals
          targetY -= stepY * 0.5;

          if (footprint.w > 1 || footprint.h > 1) {
            targetX = pos.cx + (footprint.w - footprint.h) * (halfW / 2);
          }

          const displayScale = Math.max(footprint.w, footprint.h) * 1.5;

          // Construction site: centered on footprint
          const constrSpr = this.add.image(
            targetX,
            targetY,
            "construction-site",
          );
          constrSpr
            .setOrigin(0.5, 0.5)
            .setDisplaySize(pos.tileW * displayScale, pos.tileW * displayScale)
            .setAlpha(0)
            .setDepth(depth + 5);

          this.slotSprite.set(slot, constrSpr);

          // Fade in construction site
          this.tweens.add({
            targets: constrSpr,
            alpha: 1,
            duration: 300,
            ease: "Power2",
          });
        },
      });
    }

    // Show construction overlay (scaffolding graphics + progress bar)
    // Completion logic (shared between timer and gem button)
    const completeUpgrade = () => {
      upgradeDelayTimer?.remove();
      store.completeConstruction(buildingId);
      store.checkObjectives();
      store.save();
      this.buildingRenderer.removeConstructionOverlay(slot);

      const bldg2 = store.buildings.find((b) => b.id === buildingId);
      const bType = bldg2?.type ?? "";
      const texKey = `${bType}-l${nextLevel}`;

      const constrSpr = this.slotSprite.get(slot);
      if (constrSpr) {
        this.tweens.add({
          targets: constrSpr,
          alpha: 0,
          duration: 150,
          ease: "Power2",
          onComplete: () => {
            constrSpr.destroy();
            this.buildingRenderer.animateBuilding(col, row, texKey, true);
          },
        });
      } else {
        this.buildingRenderer.animateBuilding(col, row, texKey, true);
      }

      this.buildingRenderer.addLevelBadge(col, row, nextLevel);
      this.showToast(
        `⬆️ ${bldg2 ? (BUILDINGS[bldg2.type]?.name ?? bType) : bType} upgraded to Lv${nextLevel}!`,
      );

      if (bType === "town-hall") {
        this.time.delayedCall(400, () => this.upgradeDefenseRing(nextLevel));
      }
      this.syncCollectorTimers();
    };

    this.buildingRenderer.addConstructionOverlay(
      col,
      row,
      slot,
      buildingId,
      durationMs,
      true,
      () => completeUpgrade(),
    );

    // When construction completes
    const upgradeDelayTimer = this.time.delayedCall(
      durationMs,
      completeUpgrade,
    );
  }

  // ── Construction Overlay ──────────────────────────────────────────────────────
  // DEPRECATED: Use buildingRenderer.addConstructionOverlay instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _addConstructionOverlay(
    col: number,
    row: number,
    slot: number,
    _buildingId: string,
    durationMs: number,
    isUpgrade: boolean,
  ): void {
    // Remove any existing overlay for this slot
    this.removeConstructionOverlay(slot);

    const pos = this.slotPos.get(slot);
    if (!pos) return;

    const { cx, dWaist, halfW, dBot, depth } = pos;
    const dTop = dWaist - (dBot - dWaist);
    const containerDepth = depth + 50;
    const container = this.add.container(0, 0).setDepth(containerDepth);

    // Scaffolding lines removed — construction-site image covers the tile

    // ── Animated hammer icon ─────────────────────────────────────────────────
    const emoji = isUpgrade ? "⬆️" : "🔨";
    const hammerText = this.add
      .text(cx, dTop - 10, emoji, { fontSize: "16px" })
      .setOrigin(0.5, 1)
      .setDepth(containerDepth);
    container.add(hammerText);
    // Bounce animation
    this.tweens.add({
      targets: hammerText,
      y: dTop - 18,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    // ── Progress bar (below tile) ─────────────────────────────────────────────
    const barW = halfW * 1.2;
    const barH = 6;
    const barX = cx - barW / 2;
    const barY = dBot + 6;

    // Background
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.6);
    barBg.fillRoundedRect(barX - 1, barY - 1, barW + 2, barH + 2, 3);
    barBg.setDepth(containerDepth);
    container.add(barBg);

    // Fill bar
    const barFill = this.add.graphics();
    barFill.setDepth(containerDepth);
    container.add(barFill);

    // Timer label
    const timerLabel = this.add
      .text(cx, barY + barH + 4, "", {
        fontSize: "8px",
        fontFamily: "Arial",
        color: "#aaddff",
      })
      .setOrigin(0.5, 0)
      .setDepth(containerDepth);
    container.add(timerLabel);

    // ── Status label ─────────────────────────────────────────────────────────
    const statusLabel = this.add
      .text(cx, dTop - 28, isUpgrade ? "Upgrading…" : "Building…", {
        fontSize: "9px",
        fontFamily: "Arial",
        color: isUpgrade ? "#ffcc44" : "#88ccff",
        stroke: "#000",
        strokeThickness: 2,
        backgroundColor: "#00000088",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(containerDepth);
    container.add(statusLabel);

    this.constructionOverlays.set(slot, container);

    // ── Animate fill bar ─────────────────────────────────────────────────────
    const startTime = Date.now();
    const fillColor = isUpgrade ? 0xffcc44 : 0x44aaff;
    const updateBar = () => {
      if (!container.active) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);

      barFill.clear();
      barFill.fillStyle(fillColor, 0.9);
      barFill.fillRoundedRect(barX, barY, barW * progress, barH, 3);

      // Almost done — pulse red when > 80%
      if (progress > 0.8) {
        barFill.fillStyle(0x44ff88, 0.95);
        barFill.fillRoundedRect(barX, barY, barW * progress, barH, 3);
      }

      // Update timer text
      timerLabel.setText(remaining > 0 ? `${remaining.toFixed(1)}s` : "Done!");
    };

    const barTimer = this.time.addEvent({
      delay: 80,
      repeat: Math.floor(durationMs / 80) + 5,
      callback: updateBar,
    });

    // Store timer ref so we can cancel if needed
    (container as any).__barTimer = barTimer;

    void col;
    void row; // suppress unused warning
  }

  private removeConstructionOverlay(slot: number): void {
    const overlay = this.constructionOverlays.get(slot);
    if (overlay) {
      const timer = (overlay as any).__barTimer as
        | Phaser.Time.TimerEvent
        | undefined;
      timer?.remove();
      overlay.destroy();
      this.constructionOverlays.delete(slot);
    }
  }

  // ── Collector Timers & Overlay ────────────────────────────────────────────────
  private syncCollectorTimers(): void {
    const store = useGameState.getState();
    const nowIds = new Set<string>();

    store.buildings.forEach((b) => {
      const cfg = BUILDINGS[b.type];
      if (!cfg?.tickIntervalMs) return;

      nowIds.add(b.id);
      if (!this.collectorTimers.has(b.id)) {
        // Start a looping timer for this specific building
        const timer = this.time.addEvent({
          delay: cfg.tickIntervalMs,
          loop: true,
          callback: () => {
            const st = useGameState.getState();
            st.tickBuildingCollector(b.id);
            st.save();
          },
        });
        this.collectorTimers.set(b.id, timer);
      }
    });

    // Cleanup destroyed / changed buildings
    for (const [id, timer] of this.collectorTimers.entries()) {
      if (!nowIds.has(id)) {
        timer.remove();
        this.collectorTimers.delete(id);
      }
    }
  }

  // DEPRECATED: Use collectorOverlay.updateAll instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _updateCollectorOverlays(): void {
    const store = useGameState.getState();

    store.buildings.forEach((b) => {
      const cfg = BUILDINGS[b.type];
      if (!cfg?.tickIntervalMs || !cfg.collectorCapacity) return;

      const pos = this.slotPos.get(b.slotIndex);
      if (!pos) return;

      const maxCap = cfg.collectorCapacity * (1 + 0.5 * (b.level - 1));
      const amount = b.collectedAmount ?? 0;
      const progress = Math.min(amount / maxCap, 1);

      let overlay = this.collectorOverlays.get(b.slotIndex);

      // We only show the overlay if there is *some* resource, or if it's building up
      if (amount === 0 && progress === 0) {
        if (overlay) {
          overlay.destroy();
          this.collectorOverlays.delete(b.slotIndex);
        }
        return;
      }

      const dTop = pos.dWaist - (pos.dBot - pos.dWaist);

      if (!overlay) {
        // Create it
        overlay = this.add.container(0, 0).setDepth(pos.depth + 40);
        this.collectorOverlays.set(b.slotIndex, overlay);

        // Bar BG
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(pos.cx - 15, dTop - 12, 30, 4, 2);
        overlay.add(bg);

        // Bar Fill
        const fill = this.add.graphics();
        overlay.add(fill);
        (overlay as any).__fill = fill;

        // "Ready to collect" floating icon (hidden initially)
        const icon = this.add
          .text(pos.cx, dTop - 25, "✨", { fontSize: "16px" })
          .setOrigin(0.5, 1)
          .setVisible(false);
        overlay.add(icon);
        (overlay as any).__icon = icon;

        // Bounce
        this.tweens.add({
          targets: icon,
          y: dTop - 32,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      }

      // Update fill bar
      const fill = (overlay as any).__fill as Phaser.GameObjects.Graphics;
      fill.clear();

      let color = 0x88ccff; // wood
      if (cfg.production?.clay) color = 0xffaa66;
      if (cfg.production?.iron) color = 0xdddddd;
      if (cfg.production?.crop) color = 0xffdd66;

      if (progress >= 1) {
        fill.fillStyle(0x44ff44, 1); // Green when full
      } else {
        fill.fillStyle(color, 0.9);
      }
      fill.fillRoundedRect(pos.cx - 14, dTop - 11, 28 * progress, 2, 1);

      // Handle icon visibility
      const icon = (overlay as any).__icon as Phaser.GameObjects.Text;
      // Show bag icon if it's > 50% full, so users know they can collect
      if (progress >= 0.5) {
        if (!icon.visible) icon.setVisible(true);
        // Change emoji based on resource
        let emoji = "📦";
        if (cfg.production?.wood) emoji = "🪵";
        if (cfg.production?.clay) emoji = "🧱";
        if (cfg.production?.iron) emoji = "⛏️";
        if (cfg.production?.crop) emoji = "🌾";

        if (progress >= 1)
          icon.setText(`⭐${emoji}`); // highlight when full
        else icon.setText(emoji);
      } else {
        if (icon.visible) icon.setVisible(false);
      }
    });
  }

  // ── Barracks training panel (can be triggered from upgrade panel) ───
  private appendTrainingPanel(pw: number, ph: number): number {
    const store = useGameState.getState();
    const unitTypes: UnitType[] = ["militia", "swordsman", "archer", "cavalry"];
    const { resources } = store;
    const total = store.getTotalUnits();
    const max = store.getMaxArmySize();
    const hasBarracks = store.buildings.some((b) => b.type === "barracks");

    let yOff = ph + 12;
    const trainingH = unitTypes.length * 48 + 50;
    const tbg = this.add.graphics();
    tbg.fillStyle(0x0d1b2a, 0.97);
    tbg.fillRoundedRect(0, yOff, pw, trainingH, 10);
    tbg.lineStyle(2, 0xd4af37, 0.6);
    tbg.strokeRoundedRect(0, yOff, pw, trainingH, 10);
    this.panel.add(tbg);

    this.panel.add(
      this.add
        .text(pw / 2, yOff + 10, `⚔ Train Units  (${total}/${max})`, {
          fontSize: "14px",
          fontFamily: "Arial",
          color: "#D4AF37",
        })
        .setOrigin(0.5, 0),
    );

    unitTypes.forEach((uType, i) => {
      const cfg = UNITS[uType];
      if (!cfg) return;
      const cost = getUnitTrainingCost(uType, 1);
      const canAfford =
        resources.wood >= cost.wood &&
        resources.clay >= cost.clay &&
        resources.iron >= cost.iron &&
        resources.crop >= cost.crop;
      const hasRoom = total < max;
      const canTrain = canAfford && hasRoom && hasBarracks;

      const ry = yOff + 36 + i * 46;
      const rowBg = this.add.graphics();
      const drawRow = (lit: boolean) => {
        rowBg.clear();
        rowBg.fillStyle(lit ? 0x1a2e3a : 0x111e2e, canTrain ? 1 : 0.5);
        rowBg.fillRoundedRect(10, ry, pw - 20, 40, 5);
        rowBg.lineStyle(1, lit ? 0x88ccff : 0x334455, canTrain ? 1 : 0.3);
        rowBg.strokeRoundedRect(10, ry, pw - 20, 40, 5);
      };
      drawRow(false);
      this.panel.add(rowBg);

      // Unit icon
      const texKey = `unit-${uType}-t1`;
      if (this.textures.exists(texKey))
        this.panel.add(
          this.add
            .image(28, ry + 20, texKey)
            .setDisplaySize(28, 28)
            .setOrigin(0.5)
            .setAlpha(canTrain ? 1 : 0.4),
        );

      // Name + cost
      this.panel.add(
        this.add.text(46, ry + 8, cfg.name, {
          fontSize: "11px",
          fontFamily: "Arial",
          color: canTrain ? "#fff" : "#666",
        }),
      );
      const cc = `W:${cost.wood} I:${cost.iron} F:${cost.crop}`;
      this.panel.add(
        this.add.text(46, ry + 24, cc, {
          fontSize: "9px",
          fontFamily: "Arial",
          color: canTrain ? "#aaffaa" : "#664444",
        }),
      );

      // Current count
      const existing = store.units.find((u) => u.type === uType);
      this.panel.add(
        this.add
          .text(pw - 70, ry + 20, `×${existing?.count ?? 0}`, {
            fontSize: "12px",
            fontFamily: "Arial",
            color: "#D4AF37",
          })
          .setOrigin(0, 0.5),
      );

      // Train buttons (+1, +5, +10)
      const btnWidth = 32,
        btnHeight = 26;
      const btnGap = 2;
      const btnStartX = pw - (btnWidth * 3 + btnGap * 2) - 14;
      const quantities = [1, 5, 10];

      quantities.forEach((qty, qIdx) => {
        const bbx = btnStartX + qIdx * (btnWidth + btnGap);
        const bby = ry + 7;
        const bbg = this.add.graphics();
        const drawBtn = (lit: boolean) => {
          bbg.clear();
          bbg.fillStyle(lit ? 0x2a6a2a : 0x1a4a1a, canTrain ? 1 : 0.35);
          bbg.fillRoundedRect(bbx, bby, btnWidth, btnHeight, 5);
          bbg.lineStyle(1.5, lit ? 0x66ff66 : 0x336633, canTrain ? 1 : 0.2);
          bbg.strokeRoundedRect(bbx, bby, btnWidth, btnHeight, 5);
        };
        drawBtn(false);
        this.panel.add(bbg);
        this.panel.add(
          this.add
            .text(bbx + btnWidth / 2, bby + btnHeight / 2, `+${qty}`, {
              fontSize: "10px",
              fontFamily: "Arial",
              color: canTrain ? "#fff" : "#555",
            })
            .setOrigin(0.5),
        );

        if (canTrain) {
          const zone = this.add
            .zone(bbx, bby, btnWidth, btnHeight)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true });
          zone.on("pointerover", () => {
            drawRow(true);
            drawBtn(true);
          });
          zone.on("pointerout", () => {
            drawRow(false);
            drawBtn(false);
          });
          zone.on("pointerdown", () => this.handleTrain(uType, cost, qty));
          this.panel.add(zone);
        }
      });
    });

    return yOff + trainingH;
  }

  private handleTrain(
    type: UnitType,
    cost: { wood: number; clay: number; iron: number; crop: number },
    quantity: number,
  ): void {
    const store = useGameState.getState();

    // Check if can afford even 1 unit
    if (!store.consumeResources(cost)) {
      this.showToast("Not enough resources!");
      return;
    }

    // Calculate available room
    const total = store.getTotalUnits();
    const max = store.getMaxArmySize();
    const room = max - total;

    // Train as many as possible
    const actualQuantity = Math.min(quantity, room);

    if (actualQuantity === 0) {
      this.showToast("Army is full!");
      return;
    }

    // Adjust cost for actual quantity
    const actualCost = {
      wood: cost.wood * actualQuantity,
      clay: cost.clay * actualQuantity,
      iron: cost.iron * actualQuantity,
      crop: cost.crop * actualQuantity,
    };

    if (!store.consumeResources(actualCost)) {
      this.showToast("Not enough resources!");
      return;
    }

    store.trainUnit(type, actualQuantity);
    store.checkObjectives();
    store.save();
    // this.resourceHUD.refresh(); // Removed
    this.showToast(
      `+${actualQuantity} ${type}${actualQuantity > 1 ? "s" : ""} trained!`,
    );
    this.closePanel();
  }

  // ── Animation (y-drop only — avoids scale/displaySize conflict) ───────────────
  // DEPRECATED: Use buildingRenderer.animateBuilding instead
  // @ts-ignore - intentionally unused, kept for backward compatibility
  private _animateBuilding(
    col: number,
    row: number,
    originalKey: string,
    isUpgrade: boolean,
  ): void {
    const slot = encodeSlot(col, row);
    const pos = this.slotPos.get(slot);
    if (!pos) return;

    // For upgrades, always use the original key (don't swap to construction-site)
    // The construction-site texture is only for new buildings under construction
    const store = useGameState.getState();
    let key = originalKey;

    // Only use construction-site texture for new buildings (not upgrades)
    // and only if underConstruction flag is set
    if (!isUpgrade) {
      const bldg = store.buildings.find((b) => b.slotIndex === slot);
      if (bldg?.underConstruction) {
        key = "construction-site";
      }
    }

    // Fall back to level 1 texture if higher level texture is missing
    if (!this.textures.exists(key)) {
      const fallback = key.replace(/-l\d+$/, "-l1");
      if (this.textures.exists(fallback)) {
        key = fallback;
      } else {
        console.warn(`[animateBuilding] texture missing: ${key}`);
        return;
      }
    }
    const { cx, dBot, dWaist, halfW, depth } = pos;

    // Fade out old sprite
    const old = this.slotSprite.get(slot);
    if (old)
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 140,
        onComplete: () => old.destroy(),
      });

    const delay = isUpgrade ? 120 : 0;
    const { imgX, imgY, tileW } = pos;

    // Extract building type from originalKey (not the potentially swapped 'key')
    const buildingType = originalKey.replace(/-l\d+$/, "");
    // Determine if this is a tile-style building based on the ORIGINAL building type
    // The construction-site should match the style of the building it's replacing
    const isTileStyle = TILE_STYLE_BUILDINGS.has(buildingType);

    let spr: Phaser.GameObjects.Image;

    if (isTileStyle) {
      // Full-tile asset: position using tile coordinates + per-asset offset
      const off = getBuildingOffset(key);
      const baseX = imgX + off.x * tileW;
      const baseY = imgY + off.y * tileW;
      spr = this.add.image(baseX, baseY, key);
      spr
        .setOrigin(0, 0)
        .setDisplaySize(tileW, tileW)
        .setAlpha(0)
        .setDepth(depth + 5);
      // Flip walls on top/bottom edges so they face the correct isometric direction
      if (buildingType === "wall" && (row === DMIN || row === DMAX)) {
        spr.setFlipX(true);
      }
      this.slotSprite.set(encodeSlot(col, row), spr);
      this.tweens.add({
        targets: spr,
        alpha: 1,
        y: baseY,
        duration: 360,
        delay,
        ease: "Bounce.easeOut",
      });
    } else {
      // Building-on-tile asset: bounce up from below dBot
      // For construction-site or regular buildings, use proper scaling
      const sitY = dBot;
      const isConstructionSite = key === "construction-site";

      if (isConstructionSite) {
        // Construction site: anchor at tile waist so the image rises above the tile, not into it
        spr = this.add.image(cx, dWaist, key);
        spr
          .setOrigin(0.5, 0.75)
          .setDisplaySize(tileW, tileW)
          .setAlpha(0)
          .setDepth(depth + 5);
        this.slotSprite.set(encodeSlot(col, row), spr);
        this.tweens.add({
          targets: spr,
          alpha: 1,
          duration: 300,
          delay,
          ease: "Power2",
        });
      } else {
        // For bg-removed spritesheet buildings, use frame 0; for Free Pack (single images), no frame
        const isBgRemoved = [
          "farm",
          "lumber-mill",
          "quarry",
          "iron-mine",
          "tower",
          "wall",
        ].some((bt) => buildingType.startsWith(bt));
        spr = isBgRemoved
          ? this.add.image(cx, sitY - halfW * 0.5, key, 0)
          : this.add.image(cx, sitY - halfW * 0.5, key);
        const texList = this.textures.get(key);
        const sFrame = texList.get();
        const displayW =
          halfW * 2 * (col === TH_COL && row === TH_ROW ? 0.65 : 0.5);
        if (sFrame && sFrame.width > 0 && sFrame.height > 0) {
          const targetW = halfW * 2 * getBuildingScale(key);
          const rawH = sFrame.height * (targetW / sFrame.width);
          spr.setDisplaySize(targetW, Math.min(rawH, halfW * 4.5));
        } else {
          spr.setDisplaySize(displayW, displayW);
        }
        spr
          .setOrigin(0.5, 1.0)
          .setAlpha(0)
          .setDepth(depth + 5);
        this.slotSprite.set(encodeSlot(col, row), spr);
        this.tweens.add({
          targets: spr,
          alpha: 1,
          y: sitY,
          duration: 380,
          delay,
          ease: "Bounce.easeOut",
        });
      }
    }

    this.playRingBurst(cx, dBot, halfW, depth, isUpgrade ? 0xffd700 : 0x66ff88);
  }

  private startPlacement(type: string): void {
    this.isPlacing = true;
    this.placementType = type;
    this.placementCol = 13; // Inner buildable zone (11-21)
    this.placementRow = 13;

    const key = `${type}-l1`;
    const pos = this.gridRenderer.getTilePosition(
      this.placementCol,
      this.placementRow,
    );
    this.placementGhost = this.add.image(pos.cx, pos.cy, key);
    const bScale = getBuildingScale(key);
    this.placementGhost.setDisplaySize(pos.tileW * bScale, pos.tileW * bScale);
    this.placementGhost.setOrigin(0.5, 1.0).setAlpha(0.8).setDepth(2000);

    const store = useGameState.getState();
    this.gridRenderer.showBaseGrid(true);
    this.gridRenderer.updateOccupiedGrid(store.buildings);
    this.gridRenderer.showOccupiedGrid(true);

    this.fadeOtherBuildings(true);
    this.updateGhostVisuals();
    this.createPlacementUI();
    this.closePanel();
  }

  private startRelocation(buildingId: string): void {
    const store = useGameState.getState();
    const building = store.buildings.find((b) => b.id === buildingId);
    if (!building) {
      useUIStore.getState().cancelRelocation();
      return;
    }

    this.isPlacing = true;
    this.placementType = building.type;
    const { col, row } = decodeSlot(building.slotIndex);
    this.placementCol = col;
    this.placementRow = row;
    this.relocatingBuildingOriginalSlot = building.slotIndex;

    const key = `${building.type}-l${building.level}`;
    const pos = this.gridRenderer.getTilePosition(col, row);

    // Create ghost at current building position
    this.placementGhost = this.add.image(pos.cx, pos.cy, key);
    const bScale = getBuildingScale(key);
    this.placementGhost.setDisplaySize(pos.tileW * bScale, pos.tileW * bScale);
    this.placementGhost.setOrigin(0.5, 1.0).setAlpha(0.8).setDepth(2000);

    // Hide original sprite
    const originalSprite = this.slotSprite.get(building.slotIndex);
    if (originalSprite) originalSprite.setAlpha(0);

    this.gridRenderer.showBaseGrid(true);
    this.gridRenderer.updateOccupiedGrid(store.buildings);
    this.gridRenderer.showOccupiedGrid(true);

    this.fadeOtherBuildings(true);
    this.updateGhostVisuals();
    this.createPlacementUI();
    this.closePanel();
    this.showToast(`Relocating ${building.type}...`);
  }

  private fadeOtherBuildings(fade: boolean): void {
    const alpha = fade ? 0.4 : 1.0;
    this.slotSprite.forEach((sprite, slot) => {
      // If we're relocating, keep the original sprite hidden
      if (fade && slot === this.relocatingBuildingOriginalSlot) {
        sprite.setAlpha(0);
      } else {
        this.tweens.add({
          targets: sprite,
          alpha,
          duration: 300,
        });
      }
    });
  }

  private updateGhostVisuals(): void {
    if (!this.placementGhost || !this.placementType) return;

    const pos = this.gridRenderer.getTilePosition(
      this.placementCol,
      this.placementRow,
    );

    const cfg = BUILDINGS[this.placementType];
    const footprint = cfg?.footprint ?? { w: 1, h: 1 };
    const halfW = pos.halfW;
    const stepY = halfW / 2;

    const targetX = pos.cx + (footprint.w - footprint.h) * (halfW / 2);
    const targetY = pos.dTop + (footprint.w + footprint.h) * stepY;

    // Magnetic Snap / Smooth movement
    this.tweens.add({
      targets: this.placementGhost,
      x: targetX,
      y: targetY,
      duration: 50,
      ease: "Linear",
    });

    this.placementGhost.setDepth(pos.depth + 100);

    // Real-time validity check
    const buildingsToConsider = useGameState
      .getState()
      .buildings.filter((b) => {
        // Ignore the building we are currently moving if relocating
        if (useUIStore.getState().isRelocating) {
          return b.id !== useUIStore.getState().relocatingBuildingId;
        }
        return true;
      });

    const res = canPlace(
      this.placementRow,
      this.placementCol,
      footprint,
      buildingsToConsider,
    );
    const canPlaceResult = res.canPlace;

    if (canPlaceResult) {
      this.placementGhost.setTint(0x88ff88);
      this.placementGhost.setAlpha(0.8);
      // Play valid snap sound when transitioning from invalid to valid
      if (this.lastPlacementValid === false) {
        PhaserSoundBridge.play(this, 'placement_valid');
      }
      this.lastPlacementValid = true;
      // Remove wobble if was invalid
      if (this.placementGhost.data?.get("wobble")) {
        const w = this.placementGhost.data.get("wobble");
        if (w) w.stop();
        this.placementGhost.setAngle(0);
        this.placementGhost.data.set("wobble", null);
      }
    } else {
      this.placementGhost.setTint(0xff8888);
      this.placementGhost.setAlpha(0.6);
      // Play invalid sound when transitioning from valid to invalid
      if (this.lastPlacementValid === true) {
        PhaserSoundBridge.play(this, 'placement_invalid');
      }
      this.lastPlacementValid = false;
      // Validity wobble animation
      if (!this.placementGhost.data?.get("wobble")) {
        const wobble = this.tweens.add({
          targets: this.placementGhost,
          angle: { from: -2, to: 2 },
          duration: 100,
          yoyo: true,
          repeat: -1,
        });
        this.placementGhost.setData("wobble", wobble);
      }
    }

    if (this.placementUI) {
      this.placementUI.setPosition(pos.cx, pos.dTop - 40);
      // Disable confirm button visually if invalid
      const confirmBtn = this.placementUI.getAt(0) as any;
      if (confirmBtn) {
        confirmBtn.setAlpha(canPlaceResult ? 1.0 : 0.4);
        confirmBtn.isConfirmDisabled = !canPlaceResult;
      }
    }

    this.gridRenderer.showHoverEffect(
      this.placementCol,
      this.placementRow,
      canPlaceResult ? 0x00ff00 : 0xff0000,
      0.3,
      footprint.w,
      footprint.h,
    );
  }

  private confirmPlacement(): void {
    if (!this.isPlacing || !this.placementType) return;

    // Check if confirm is visually disabled
    const confirmBtn = this.placementUI?.getAt(0) as any;
    if (confirmBtn?.isConfirmDisabled) return;

    const uiState = useUIStore.getState();
    if (uiState.isRelocating && uiState.relocatingBuildingId) {
      this.confirmRelocation(uiState.relocatingBuildingId);
    } else {
      const pos = this.gridRenderer.getTilePosition(
        this.placementCol,
        this.placementRow,
      );
      this.tweens.add({
        targets: this.placementGhost,
        scale: 1.15,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.handleBuild(
            this.placementCol,
            this.placementRow,
            this.placementType as any,
          );
          this.playDustPoof(pos.cx, pos.cy);
          this.destroyPlacementGhost();
          uiState.cancelPlacement();
          this.fadeOtherBuildings(false);
        },
      });
    }
  }

  private confirmRelocation(buildingId: string): void {
    const pos = this.gridRenderer.getTilePosition(
      this.placementCol,
      this.placementRow,
    );
    const newSlot = encodeSlot(this.placementCol, this.placementRow);

    this.tweens.add({
      targets: this.placementGhost,
      scale: 1.15,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        useGameState.getState().moveBuilding(buildingId, newSlot);
        this.playDustPoof(pos.cx, pos.cy);
        this.destroyPlacementGhost();
        useUIStore.getState().cancelRelocation();
        this.fadeOtherBuildings(false);
        this.renderExistingBuildings();
        this.renderExistingLevelBadges();
        this.showToast("Building moved! 🏗️");
      },
    });
  }

  private cancelPlacement(): void {
    this.destroyPlacementGhost();
    useUIStore.getState().cancelPlacement();
    useUIStore.getState().cancelRelocation();
    this.fadeOtherBuildings(false);
    this.renderExistingBuildings();
  }

  private destroyPlacementGhost(): void {
    if (this.placementGhost) {
      this.placementGhost.destroy();
      this.placementGhost = null;
    }
    if (this.placementUI) {
      this.placementUI.destroy();
      this.placementUI = null;
    }
    this.isPlacing = false;
    this.placementType = null;
    this.placementGhost = null;
    this.relocatingBuildingOriginalSlot = null;
    this.gridRenderer.hideHoverEffect();
    this.gridRenderer.showBaseGrid(false);
    this.gridRenderer.showOccupiedGrid(false);
  }

  public getBuildingConfig(type: string): any {
    return BUILDINGS[type as any] || { footprint: { w: 1, h: 1 } };
  }

  private createPlacementUI(): void {
    if (this.placementUI) this.placementUI.destroy();
    this.placementUI = this.add.container(0, 0).setDepth(3000);

    // Confirm Button (Green)
    const confirmBtn = this.add.container(-65, 0);
    const cBg = this.add.graphics();
    cBg.fillStyle(0x44aa44, 1);
    cBg.fillCircle(0, 0, 45); // Larger for mobile
    cBg.lineStyle(3, 0xffffff, 1);
    cBg.strokeCircle(0, 0, 45);
    const cText = this.add
      .text(0, 0, "✔️", { fontSize: "38px" })
      .setOrigin(0.5);
    confirmBtn.add([cBg, cText]);
    confirmBtn.setInteractive(
      new Phaser.Geom.Circle(0, 0, 45),
      Phaser.Geom.Circle.Contains,
    );
    confirmBtn.on("pointerdown", (p: any) => {
      p.event.stopPropagation();
      this.confirmPlacement();
    });

    // Cancel Button (Red)
    const cancelBtn = this.add.container(65, 0);
    const xBg = this.add.graphics();
    xBg.fillStyle(0xaa4444, 1);
    xBg.fillCircle(0, 0, 45); // Larger for mobile
    xBg.lineStyle(3, 0xffffff, 1);
    xBg.strokeCircle(0, 0, 45);
    const xText = this.add
      .text(0, 0, "✖️", { fontSize: "34px" })
      .setOrigin(0.5);
    cancelBtn.add([xBg, xText]);
    cancelBtn.setInteractive(
      new Phaser.Geom.Circle(0, 0, 45),
      Phaser.Geom.Circle.Contains,
    );
    cancelBtn.on("pointerdown", (p: any) => {
      p.event.stopPropagation();
      this.cancelPlacement();
    });

    this.placementUI.add([confirmBtn, cancelBtn]);
  }

  private playRingBurst(
    cx: number,
    dBot: number,
    halfW: number,
    depth: number,
    color: number,
  ): void {
    const ring = this.add.graphics().setDepth(depth + 10);
    const bH = halfW * 0.55;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 440,
      ease: "Power2",
      onUpdate: (tw) => {
        const t = tw.getValue() || 0,
          r = halfW * (0.5 + t),
          h = bH * (0.5 + t);
        ring.clear().lineStyle(2.5 * (1 - t), color, (1 - t) * 0.9);
        ring.strokePoints(
          [
            { x: cx, y: dBot - h * 2 },
            { x: cx + r, y: dBot - h },
            { x: cx, y: dBot },
            { x: cx - r, y: dBot - h },
          ],
          true,
        );
      },
      onComplete: () => ring.destroy(),
    });
  }

  private playDustPoof(x: number, y: number): void {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const dust = this.add.circle(
        x,
        y,
        Phaser.Math.Between(4, 8),
        0xd2b48c,
        0.6,
      );
      dust.setDepth(2000);
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(20, 50);

      this.tweens.add({
        targets: dust,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 10,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(400, 700),
        ease: "Cubic.easeOut",
        onComplete: () => dust.destroy(),
      });
    }
  }
}
