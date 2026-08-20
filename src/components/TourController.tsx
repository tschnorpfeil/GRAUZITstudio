import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore } from '../store'
import { TOUR_STEPS } from '../tour'

const _desiredPos = new THREE.Vector3()
const _posA = new THREE.Vector3()
const _posB = new THREE.Vector3()
const _tgt = new THREE.Vector3()
const _curPos = new THREE.Vector3()
const _curTgt = new THREE.Vector3()

function ease(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/**
 * Steuert die geführte Demo: cinematische Kamerafahrten, weiche
 * Szenario-Übergänge und automatisches Weiterschalten der Kapitel.
 * Läuft komplett im Frame-Loop – kein React-Re-Render pro Frame.
 */
export function TourController() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera

  const mode = useSimulationStore((s) => s.mode)
  const tourStep = useSimulationStore((s) => s.tourStep)

  const elapsedRef = useRef(0)
  const initializedStepRef = useRef(-1)
  const startPosRef = useRef(new THREE.Vector3())
  const startTgtRef = useRef(new THREE.Vector3(0, 0, -6))
  const startFovRef = useRef(48)
  const lastTgtRef = useRef(new THREE.Vector3(0, 0, -6))
  const lastReportedRef = useRef(0)

  // Kapitel-Einstieg: Startzustand der Kamera einfrieren, Szenario-Ziele setzen
  useEffect(() => {
    if (mode !== 'tour') {
      initializedStepRef.current = -1
      return
    }
    const step = TOUR_STEPS[tourStep]
    if (!step) return

    elapsedRef.current = 0
    lastReportedRef.current = 0
    initializedStepRef.current = tourStep
    startPosRef.current.copy(camera.position)
    startTgtRef.current.copy(lastTgtRef.current)
    startFovRef.current = camera.fov

    const s = useSimulationStore.getState()
    s.setThermal(step.thermal)
    s.setObstacles(step.obstacles)
    s.setCameraMode(step.camMode)
  }, [mode, tourStep, camera])

  useFrame((_, rawDelta) => {
    if (mode !== 'tour') return
    const step = TOUR_STEPS[tourStep]
    if (!step || initializedStepRef.current !== tourStep) return

    const delta = Math.min(rawDelta, 0.1) // Tab-Wechsel-Sprünge abfedern
    elapsedRef.current += delta
    const p = Math.min(1, elapsedRef.current / step.duration)

    const store = useSimulationStore.getState()

    // 1. Szenario weich nachziehen (Tag/Nacht/Regen + Vergleichslinie)
    const condDelta = step.cond - store.condition
    if (Math.abs(condDelta) > 0.0004) {
      store.setCondition(store.condition + condDelta * Math.min(1, delta * 1.1))
    }
    const splitDelta = step.split - store.splitX
    if (Math.abs(splitDelta) > 0.0008) {
      store.setSplitX(store.splitX + splitDelta * Math.min(1, delta * 0.85))
    }

    // 2. Cinematische Kamerafahrt: Ankunfts-Blend + langsamer Drift
    _posA.set(...step.posA)
    _posB.set(...step.posB)
    _tgt.set(...step.tgt)

    const blendIn = ease(Math.min(1, p * 2.4))
    _desiredPos.copy(_posA).lerp(_posB, ease(p))

    _curPos.copy(startPosRef.current).lerp(_desiredPos, blendIn)
    _curTgt.copy(startTgtRef.current).lerp(_tgt, blendIn)

    camera.position.copy(_curPos)
    camera.lookAt(_curTgt)
    lastTgtRef.current.copy(_curTgt)

    const fovNext = THREE.MathUtils.lerp(startFovRef.current, step.fov, blendIn)
    if (Math.abs(fovNext - camera.fov) > 0.01) {
      camera.fov = fovNext
      camera.updateProjectionMatrix()
    }

    // 3. Fortschritt grob quantisiert an die HUD melden
    if (Math.abs(p - lastReportedRef.current) > 0.02 || p >= 1) {
      lastReportedRef.current = p
      store.setTourProgress(p)
    }

    // 4. Kapitelwechsel / Tour-Ende
    if (p >= 1) {
      if (tourStep >= TOUR_STEPS.length - 1) {
        store.endTour(true)
      } else {
        store.setTourStep(tourStep + 1)
      }
    }
  })

  return null
}
