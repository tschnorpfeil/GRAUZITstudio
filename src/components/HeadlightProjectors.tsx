import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface HeadlightProjectorsProps {
  daylight: number
  fog: number
}

/**
 * Photometrische Abblendlicht-Projektoren (ECE R149) mit
 * volumetrischen Kegeln – automatisch und stufenlos aktiv bei Nacht
 */
export function HeadlightProjectors({ daylight, fog }: HeadlightProjectorsProps) {
  const spotLeftRef = useRef<THREE.SpotLight>(null)
  const spotRightRef = useRef<THREE.SpotLight>(null)
  const coneLeftRef = useRef<THREE.Mesh>(null)
  const coneRightRef = useRef<THREE.Mesh>(null)

  const curIntensity = useRef(0.0)
  const curFog = useRef(0.0)

  // Volumetrische Kegel-Geometrie
  const coneGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.04, 1.8, 7.0, 24, 1, true)
    geo.translate(0, -3.5, 0)
    geo.rotateX(-Math.PI / 2)
    return geo
  }, [])

  const coneMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#e6f0ff') },
        uIntensity: { value: 0.0 },
        uFog: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        uniform float uFog;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          float distFade = smoothstep(0.0, -0.4, vPosition.z) * smoothstep(-7.0, -1.5, vPosition.z);
          float edgeFade = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          float fogBoost = mix(0.20, 1.8, pow(uFog, 0.75));
          float alpha = distFade * edgeFade * uIntensity * fogBoost;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }, [])

  const carZ = 3.3
  const carY = 0.70
  const lampSeparation = 1.35

  const leftTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(-0.55, 0.05, -2.5)
    return obj
  }, [])

  const rightTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(0.55, 0.05, -2.5)
    return obj
  }, [])

  useFrame((_, delta) => {
    const targetIsOn = THREE.MathUtils.clamp((0.55 - daylight) / 0.55, 0, 1)
    const lambda = 5.5

    curIntensity.current = THREE.MathUtils.damp(curIntensity.current, targetIsOn, lambda, delta)
    curFog.current = THREE.MathUtils.damp(curFog.current, fog, lambda, delta)

    const inten = curIntensity.current
    const fg = curFog.current

    if (spotLeftRef.current) spotLeftRef.current.intensity = inten * 48.0
    if (spotRightRef.current) spotRightRef.current.intensity = inten * 48.0

    coneMat.uniforms.uIntensity.value = inten
    coneMat.uniforms.uFog.value = fg

    const visible = inten > 0.01
    if (coneLeftRef.current) coneLeftRef.current.visible = visible
    if (coneRightRef.current) coneRightRef.current.visible = visible
  })

  return (
    <group>
      <primitive object={leftTarget} />
      <primitive object={rightTarget} />

      {/* LINKER SCHEINWERFER */}
      <group position={[-lampSeparation / 2, carY, carZ]}>
        <spotLight
          ref={spotLeftRef}
          target={leftTarget}
          color="#f4f8ff"
          intensity={0}
          distance={14}
          angle={Math.PI / 4.2}
          penumbra={0.55}
        />
        <mesh ref={coneLeftRef} geometry={coneGeo} material={coneMat} visible={false} />
      </group>

      {/* RECHTER SCHEINWERFER */}
      <group position={[lampSeparation / 2, carY, carZ]}>
        <spotLight
          ref={spotRightRef}
          target={rightTarget}
          color="#f4f8ff"
          intensity={0}
          distance={14}
          angle={Math.PI / 4.2}
          penumbra={0.55}
        />
        <mesh ref={coneRightRef} geometry={coneGeo} material={coneMat} visible={false} />
      </group>
    </group>
  )
}
