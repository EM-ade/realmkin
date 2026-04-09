/**
 * useLoadingGates — Manages the loading gate state machine.
 * Every system reports its own gate status. No timeouts force-close.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  LoadingGate,
  GateStatus,
  LoadingState,
  isFullyReady,
  getProgressPercent,
} from '@/types/loading.types'

const INITIAL_GATES: Record<LoadingGate, GateStatus> = {
  auth:          'pending',
  playerData:    'pending',
  buildings:     'pending',
  resources:     'pending',
  tutorialState: 'pending',
  phaserReady:   'pending',
  spritesLoaded: 'pending',
  soundsLoaded:  'pending',
  gridBuilt:     'pending',
  needsLogin:    'pending',
}

// Global reference so Phaser scenes can access setGate without React context
declare global {
  interface Window {
    __loadingGates?: {
      setGate: (gate: LoadingGate, status: GateStatus) => void
      state: LoadingState
    }
  }
}

export const useLoadingGates = () => {
  const [state, setState] = useState<LoadingState>({
    gates: INITIAL_GATES,
    isFullyReady: false,
    failedGates: [],
    startTime: Date.now(),
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const setGate = useCallback((gate: LoadingGate, status: GateStatus) => {
    setState(prev => {
      // Don't allow downgrading from 'complete' to 'loading'
      if (prev.gates[gate] === 'complete' && status === 'loading') return prev

      const newGates = { ...prev.gates, [gate]: status }
      const newFailed = Object.entries(newGates)
        .filter(([, s]) => s === 'failed')
        .map(([g]) => g as LoadingGate)

      const newState: LoadingState = {
        ...prev,
        gates: newGates,
        isFullyReady: isFullyReady({ ...prev, gates: newGates }),
        failedGates: newFailed,
      }

      // Update stateRef immediately so Phaser can see the change
      stateRef.current = newState

      return newState
    })
  }, [])

  const resetGates = useCallback((preserveGates: LoadingGate[] = []) => {
    setState(prev => {
      const newGates = { ...INITIAL_GATES }
      // Preserve specified gates if they're already complete
      for (const gate of preserveGates) {
        if (prev.gates[gate] === 'complete') {
          newGates[gate] = 'complete'
        }
      }
      return {
        ...prev,
        gates: newGates,
        isFullyReady: false,
        failedGates: [],
        startTime: Date.now(),
      }
    })
  }, [])

  // Expose to global for Phaser scenes
  useEffect(() => {
    window.__loadingGates = { setGate, state: stateRef.current }
    return () => {
      delete window.__loadingGates
    }
  }, [setGate])

  return { state, setGate, resetGates, progress: getProgressPercent(state) }
}
