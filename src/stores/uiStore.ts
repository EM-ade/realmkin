import { create } from "zustand";
import type { BuildingType } from "./gameStore";

interface UIState {
  upgradePanelOpen: boolean;
  selectedBuildingId: string | null;
  selectedBuildingCol: number;
  selectedBuildingRow: number;
  openUpgradePanel: (buildingId: string, col: number, row: number) => void;
  closeUpgradePanel: () => void;

  buildPanelOpen: boolean;
  buildCol: number;
  buildRow: number;
  openBuildPanel: (col: number, row: number) => void;
  closeBuildPanel: () => void;
  onBuildCallback: ((type: BuildingType) => void) | null;
  setBuildCallback: (cb: (type: BuildingType) => void) => void;

  gemStoreOpen: boolean;
  openGemStore: () => void;
  closeGemStore: () => void;

  placementMode: boolean;
  selectedBuildingType: BuildingType | null;
  startPlacement: (type: BuildingType) => void;
  cancelPlacement: () => void;

  isRelocating: boolean;
  relocatingBuildingId: string | null;
  startRelocation: (buildingId: string) => void;
  cancelRelocation: () => void;

  // Audio settings
  audioSettingsOpen: boolean;
  openAudioSettings: () => void;
  closeAudioSettings: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  upgradePanelOpen: false,
  selectedBuildingId: null,
  selectedBuildingCol: 0,
  selectedBuildingRow: 0,

  openUpgradePanel: (buildingId, col, row) =>
    set({
      upgradePanelOpen: true,
      selectedBuildingId: buildingId,
      selectedBuildingCol: col,
      selectedBuildingRow: row,
    }),

  closeUpgradePanel: () =>
    set({
      upgradePanelOpen: false,
      selectedBuildingId: null,
    }),

  buildPanelOpen: false,
  buildCol: 0,
  buildRow: 0,
  onBuildCallback: null,

  openBuildPanel: (col, row) =>
    set({
      buildPanelOpen: true,
      buildCol: col,
      buildRow: row,
    }),

  closeBuildPanel: () =>
    set({
      buildPanelOpen: false,
    }),

  setBuildCallback: (cb) =>
    set({
      onBuildCallback: cb,
    }),

  gemStoreOpen: false,
  openGemStore: () => set({ gemStoreOpen: true }),
  closeGemStore: () => set({ gemStoreOpen: false }),

  placementMode: false,
  selectedBuildingType: null,
  startPlacement: (type) =>
    set({
      placementMode: true,
      selectedBuildingType: type,
      buildPanelOpen: false, // Close menu when starting placement
      isRelocating: false,
      relocatingBuildingId: null,
    }),
  cancelPlacement: () =>
    set({
      placementMode: false,
      selectedBuildingType: null,
      isRelocating: false,
      relocatingBuildingId: null,
    }),

  isRelocating: false,
  relocatingBuildingId: null,
  startRelocation: (buildingId) =>
    set({
      placementMode: true,
      isRelocating: true,
      relocatingBuildingId: buildingId,
      upgradePanelOpen: false,
    }),
  cancelRelocation: () =>
    set({
      placementMode: false,
      isRelocating: false,
      relocatingBuildingId: null,
    }),

  audioSettingsOpen: false,
  openAudioSettings: () => set({ audioSettingsOpen: true }),
  closeAudioSettings: () => set({ audioSettingsOpen: false }),
}));
