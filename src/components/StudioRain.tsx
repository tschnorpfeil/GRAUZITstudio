import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { ROAD_LENGTH, ROAD_WIDTH, ROAD_CENTER_Z } from './RoadStage'

interface StudioRainProps {
  rain: number
  daylight: number
}

/**
 * Ultraleichte GPU-Regenpartikel über der gesamten 40m-Fahrbahn
 * (ein Draw Call, LineSegments, konstant 60+ FPS auf iGPUs)
 */
export function StudioRain({ rain, daylight }: StudioRainProps) {
  const count = 1300
  const areaW = ROAD_WIDTH + 3
  const areaL = ROAD_LENGTH + 4
  const fallHeight = 6.0

  const rainMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uRain: { value: 0 },
        uColor: { value: new THREE.Color('#e2edf8') },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uRain;
        attribute float speed;
        attribute float offset;
        varying float vAlpha;
        void main() {
          vec3 pos = position;
          float fall = mod(uTime * speed * (0.8 + uRain * 0.4) + offset, ${fallHeight.toFixed(1)});
          pos.y = ${(fallHeight + 0.1).toFixed(1)} - fall;
          vAlpha = 1.0 - smoothstep(${(fallHeight - 0.5).toFixed(1)}, ${fallHeight.toFixed(1)}, pos.y);
          if (pos.y < 0.1) {
             vAlpha = 0.0;
          }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uRain;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(uColor, vAlpha * min(0.55, uRain * 0.65));
        }
      `,
      transparent: true,
      depthWrite: false,
    })
  }, [])

  const rainGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 6)
    const speeds = new Float32Array(count * 2)
    const offsets = new Float32Array(count * 2)

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * areaW
      const z = ROAD_CENTER_Z + (Math.random() - 0.5) * areaL
      const len = 0.18 + Math.random() * 0.14
      const spd = 7.0 + Math.random() * 5.0
      const off = Math.random() * fallHeight

      positions[i * 6] = x
      positions[i * 6 + 1] = 0
      positions[i * 6 + 2] = z

      positions[i * 6 + 3] = x
      positions[i * 6 + 4] = len
      positions[i * 6 + 5] = z

      speeds[i * 2] = spd
      speeds[i * 2 + 1] = spd

      offsets[i * 2] = off
      offsets[i * 2 + 1] = off - len
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1))
    geo.setAttribute('offset', new THREE.BufferAttribute(offsets, 1))
    return geo
  }, [areaW, areaL])

  useFrame(({ clock }) => {
    if (rain < 0.005) return
    rainMat.uniforms.uTime.value = clock.getElapsedTime()
    rainMat.uniforms.uRain.value = rain
    rainMat.uniforms.uColor.value.set(daylight > 0.4 ? '#e2edf8' : '#a0b8d8')
  })

  return (
    <group visible={rain > 0.005}>
      <lineSegments geometry={rainGeo} material={rainMat} frustumCulled={false} />
    </group>
  )
}
