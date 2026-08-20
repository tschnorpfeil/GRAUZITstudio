import { create } from 'zustand'

export type CameraMode = 'driver' | 'orbit' | 'top' | 'macro'

// Halbe Plattenbreite (3.6m) minus Randzone
export const SPLIT_LIMIT = 1.75
export const SLAB_HALF_WIDTH = 1.8

export interface SimulationState {
  // Master-Szenario: 0.0 = Tag/Trocken -> 0.5 = Nacht/Trocken -> 1.0 = Nacht/Starkregen
  condition: number
  daylight: number
  rain: number
  fog: number
  lightAngle: number

  // Interaktiver Vergleich
  splitX: number // Weltkoordinate der Trennlinie. Rechts davon: GRAUZIT
  draggingSplit: boolean

  thermal: boolean
  cameraMode: CameraMode
}

interface SimulationStore extends SimulationState {
  setCondition: (val: number) => void
  setSplitX: (val: number) => void
  setDraggingSplit: (val: boolean) => void
  setThermal: (val: boolean) => void
  setCameraMode: (val: CameraMode) => void
  reset: () => void
}

// Smooth Hermite / S-Curve Easing für natürliche physikalische Übergänge
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

/**
 * Bildet den Master-Regler auf physikalische Umgebungsparameter ab.
 * Phase 1 (0.0 -> 0.5): Tageslicht fällt auf Nacht.
 * Phase 2 (0.5 -> 1.0): Regen und Gischt-Nebel ziehen auf.
 */
export function mapCondition(t: number) {
  const c = Math.max(0, Math.min(1, t))
  const darkPhase = smoothstep(Math.min(1, c / 0.5))
  const rainPhase = smoothstep(Math.max(0, (c - 0.5) / 0.5))
  return {
    daylight: 1.0 - darkPhase,
    rain: rainPhase,
    fog: rainPhase * 0.30,
    lightAngle: 45 + c * 30,
  }
}

const DEFAULT_STATE: SimulationState = {
  condition: 0.0,
  daylight: 1.0,
  rain: 0.0,
  fog: 0.0,
  lightAngle: 45,
  splitX: 0.0,
  draggingSplit: false,
  thermal: false,
  cameraMode: 'orbit',
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  ...DEFAULT_STATE,

  setCondition: (condition: number) => {
    const clamped = Math.max(0, Math.min(1, condition))
    set({ condition: clamped, ...mapCondition(clamped) })
  },

  setSplitX: (val: number) =>
    set({ splitX: Math.max(-SPLIT_LIMIT, Math.min(SPLIT_LIMIT, val)) }),

  setDraggingSplit: (draggingSplit) => set({ draggingSplit }),
  setThermal: (thermal) => set({ thermal }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  reset: () => set({ ...DEFAULT_STATE }),
}))
