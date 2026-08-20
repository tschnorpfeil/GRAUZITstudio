import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StudioLightRigProps {
  position: [number, number, number]
  daylight: number
}

/**
 * Premium Studio Luminaire & Sun Orb (AAA Design)
 * Provides tactile visual reference of the studio key light without harsh CAD lines
 */
export function StudioLightRig({ position, daylight }: StudioLightRigProps) {
  const haloRef = useRef<THREE.Mesh>(null)

  useFrame(({ camera }) => {
    // Billboard the halo to always face the camera
    if (haloRef.current) {
      haloRef.current.quaternion.copy(camera.quaternion)
    }
  })

  const [x, y, z] = position
  const isNight = daylight < 0.05
  const orbColor = isNight ? '#2a303c' : '#fff9eb'
  const glowColor = isNight ? '#1e2430' : '#f1c302'
  const orbScale = isNight ? 0.5 : 0.75 + daylight * 0.35

  return (
    <group position={[x, y, z]}>
      {/* 1. STUDIO SPOTLIGHT CASING / FIXTURE */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color="#16181d" roughness={0.35} metalness={0.8} />
      </mesh>

      {/* 2. GLOWING EMITTER LENS CORE */}
      <mesh scale={orbScale}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color={orbColor} toneMapped={false} />
      </mesh>

      {/* 3. SOFT BILLBOARDED GLOW HALO */}
      <mesh ref={haloRef} scale={orbScale * 2.8}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={isNight ? 0.08 : 0.25 + daylight * 0.3}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}
