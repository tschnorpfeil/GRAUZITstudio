import { create } from 'zustand'

export interface SimulationState {
  // Master Condition: 0.0 = Hell & Trocken (Tag) <---> 1.0 = Nass & Dunkel (Nachtregen)
  condition: number
  daylight: number
  rain: number
  fog: number
  lightAngle: number
  autoRotate: boolean
  rotateSpeed: number
  cameraMode: 'driver' | 'orbit' | 'top' | 'macro'
}

interface SimulationStore extends SimulationState {
  setCondition: (val: number) => void
  setDaylight: (val: number) => void
  setRain: (val: number) => void
  setFog: (val: number) => void
  setLightAngle: (val: number) => void
  setAutoRotate: (val: boolean) => void
  setRotateSpeed: (val: number) => void
  setCameraMode: (val: 'driver' | 'orbit' | 'top' | 'macro') => void
  reset: () => void
}

// Smooth Hermite / S-Curve Easing for natural physical transitions
function smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

const DEFAULT_STATE: SimulationState = {
  condition: 0.0,
  daylight: 1.0,
  rain: 0.0,
  fog: 0.0,
  lightAngle: 45,
  autoRotate: false,
  rotateSpeed: 0.55,
  cameraMode: 'driver', // Default to Automotive Driver Perspective
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  ...DEFAULT_STATE,

  setCondition: (condition: number) => {
    const clamped = Math.max(0, Math.min(1, condition))
    const eased = smoothstep(clamped)

    set({
      condition: clamped,
      daylight: Math.max(0, 1.0 - eased),
      rain: Math.min(1.0, eased * 1.1),
      fog: eased * 0.30,
      lightAngle: 45 + eased * 30,
    })
  },

  setDaylight: (daylight) => set({ daylight }),
  setRain: (rain) => set({ rain }),
  setFog: (fog) => set({ fog }),
  setLightAngle: (lightAngle) => set({ lightAngle }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setRotateSpeed: (rotateSpeed) => set({ rotateSpeed }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  reset: () => set(DEFAULT_STATE),
}))
