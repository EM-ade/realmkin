// ──────────────────────────────────────────────────────────────────────────────
// BUILDING CONFIG FOR BUILD PANEL
// Organizes buildings into categories with thumbnail paths
// ──────────────────────────────────────────────────────────────────────────────

import type { BuildingType } from "@/stores/gameStore";

export interface BuildingCost {
  wood?: number;
  clay?: number;
  iron?: number;
  crop?: number;
}

export interface BuildingPanelConfig {
  id: BuildingType;
  name: string;
  description: string;
  thumbnail: string; // Path to building preview image
  footprint: { w: number; h: number };
  cost: BuildingCost;
  category: string;
  thLevelRequired: number;
}

export interface BuildingCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  buildingIds: BuildingType[];
}

// Building categories for organization
export const BUILDING_CATEGORIES: BuildingCategory[] = [
  {
    id: "resource",
    label: "Resource",
    icon: "🌾",
    color: "#88dd88",
    buildingIds: ["farm", "lumber-mill", "quarry", "iron-mine"],
  },
  {
    id: "housing",
    label: "Housing",
    icon: "🏠",
    color: "#e8c878",
    buildingIds: ["house", "warehouse"],
  },
  {
    id: "military",
    label: "Military",
    icon: "⚔️",
    color: "#ff6b6b",
    buildingIds: ["barracks"],
  },
];

// Map building types to their thumbnail paths (using same source as game renderer)
export const BUILDING_THUMBNAILS: Record<BuildingType, string> = {
  "town-hall": "/assets/game/buildings/town-hall-l1.png",
  farm: "/assets/game/buildings/farm-l1.png",
  "lumber-mill": "/assets/game/buildings/lumber-mill-l1.png",
  quarry: "/assets/game/buildings/quarry-l1.png",
  "iron-mine": "/assets/game/buildings/iron-mine-l1.png",
  barracks: "/assets/game/buildings/barracks-l1.png",
  "army-camp": "/assets/game/buildings/army-camp-l1.png",
  laboratory: "/assets/game/buildings/laboratory-l1.png",
  warehouse: "/assets/game/buildings/warehouse-l1.png",
  house: "/assets/game/buildings/house-l1.png",
  wall: "/assets/game/buildings/wall-l1.png",
  tower: "/assets/game/buildings/tower-l1.png",
};

// Resource icons for cost display
export const RESOURCE_ICONS: Record<string, string> = {
  wood: "/assets/icons/wood.svg",
  clay: "/assets/icons/clay.svg",
  iron: "/assets/icons/iron.svg",
  crop: "/assets/icons/crop.svg",
};

// Fallback emoji icons if images don't exist
export const RESOURCE_EMOJIS: Record<string, string> = {
  wood: "🪵",
  clay: "🪨",
  iron: "⛏️",
  crop: "🌾",
};

// Buildings that can be placed in the current build panel
export const PLACEABLE_BUILDINGS: BuildingType[] = [
  "farm",
  "lumber-mill",
  "quarry",
  "iron-mine",
  "barracks",
  "warehouse",
  "house",
];
