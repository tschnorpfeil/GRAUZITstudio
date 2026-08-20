import { useMemo } from 'react'
import * as THREE from 'three'

interface ObstacleComparisonProps {
  showObstacles: boolean
  daylight?: number
  rain?: number
}

export function ObstacleComparison({ showObstacles }: ObstacleComparisonProps) {
  const obstacleMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1a1a1c'), // Dark lost tire tread / rubber fragment
      roughness: 0.9,
      metalness: 0.1,
    })
  }, [])

  if (!showObstacles) return null

  const distZ = -14 // 14 meters down the road

  return (
    <group>
      {/* OBSTACLE ON LEFT LANE (Standard Dark Asphalt) */}
      <group position={[-1.9, 0, distZ]}>
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.28, 0.45]} />
          <primitive object={obstacleMaterial} attach="material" />
        </mesh>
      </group>

      {/* OBSTACLE ON RIGHT LANE (GRAUZIT Brightened Asphalt) */}
      <group position={[1.9, 0, distZ]}>
        <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.28, 0.45]} />
          <primitive object={obstacleMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  )
}
