import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Sternenhimmel bei Nacht: 600 Punkte auf einer Kuppel, blendet mit dem
 * Tageslicht ein/aus. Ein Draw Call, kein messbarer GPU-Overhead.
 */
export function NightSky({ daylight }: { daylight: number }) {
  const matRef = useRef<THREE.PointsMaterial>(null)

  const geo = useMemo(() => {
    const count = 600
    const positions = new Float32Array(count * 3)
    const radius = 85

    let i = 0
    while (i < count) {
      // Gleichverteilte Punkte auf der oberen Halbkugel (y > 8)
      const u = Math.random() * 2 - 1
      const phi = Math.random() * Math.PI * 2
      const sq = Math.sqrt(1 - u * u)
      const x = sq * Math.cos(phi) * radius
      const y = Math.abs(u) * radius
      const z = sq * Math.sin(phi) * radius
      if (y < 10) continue

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z - 10
      i++
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return g
  }, [])

  useFrame(() => {
    if (matRef.current) {
      matRef.current.opacity = Math.max(0, 1 - daylight * 2.2) * 0.9
    }
  })

  return (
    <points geometry={geo} visible={daylight < 0.45} frustumCulled={false}>
      <pointsMaterial
        ref={matRef}
        color="#cfe0ff"
        size={0.28}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  )
}
