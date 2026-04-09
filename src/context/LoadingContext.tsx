/**
 * LoadingContext — Provides the gate system to the entire app.
 * The loading screen is visible until ALL gates are complete.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { useLoadingGates } from '@/hooks/useLoadingGates'
import type { LoadingState, LoadingGate, GateStatus } from '@/types/loading.types'

interface LoadingContextValue {
  state: LoadingState
  setGate: (gate: LoadingGate, status: GateStatus) => void
  progress: number
  screenVisible: boolean
}

const LoadingContext = createContext<LoadingContextValue | null>(null)

export function useLoadingContext() {
  const ctx = useContext(LoadingContext)
  if (!ctx) throw new Error('useLoadingContext must be used within LoadingProvider')
  return ctx
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const { state, setGate, progress } = useLoadingGates()
  const [screenVisible, setScreenVisible] = useState(true)

  // When ALL gates are complete, wait 500ms then fade out
  useEffect(() => {
    if (state.isFullyReady && screenVisible) {
      const timer = setTimeout(() => {
        setScreenVisible(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [state.isFullyReady, screenVisible])

  return (
    <LoadingContext.Provider value={{ state, setGate, progress, screenVisible }}>
      {children}
    </LoadingContext.Provider>
  )
}
