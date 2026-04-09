/**
 * Loading Gate System — Explicit state machine for game initialization.
 * The loading screen CANNOT close unless ALL required gates are 'complete'.
 */

export type LoadingGate =
  | 'auth'              // Player authenticated
  | 'playerData'        // Player record loaded from DB
  | 'buildings'         // Buildings array loaded from DB
  | 'resources'         // Resource state loaded
  | 'tutorialState'     // Tutorial flags loaded
  | 'phaserReady'       // Phaser scene fully initialized
  | 'spritesLoaded'     // All Phaser textures loaded
  | 'soundsLoaded'      // All critical Howler sounds loaded
  | 'gridBuilt'         // Building sprites placed on Phaser grid

export type GateStatus = 'pending' | 'loading' | 'complete' | 'failed'

export interface LoadingState {
  gates: Record<LoadingGate, GateStatus>
  isFullyReady: boolean  // computed: ALL required gates === 'complete'
  failedGates: LoadingGate[]
  startTime: number
}

// Gates that are strictly required before the loading screen can close
const REQUIRED_GATES: LoadingGate[] = [
  'auth',
  'playerData',
  'buildings',
  'resources',
  'tutorialState',
  'phaserReady',
  'spritesLoaded',
  'soundsLoaded',
  'gridBuilt',
]

export const isFullyReady = (state: LoadingState): boolean => {
  return REQUIRED_GATES.every(gate => state.gates[gate] === 'complete')
}

export const getProgressPercent = (state: LoadingState): number => {
  const completed = REQUIRED_GATES.filter(g => state.gates[g] === 'complete').length
  return Math.round((completed / REQUIRED_GATES.length) * 100)
}
