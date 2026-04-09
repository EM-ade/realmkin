/**
 * LoadingBoot — Runs all loading stages sequentially using the gate system.
 * This component should be mounted once at the app root, inside LoadingProvider.
 */

import { useEffect, useRef, useCallback } from 'react'
import {
  loadStageAuth,
  loadStagePlayerData,
  loadStageSounds,
  loadStageSprites,
  loadStageGridBuilt,
} from '@/components/game/LoadingScreen/loadingStages'
import { useLoadingContext } from '@/context/LoadingContext'
import { supabase } from '@/lib/supabase'

const PRESERVE_GATES = ['soundsLoaded', 'spritesLoaded', 'phaserReady', 'gridBuilt'] as const

export function LoadingBoot() {
  const { setGate, resetGates, setShowLogin, state } = useLoadingContext()
  const isBooting = useRef(false)
  const isPostLoginBoot = useRef(false)
  const bootId = useRef(0)

  const runBootSequence = useCallback(async (isReRun: boolean = false) => {
    const currentBootId = ++bootId.current
    
    if (isBooting.current) return
    isBooting.current = true

    try {
      // Always run auth
      const auth = await loadStageAuth()
      
      // Check if this boot is still the current one
      if (currentBootId !== bootId.current) return
      
      if (!auth.success || !auth.data) {
        setGate('needsLogin', 'complete')
        return
      }

      setGate('needsLogin', 'pending')

      // Always reload player data (fresh data after login)
      const playerData = await loadStagePlayerData()
      
      // Check if this boot is still the current one
      if (currentBootId !== bootId.current) return
      
      if (!playerData.success) {
        console.warn('[LoadingBoot] Player data stage failed:', playerData.error)
      }

      // Skip loading Phaser assets if they're already complete
      if (isReRun) {
        setGate('soundsLoaded', 'complete')
        setGate('spritesLoaded', 'complete')
        setGate('phaserReady', 'complete')
        setGate('gridBuilt', 'complete')
        isBooting.current = false
        return
      }

      await loadStageSounds()
      
      // Check if this boot is still the current one
      if (currentBootId !== bootId.current) return
      
      await loadStageSprites()
      await loadStageGridBuilt()

    } catch (err) {
      console.error('[LoadingBoot] Boot sequence error:', err)
    } finally {
      if (currentBootId === bootId.current) {
        isBooting.current = false
      }
    }
  }, [setGate])

  useEffect(() => {
    runBootSequence(false)
  }, [runBootSequence])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === 'SIGNED_IN') {
          // Mark that this is a post-login boot
          isPostLoginBoot.current = true
          
          // Cancel any running boot
          bootId.current++
          isBooting.current = false
          
          // Reset gates but preserve Phaser/game-related ones
          resetGates([...PRESERVE_GATES])
          setShowLogin(false)
          
          // Start fresh boot (will skip Phaser loading)
          runBootSequence(true)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [resetGates, setShowLogin, runBootSequence])

  return null
}
