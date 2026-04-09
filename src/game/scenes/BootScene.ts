import Phaser from "phaser";

// Buildings from Free Pack (single-frame PNGs, loaded as images)
const BUILDING_IMAGES: Record<string, string> = {
  "town-hall-l1": "town-hall-l1.png",
  "town-hall-l2": "town-hall-l2.png",
  "town-hall-l3": "town-hall-l3.png",
  "town-hall-l4": "town-hall-l4.png",
  "town-hall-l5": "town-hall-l5.png",
  "barracks-l1": "barracks-l1.png",
  "barracks-l2": "barracks-l2.png",
  "barracks-l3": "barracks-l3.png",
  "barracks-l4": "barracks-l4.png",
  "barracks-l5": "barracks-l5.png",
  "warehouse-l1": "warehouse-l1.png",
  "warehouse-l2": "warehouse-l1.png",
  "warehouse-l3": "warehouse-l3.png",
  "warehouse-l4": "warehouse-l3.png",
  "warehouse-l5": "warehouse-l5.png",
  "construction-site": "construction-site.png",
  "house-l1": "house-l1.png",
  "house-l2": "house-l2.png",
  "house-l3": "house-l3.png",
  "house-l4": "house-l4.png",
  "house-l5": "house-l5.png",
};

// Buildings from bg-removed (large PNGs — single images with transparency)
// Walls/towers are full isometric tile images (1024×1024 or 640×640)
const BUILDING_SHEETS_128: Record<string, string> = {};

// Full tile images (TILE_STYLE — displayed at tile size)
// Note: wall/tower/quarry/iron-mine/warehouse only have l1/l3/l5 — l2/l4 fall back
const BUILDING_TILE_IMAGES: Record<string, string> = {
  "wall-l1": "wall-l1.png",
  "wall-l2": "wall-l1.png",
  "wall-l3": "wall-l3.png",
  "wall-l4": "wall-l3.png",
  "wall-l5": "wall-l5.png",
  "tower-l1": "tower-l1.png",
  "tower-l2": "tower-l1.png",
  "tower-l3": "tower-l3.png",
  "tower-l4": "tower-l3.png",
  "tower-l5": "tower-l5.png",
  "farm-l1": "farm-l1.png",
  "farm-l2": "farm-l2.png",
  "farm-l3": "farm-l3.png",
  "farm-l4": "farm-l4.png",
  "farm-l5": "farm-l5.png",
  "lumber-mill-l1": "lumber-mill-l1.png",
  "lumber-mill-l2": "lumber-mill-l2.png",
  "lumber-mill-l3": "lumber-mill-l3.png",
  "lumber-mill-l4": "lumber-mill-l4.png",
  "lumber-mill-l5": "lumber-mill-l5.png",
  "quarry-l1": "quarry-l1.png",
  "quarry-l2": "quarry-l1.png",
  "quarry-l3": "quarry-l3.png",
  "quarry-l4": "quarry-l3.png",
  "quarry-l5": "quarry-l5.png",
  "iron-mine-l1": "iron-mine-l1.png",
  "iron-mine-l2": "iron-mine-l2.png",
  "iron-mine-l3": "iron-mine-l3.png",
  "iron-mine-l4": "iron-mine-l3.png",
  "iron-mine-l5": "iron-mine-l5.png",
};

// Unit images from units-temp folder
const UNIT_IMAGES: Record<string, string> = {
  "unit-militia-t1": "Villager Militia (Tier 1).png",
  "unit-swordsman-t1": "Apprentice Swordsman (T1).png",
  "unit-archer-t1": "Hunter (T1).png",
  "unit-cavalry-t1": "Scout on Horse (T1).png",
  // Tier 2
  "unit-militia-t2": "Militia Guard (Tier 2).png",
  "unit-swordsman-t2": "Knight (T2).png",
  "unit-archer-t2": "Marksman (T2).png",
  "unit-cavalry-t2": "Knight Charger (T2).png",
  // Tier 3
  "unit-militia-t3": "Royal Guard (Tier 3).png",
  "unit-swordsman-t3": "Mystic Knight (T3).png",
  "unit-archer-t3": "Elven Archer (T3).png",
  "unit-cavalry-t3": "Paladin (T3).png",
};

// Resource sprite info from resources-metadata.json
// spriteSize: 128, padding: 4, sheet: 532×136
const RESOURCE_SPRITES: Record<string, { x: number; y: number; size: number }> =
  {
    clay: { x: 4, y: 4, size: 128 },
    crop: { x: 136, y: 4, size: 128 },
    iron: { x: 268, y: 4, size: 128 },
    wood: { x: 400, y: 4, size: 128 },
  };

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    // Track Phaser's own load completion for the gate system
    this.load.on('complete', () => {
      window.__loadingGates?.setGate('spritesLoaded', 'complete')
    })

    this.load.on('loaderror', (file: any) => {
      console.warn('[BootScene] Asset failed to load:', file.key)
      // Don't fail the gate for one missing asset — log and continue
    })

    // Phaser asset loading happens silently — React loading screen handles the UI.
    // Load single-frame building images (Free Pack)
    const BASE_PATH = "/assets/game/buildings/";
    for (const [key, filename] of Object.entries(BUILDING_IMAGES)) {
      this.load.image(key, `${BASE_PATH}${filename}`);
    }
    // Load bg-removed buildings as spritesheets (1024×1024, 128px frames)
    for (const [key, filename] of Object.entries(BUILDING_SHEETS_128)) {
      if (!Object.keys(BUILDING_IMAGES).includes(key)) {
        this.load.spritesheet(`__spr_${key}`, `${BASE_PATH}${filename}`, {
          frameWidth: 128,
          frameHeight: 128,
        });
      }
    }
    // Load wall/tower as full tile images
    for (const [key, filename] of Object.entries(BUILDING_TILE_IMAGES)) {
      this.load.image(key, `${BASE_PATH}${filename}`);
    }

    // Load unit sprites from units-temp
    const UNITS_PATH = "/assets/game/units-temp/";
    for (const [key, filename] of Object.entries(UNIT_IMAGES)) {
      this.load.image(key, `${UNITS_PATH}${filename}`);
    }

    // Load enemy sprites (Red knight variants)
    const ENEMY_PATH = "/assets/game/units/knights/";
    this.load.image("unit-enemy-militia", `${ENEMY_PATH}Pawn_Red.png`);
    this.load.image("unit-enemy-swordsman", `${ENEMY_PATH}Warrior_Red.png`);
    this.load.image("unit-enemy-archer", `${ENEMY_PATH}Archer_Red.png`);
    this.load.image("unit-enemy-cavalry", `${ENEMY_PATH}Warrior_Red.png`);
    this.load.image("unit-enemy-dead", `${ENEMY_PATH}Dead.png`);

    // Load resource sprite sheet (still used for resource icons)
    this.load.image(
      "resources-sheet",
      "/assets/game/sprite-sheets/resources-sheet.png",
    );
    this.load.image("ui-sheet", "/assets/game/sprite-sheets/ui-sheet.png");
    // Load individual resource icons from resources-temp
    this.load.image(
      "icon-wood",
      "/assets/game/resources-temp/Wood Resource Icon.png",
    );
    this.load.image(
      "icon-clay",
      "/assets/game/resources-temp/Clay Resource Icon.png",
    );
    this.load.image(
      "icon-iron",
      "/assets/game/resources-temp/Iron Resource Icon.png",
    );
    this.load.image(
      "icon-crop",
      "/assets/game/resources-temp/Crop Resource Icon.png",
    );
    // Load building preview icons (same as building sprites)
    this.load.image(
      "icon-town-hall",
      "/assets/game/buildings/town-hall-l1.png",
    );
    this.load.image("icon-farm", "/assets/game/buildings/farm-l1.png");
    this.load.image(
      "icon-lumber-mill",
      "/assets/game/buildings/lumber-mill-l1.png",
    );
    this.load.image("icon-quarry", "/assets/game/buildings/quarry-l1.png");
    this.load.image(
      "icon-iron-mine",
      "/assets/game/buildings/iron-mine-l1.png",
    );
    this.load.image("icon-barracks", "/assets/game/buildings/barracks-l1.png");
    this.load.image(
      "icon-warehouse",
      "/assets/game/buildings/warehouse-l1.png",
    );
    this.load.image("icon-house", "/assets/game/buildings/house-l1.png");
    this.load.image("icon-wall", "/assets/game/buildings/wall-l1.png");
    this.load.image("icon-tower", "/assets/game/buildings/tower-l1.png");

    // Load static background map chunks (1280×1536 each — safely under 2048px GPU limit)
    // 4 columns (c0–c3) × 2 rows (r0=top, r1=bottom) = full 5120×3072 background
    this.load.image("bg-c0r0", "/assets/terrain/bg_c0r0.webp");
    this.load.image("bg-c1r0", "/assets/terrain/bg_c1r0.webp");
    this.load.image("bg-c2r0", "/assets/terrain/bg_c2r0.webp");
    this.load.image("bg-c3r0", "/assets/terrain/bg_c3r0.webp");
    this.load.image("bg-c0r1", "/assets/terrain/bg_c0r1.webp");
    this.load.image("bg-c1r1", "/assets/terrain/bg_c1r1.webp");
    this.load.image("bg-c2r1", "/assets/terrain/bg_c2r1.webp");
    this.load.image("bg-c3r1", "/assets/terrain/bg_c3r1.webp");

    // Load terrain tiles (new isometric assets)
    this.load.image("grass", "/assets/generated_tiles/grass_flat.png");
    this.load.image("water", "/assets/game/terrain/new_assets/water_new.png");
    this.load.image("forest", "/assets/generated_tiles/forest_flat.png");
    this.load.image(
      "cobblestone",
      "/assets/game/terrain-temp/Seamless Cobblestone Tile.png",
    );
    this.load.image("dirt", "/assets/game/terrain-temp/Dirt Terrain Tile.png");

    // Load Transition assets
    this.load.image(
      "grass-water-north",
      "/assets/game/terrain/new_assets/grass_water_north.png",
    );
    this.load.image(
      "grass-water-corner",
      "/assets/game/terrain/new_assets/grass_water_corner.png",
    );
    this.load.image(
      "grass-forest-edge",
      "/assets/game/terrain/new_assets/grass_forest_edge.png",
    );
    // Load Tiny Swords decorations
    this.load.image("deco-bush1", "/assets/game/terrain/Bush1.png");
    this.load.image("deco-bush2", "/assets/game/terrain/Bush2.png");
    this.load.image("deco-bush3", "/assets/game/terrain/Bush3.png");
    this.load.image("deco-bush4", "/assets/game/terrain/Bush4.png");
    this.load.image("deco-rock1", "/assets/game/terrain/Rock1.png");
    this.load.image("deco-rock2", "/assets/game/terrain/Rock2.png");
    this.load.image("deco-rock3", "/assets/game/terrain/Rock3.png");
    this.load.image("deco-rock4", "/assets/game/terrain/Rock4.png");
    this.load.image("deco-cloud1", "/assets/game/terrain/Cloud1.png");
    this.load.image("deco-cloud2", "/assets/game/terrain/Cloud2.png");

    // Load new generation decorations
    this.load.image("tree_new", "/assets/game/terrain/new_assets/tree_new.png");
    this.load.image("rock_new", "/assets/game/terrain/new_assets/rock_new.png");
    this.load.image(
      "deco-rocks-cluster",
      "/assets/game/terrain/new_assets/deco_rocks.png",
    );
    this.load.image(
      "deco-lilypads",
      "/assets/game/terrain/new_assets/deco_lilypads.png",
    );
    this.load.image(
      "deco-flowers",
      "/assets/game/terrain/new_assets/deco_flowers.png",
    );
    this.load.image(
      "deco-stumps",
      "/assets/game/terrain/new_assets/deco_stumps.png",
    );
  }

  create(): void {
    // Crop individual resource icons from the resources sheet
    const resourcesSheet = this.textures.get("resources-sheet");
    for (const [name, info] of Object.entries(RESOURCE_SPRITES)) {
      const key = `resource-${name}`;
      if (!this.textures.exists(key)) {
        resourcesSheet.add(key, 0, info.x, info.y, info.size, info.size);
      }
    }

    // Register frame 0 of each bg-removed spritesheet as a plain texture key
    for (const key of Object.keys(BUILDING_SHEETS_128)) {
      if (Object.keys(BUILDING_IMAGES).includes(key)) continue;
      const sheetKey = `__spr_${key}`;
      if (this.textures.exists(sheetKey) && !this.textures.exists(key)) {
        const sheet = this.textures.get(sheetKey);
        const src = sheet.getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet(key, src, {
          frameWidth: 128,
          frameHeight: 128,
        });
      }
    }

    // Phaser scene is fully created and ready
    window.__loadingGates?.setGate('phaserReady', 'complete')
    this.scene.start("MainMenuScene");
  }
}
