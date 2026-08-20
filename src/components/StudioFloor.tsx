import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface StudioFloorProps {
  daylight?: number
}

/**
 * Unendlicher Studio-Bühnenboden (Cyclorama)
 * Wechselt dynamisch zwischen hellem Showroom und tiefer Mitternachtsbühne
 */
export function StudioFloor({ daylight = 1.0 }: StudioFloorProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  const dayCenter = useMemo(() => new THREE.Color('#cbd5e1'), [])
  const dayEdge = useMemo(() => new THREE.Color('#94a3b8'), [])
  const nightCenter = useMemo(() => new THREE.Color('#0c0f17'), [])
  const nightEdge = useMemo(() => new THREE.Color('#040508'), [])

  const floorMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColorCenter: { value: new THREE.Color() },
        uColorEdge: { value: new THREE.Color() },
        uDaylight: { value: daylight },
      },
      vertexShader: `
        varying vec2 vWorldPos2D;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos2D = worldPos.xz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorCenter;
        uniform vec3 uColorEdge;
        uniform float uDaylight;
        varying vec2 vWorldPos2D;
        void main() {
          float dist = length(vWorldPos2D);
          float radial = smoothstep(1.5, 14.0, dist);
          vec3 baseColor = mix(uColorCenter, uColorEdge, radial);

          // Feines Studio-Raster nahe der Bühne
          vec2 grid = abs(fract(vWorldPos2D - 0.5) - 0.5) / fwidth(vWorldPos2D);
          float line = min(grid.x, grid.y);
          float gridAlpha = (1.0 - min(line, 1.0)) * mix(0.04, 0.08, uDaylight) * (1.0 - smoothstep(3.0, 10.0, dist));

          vec3 gridColor = mix(vec3(0.0), vec3(1.0), 1.0 - uDaylight * 0.7);
          vec3 finalCol = baseColor + gridColor * gridAlpha;
          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
      depthWrite: true,
    })
  }, [])

  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.uDaylight.value = daylight
      matRef.current.uniforms.uColorCenter.value.copy(nightCenter).lerp(dayCenter, daylight)
      matRef.current.uniforms.uColorEdge.value.copy(nightEdge).lerp(dayEdge, daylight)
    }
  })

  return (
    <mesh position={[0, -0.23, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[24, 64]} />
      <primitive ref={matRef} object={floorMat} attach="material" />
    </mesh>
  )
}
