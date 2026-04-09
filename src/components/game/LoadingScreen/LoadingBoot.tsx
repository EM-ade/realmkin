/**
 * LoadingBoot — Runs all loading stages sequentially using the gate system.
 * This component should be mounted once at the app root, inside LoadingProvider.
 */

import { useEffect, useRef } from 'react'
import {
  loadStageAuth,
  loadStagePlayerData,
  loadStageSounds,
  loadStageSprites,
  loadStageGridBuilt,
} from '@/components/game/LoadingScreen/loadingStages'
import { useLoadingGates } from '@/hooks/useLoadingGates'

export function LoadingBoot() {
  const { setGate } = useLoadingGates()
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const boot = async () => {
      try {
        // Stage 1: Auth
        const auth = await loadStageAuth()
        if (!auth.success) {
          console.warn('[LoadingBoot] Auth stage failed:', auth.error)
          // Don't block — user can still log in manually
          return
        }

        // Stage 2: Player Data (buildings, resources, tutorial state)
        const playerData = await loadStagePlayerData()
        if (!playerData.success) {
          console.warn('[LoadingBoot] Player data stage failed:', playerData.error)
          // Continue — new players may not have data yet
        }

        // Stage 3: Sounds (preload critical Howler sounds)
        await loadStageSounds()

        // Stage 4: Wait for Phaser sprites to load (set by BootScene)
        await loadStageSprites()

        // Stage 5: Wait for VillageScene to finish placing buildings
        await loadStageGridBuilt()

      } catch (err) {
        console.error('[LoadingBoot] Boot sequence error:', err)
      }
    }

    boot()
  }, [setGate])

  return null
}
