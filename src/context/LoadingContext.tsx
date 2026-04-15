/**
 * LoadingContext — Provides the gate system to the entire app.
 * The loading screen is visible until ALL gates are complete.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { useLoadingGates } from '@/hooks/useLoadingGates'
import type { LoadingState, LoadingGate, GateStatus } from '@/types/loading.types'

interface LoadingContextValue {
  state: LoadingState
  setGate: (gate: LoadingGate, status: GateStatus) => void
  resetGates: (preserveGates?: LoadingGate[]) => void
  progress: number
  screenVisible: boolean
  showLogin: boolean
  setShowLogin: (show: boolean) => void
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function useLoadingContext() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoadingContext must be used within LoadingProvider')
  return ctx
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { state, setGate, resetGates, progress } = useLoadingGates()
  const [screenVisible, setScreenVisible] = useState(true)
  const [showLogin, setShowLogin] = useState(false)

  const setGateFn = useCallback((gate: LoadingGate, status: GateStatus) => {
    setGate(gate, status)
  }, [setGate])

  const resetGatesFn = useCallback((preserveGates?: LoadingGate[]) => {
    resetGates(preserveGates)
  }, [resetGates])

  useEffect(() => {
    if (state.gates.needsLogin === 'complete') {
      setShowLogin(true)
    }
  }, [state.gates.needsLogin])

  useEffect(() => {
    if (state.isFullyReady && screenVisible) {
      const timer = setTimeout(() => {
        setScreenVisible(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [state.isFullyReady, screenVisible])

  return (
    <LoadingContext.Provider value={{ state, setGate: setGateFn, resetGates: resetGatesFn, progress, screenVisible, showLogin, setShowLogin }}>
      {children}
    </LoadingContext.Provider>
  )
}
