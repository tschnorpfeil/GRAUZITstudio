import { useMemo } from 'react'
import * as THREE from 'three'

interface HeadlightProjectorsProps {
  daylight: number
  fog: number
}

/**
 * Photometrische Abblendlicht-Projektoren (ECE R149) mit
 * volumetrischen Kegeln – automatisch aktiv bei Nacht
 */
export function HeadlightProjectors({ daylight, fog }: HeadlightProjectorsProps) {
  // Automatisches, lineares Einschalten unterhalb von Daylight 0.55
  const isLightOn = THREE.MathUtils.clamp((0.55 - daylight) / 0.55, 0, 1)
  const beamIntensity = isLightOn * 48.0

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

  if (coneMat.uniforms.uIntensity) {
    coneMat.uniforms.uIntensity.value = isLightOn
    coneMat.uniforms.uFog.value = fog
  }

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

  return (
    <group>
      <primitive object={leftTarget} />
      <primitive object={rightTarget} />

      {/* LINKER SCHEINWERFER */}
      <group position={[-lampSeparation / 2, carY, carZ]}>
        <spotLight
          target={leftTarget}
          color="#f4f8ff"
          intensity={beamIntensity}
          distance={14}
          angle={Math.PI / 4.2}
          penumbra={0.55}
        />
        {isLightOn > 0.05 && <mesh geometry={coneGeo} material={coneMat} />}
      </group>

      {/* RECHTER SCHEINWERFER */}
      <group position={[lampSeparation / 2, carY, carZ]}>
        <spotLight
          target={rightTarget}
          color="#f4f8ff"
          intensity={beamIntensity}
          distance={14}
          angle={Math.PI / 4.2}
          penumbra={0.55}
        />
        {isLightOn > 0.05 && <mesh geometry={coneGeo} material={coneMat} />}
      </group>
    </group>
  )
}
