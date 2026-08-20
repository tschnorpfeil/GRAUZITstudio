import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StudioLightRigProps {
  position: [number, number, number]
  daylight: number
}

// Radiale Gradient-Textur für den weichen Glow (einmalig generiert)
let glowTexCache: THREE.CanvasTexture | null = null
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexCache) return glowTexCache
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  glowTexCache = new THREE.CanvasTexture(canvas)
  return glowTexCache
}

/**
 * Studio-Sonnenorb mit weichem radialem Halo
 * Taktile visuelle Referenz des Studio-Hauptlichts
 */
export function StudioLightRig({ position, daylight }: StudioLightRigProps) {
  const haloRef = useRef<THREE.Mesh>(null)
  const glowTex = useMemo(() => getGlowTexture(), [])

  useFrame(({ camera }) => {
    // Halo immer zur Kamera billboarden
    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion)
    }
  })

  const [x, y, z] = position
  const isNight = daylight < 0.05
  const orbColor = isNight ? '#39404f' : '#fff9eb'
  const glowColor = isNight ? '#4a5468' : '#ffdf7a'
  const orbScale = isNight ? 0.5 : 0.75 + daylight * 0.35

  return (
    <group position={[x, y, z]}>
      {/* GLÜHENDER EMITTER-KERN */}
      <mesh scale={orbScale}>
        <sphereGeometry args={[0.3, 24, 24]} />
        <meshBasicMaterial color={orbColor} toneMapped={false} />
      </mesh>

      {/* WEICHER RADIALER GLOW-HALO */}
      <mesh ref={haloRef} scale={orbScale * 5.5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTex}
          color={glowColor}
          transparent
          opacity={isNight ? 0.10 : 0.35 + daylight * 0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
