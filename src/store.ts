import { create } from 'zustand'

export type CameraMode = 'driver' | 'orbit' | 'top' | 'macro'
export type AppMode = 'intro' | 'tour' | 'explore'

export interface SimulationState {
  // Master-Szenario: 0.0 = Tag/Trocken -> 0.5 = Nacht/Trocken -> 1.0 = Nacht/Starkregen
  condition: number
  daylight: number
  rain: number
  fog: number
  lightAngle: number

  // Interaktiver Vergleich
  splitX: number // Weltkoordinate der Trennlinie (-3.5 .. +3.5). Rechts davon: GRAUZIT
  draggingSplit: boolean

  // Ansichten & Szenario-Extras
  thermal: boolean
  obstacles: boolean
  cameraMode: CameraMode

  // App-Ablauf
  mode: AppMode
  tourStep: number
  tourProgress: number // 0..1 innerhalb des aktuellen Kapitels (grob quantisiert)
  endCard: boolean
}

interface SimulationStore extends SimulationState {
  setCondition: (val: number) => void
  setSplitX: (val: number) => void
  setDraggingSplit: (val: boolean) => void
  setThermal: (val: boolean) => void
  setObstacles: (val: boolean) => void
  setCameraMode: (val: CameraMode) => void
  startTour: () => void
  setTourStep: (val: number) => void
  setTourProgress: (val: number) => void
  endTour: (showEndCard: boolean) => void
  enterExplore: () => void
  dismissEndCard: () => void
}

// Smooth Hermite / S-Curve Easing für natürliche physikalische Übergänge
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

export const SPLIT_LIMIT = 3.49

/**
 * Bildet den Master-Regler auf physikalische Umgebungsparameter ab.
 * Phase 1 (0.0 -> 0.5): Tageslicht faellt auf Nacht.
 * Phase 2 (0.5 -> 1.0): Regen und Gischt-Nebel ziehen auf.
 */
export function mapCondition(t: number) {
  const c = Math.max(0, Math.min(1, t))
  const darkPhase = smoothstep(Math.min(1, c / 0.5))
  const rainPhase = smoothstep(Math.max(0, (c - 0.5) / 0.5))
  return {
    daylight: 1.0 - darkPhase,
    rain: rainPhase,
    fog: rainPhase * 0.32,
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
  obstacles: false,
  cameraMode: 'orbit',
  mode: 'intro',
  tourStep: 0,
  tourProgress: 0,
  endCard: false,
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
  setObstacles: (obstacles) => set({ obstacles }),
  setCameraMode: (cameraMode) => set({ cameraMode }),

  startTour: () =>
    set({
      mode: 'tour',
      tourStep: 0,
      tourProgress: 0,
      endCard: false,
      thermal: false,
      obstacles: false,
      // Wipe-Dramaturgie: Tour beginnt mit reiner Standard-Fahrbahn,
      // GRAUZIT zieht im ersten Kapitel sichtbar ein
      splitX: SPLIT_LIMIT,
    }),

  setTourStep: (tourStep) => set({ tourStep, tourProgress: 0 }),
  setTourProgress: (tourProgress) => set({ tourProgress }),

  endTour: (showEndCard: boolean) =>
    set({ mode: 'explore', endCard: showEndCard, tourProgress: 0 }),

  enterExplore: () => set({ mode: 'explore', endCard: false }),
  dismissEndCard: () => set({ endCard: false }),
}))
