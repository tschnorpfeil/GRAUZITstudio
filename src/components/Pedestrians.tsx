import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore } from '../store'

const PEDESTRIAN_Z = -16 // ~22m vor dem Fahrerstandpunkt
const CLOTH_COLOR = new THREE.Color('#1b1b1e')
const SKIN_COLOR = new THREE.Color('#5f4f42')
const THERMAL_BODY = new THREE.Color('#ff9f1a')
const THERMAL_HEAD = new THREE.Color('#f0402a')

/**
 * Das Sicherheits-Szenario: identische Fußgänger auf beiden Fahrstreifen.
 * Auf dunklem Standard-Asphalt verschwindet die Silhouette bei Nacht –
 * auf GRAUZIT hebt sie sich deutlich vom hellen Belag ab.
 * Im Wärmebild leuchten beide Personen (FLIR-realistisch).
 */
function PedestrianFigure({ x, mirror }: { x: number; mirror: boolean }) {
  const clothMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CLOTH_COLOR.clone(),
        roughness: 0.92,
        metalness: 0.0,
      }),
    []
  )
  const headMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: SKIN_COLOR.clone(),
        roughness: 0.75,
        metalness: 0.0,
      }),
    []
  )

  const thermalRef = useRef(0)

  useFrame((_, delta) => {
    const s = useSimulationStore.getState()
    const target = s.thermal ? 1 : 0
    thermalRef.current += (target - thermalRef.current) * Math.min(1, delta * 3.5)
    const th = thermalRef.current

    clothMat.color.copy(CLOTH_COLOR).lerp(THERMAL_BODY, th)
    clothMat.emissive.copy(THERMAL_BODY).multiplyScalar(th * 0.9)
    headMat.color.copy(SKIN_COLOR).lerp(THERMAL_HEAD, th)
    headMat.emissive.copy(THERMAL_HEAD).multiplyScalar(th * 1.1)
  })

  const armAngle = mirror ? -0.22 : 0.22

  return (
    <group position={[x, 0, PEDESTRIAN_Z]} rotation={[0, mirror ? 0.35 : -0.35, 0]}>
      {/* Beine */}
      <mesh position={[-0.11, 0.4, 0]} castShadow material={clothMat}>
        <capsuleGeometry args={[0.082, 0.52, 3, 10]} />
      </mesh>
      <mesh position={[0.11, 0.4, 0.04]} castShadow material={clothMat}>
        <capsuleGeometry args={[0.082, 0.52, 3, 10]} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.06, 0]} castShadow material={clothMat}>
        <capsuleGeometry args={[0.17, 0.46, 3, 12]} />
      </mesh>
      {/* Arme */}
      <mesh position={[-0.26, 1.05, 0]} rotation={[0, 0, armAngle]} castShadow material={clothMat}>
        <capsuleGeometry args={[0.055, 0.42, 3, 8]} />
      </mesh>
      <mesh position={[0.26, 1.05, 0]} rotation={[0, 0, -armAngle]} castShadow material={clothMat}>
        <capsuleGeometry args={[0.055, 0.42, 3, 8]} />
      </mesh>
      {/* Kopf */}
      <mesh position={[0, 1.56, 0]} castShadow material={headMat}>
        <sphereGeometry args={[0.115, 16, 14]} />
      </mesh>
    </group>
  )
}

export function Pedestrians() {
  const obstacles = useSimulationStore((s) => s.obstacles)

  if (!obstacles) return null

  return (
    <group>
      {/* Linker Fahrstreifen: Standard-Asphalt */}
      <PedestrianFigure x={-1.75} mirror={false} />
      {/* Rechter Fahrstreifen: GRAUZIT */}
      <PedestrianFigure x={1.75} mirror={true} />
    </group>
  )
}
