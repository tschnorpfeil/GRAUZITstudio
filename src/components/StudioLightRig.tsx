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
  const groupRef = useRef<THREE.Group>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const orbMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const haloMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const curDaylight = useRef(1.0)
  const curPos = useRef(new THREE.Vector3(...position))
  const glowTex = useMemo(() => getGlowTexture(), [])

  const dayOrbColor = useMemo(() => new THREE.Color('#fff9eb'), [])
  const nightOrbColor = useMemo(() => new THREE.Color('#39404f'), [])
  const dayGlowColor = useMemo(() => new THREE.Color('#ffdf7a'), [])
  const nightGlowColor = useMemo(() => new THREE.Color('#4a5468'), [])
  const _tmpCol = useMemo(() => new THREE.Color(), [])

  useFrame(({ camera }, delta) => {
    const lambda = 5.5
    curDaylight.current = THREE.MathUtils.damp(curDaylight.current, daylight, lambda, delta)
    const dl = curDaylight.current

    curPos.current.x = THREE.MathUtils.damp(curPos.current.x, position[0], lambda, delta)
    curPos.current.y = THREE.MathUtils.damp(curPos.current.y, position[1], lambda, delta)
    curPos.current.z = THREE.MathUtils.damp(curPos.current.z, position[2], lambda, delta)

    if (groupRef.current) {
      groupRef.current.position.copy(curPos.current)
      const scale = THREE.MathUtils.lerp(0.5, 1.1, dl)
      groupRef.current.scale.setScalar(scale)
    }

    if (orbMatRef.current) {
      _tmpCol.copy(nightOrbColor).lerp(dayOrbColor, dl)
      orbMatRef.current.color.copy(_tmpCol)
    }

    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion)
    }

    if (haloMatRef.current) {
      _tmpCol.copy(nightGlowColor).lerp(dayGlowColor, dl)
      haloMatRef.current.color.copy(_tmpCol)
      haloMatRef.current.opacity = THREE.MathUtils.lerp(0.08, 0.65, dl)
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* GLÜHENDER EMITTER-KERN */}
      <mesh>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshBasicMaterial ref={orbMatRef} color="#fff9eb" toneMapped={false} />
      </mesh>

      {/* WEICHER RADIALER GLOW-HALO */}
      <mesh ref={haloRef} scale={4.5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={haloMatRef}
          map={glowTex}
          color="#ffdf7a"
          transparent
          opacity={0.65}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
