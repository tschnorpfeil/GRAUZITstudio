import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import { generateRoadTextures, generateSlabCrossSectionTexture } from '../textures/proceduralTextures'
import { RoadShader, RoadMarkingShader } from '../shaders/roadShader'
import { useSimulationStore } from '../store'

// Musterplatte: 5.0m Länge x 3.6m Breite x 0.20m Aufbau (wie Original)
export const SLAB_LENGTH = 5.0
export const SLAB_WIDTH = 3.6
export const SLAB_TOP_Y = 0.101 // Weltkoordinate der Fahrbahnoberfläche
const SLAB_HEIGHT = 0.2
const HALF_WIDTH = SLAB_WIDTH / 2

// Allokationen aus dem Render-Loop heben (verhindert GC-Stotterer)
const _sunDir = new THREE.Vector3()
const _sunColor = new THREE.Color('#ffffff')
const _fogColor = new THREE.Color()

export function RoadStage() {
  // Prozedurale PBR-Texturen (gecacht, 1024x1024, 16x Anisotropie)
  const standardTex = useMemo(() => generateRoadTextures(false), [])
  const grauzitTex = useMemo(() => generateRoadTextures(true), [])
  const crossSectionTex = useMemo(() => generateSlabCrossSectionTexture(), [])

  // Ein gemergter Dual-Material-Shader für die gesamte Platte (1 Draw Call,
  // frei ziehbare Vergleichslinie via uSplitX)
  const roadMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RoadShader.uniforms),
      vertexShader: RoadShader.vertexShader,
      fragmentShader: RoadShader.fragmentShader,
    })
    mat.uniforms.uAlbedoStd.value = standardTex.albedo
    mat.uniforms.uNormalStd.value = standardTex.normal
    mat.uniforms.uRoughStd.value = standardTex.roughness
    mat.uniforms.uAlbedoGz.value = grauzitTex.albedo
    mat.uniforms.uNormalGz.value = grauzitTex.normal
    mat.uniforms.uRoughGz.value = grauzitTex.roughness
    mat.uniforms.uTiling.value.set(3.2, 6.8)
    return mat
  }, [standardTex, grauzitTex])

  // Geschichteter Straßenaufbau an den Flanken (Deck-, Binder-, Tragschicht)
  const slabSideMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: crossSectionTex,
      roughness: 0.85,
      metalness: 0.02,
    })
  }, [crossSectionTex])

  // 100% matter Markierungsshader (keine Metallic-Reflexe)
  const markingMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RoadMarkingShader.uniforms),
      vertexShader: RoadMarkingShader.vertexShader,
      fragmentShader: RoadMarkingShader.fragmentShader,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
  }, [])

  // Markierungen: Leitlinien-Striche + durchgezogene Randlinien (StVO)
  const mergedMarkingsGeo = useMemo(() => {
    const dash1 = new THREE.PlaneGeometry(0.10, 1.6)
    dash1.rotateX(-Math.PI / 2)
    dash1.translate(0, 0.003, -1.5)

    const dash2 = new THREE.PlaneGeometry(0.10, 1.6)
    dash2.rotateX(-Math.PI / 2)
    dash2.translate(0, 0.003, 1.5)

    const leftLine = new THREE.PlaneGeometry(0.06, SLAB_LENGTH)
    leftLine.rotateX(-Math.PI / 2)
    leftLine.translate(-HALF_WIDTH + 0.05, 0.003, 0)

    const rightLine = new THREE.PlaneGeometry(0.06, SLAB_LENGTH)
    rightLine.rotateX(-Math.PI / 2)
    rightLine.translate(HALF_WIDTH - 0.05, 0.003, 0)

    return BufferGeometryUtils.mergeGeometries([dash1, dash2, leftLine, rightLine])
  }, [])

  // Dynamische Uniforms pro Frame direkt aus dem Store (keine React-Re-Renders)
  useFrame(({ clock }, delta) => {
    const s = useSimulationStore.getState()
    const t = clock.getElapsedTime()
    const lightRad = (s.lightAngle * Math.PI) / 180

    _sunDir
      .set(
        Math.sin(lightRad) * 0.45,
        Math.max(0.75, s.daylight * 1.35),
        Math.cos(lightRad) * 0.45
      )
      .normalize()

    const sunIntensity = s.daylight * 2.6
    _fogColor.set(s.daylight > 0.4 ? '#181c24' : '#08080c')

    // Weiche Übergänge für Wärmebild
    const u = roadMat.uniforms
    const thermalTarget = s.thermal ? 1.0 : 0.0
    const thermalNow = u.uThermal.value as number
    const thermalNext = thermalNow + (thermalTarget - thermalNow) * Math.min(1, delta * 3.5)

    u.uSplitX.value = s.splitX
    u.uThermal.value = thermalNext
    u.uRain.value = s.rain
    u.uDaylight.value = s.daylight
    u.uFog.value = s.fog
    u.uFogColor.value.copy(_fogColor)
    u.uTime.value = t
    u.uSunDirection.value.copy(_sunDir)
    u.uSunColor.value.copy(_sunColor)
    u.uSunIntensity.value = sunIntensity

    const m = markingMat.uniforms
    m.uThermal.value = thermalNext
    m.uRain.value = s.rain
    m.uDaylight.value = s.daylight
    m.uFog.value = s.fog
    m.uFogColor.value.copy(_fogColor)
    m.uSunDirection.value.copy(_sunDir)
    m.uSunColor.value.copy(_sunColor)
    m.uSunIntensity.value = sunIntensity
  })

  return (
    <group position={[0, SLAB_HEIGHT / 2, 0]}>
      {/* 1. FAHRBAHNOBERFLÄCHE: ein Mesh, Dual-Material-Shader mit Wipe */}
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SLAB_WIDTH, SLAB_LENGTH, 2, 2]} />
        <primitive object={roadMat} attach="material" />
      </mesh>

      {/* 2. FAHRBAHNMARKIERUNGEN (matte Kreide-Dispersion, Reflexperlen) */}
      <mesh geometry={mergedMarkingsGeo}>
        <primitive object={markingMat} attach="material" />
      </mesh>

      {/* 3. STRASSENAUFBAU-QUERSCHNITT (sichtbare Flanken nach RStO) */}
      <mesh position={[0, -SLAB_HEIGHT / 2 - 0.003, 0]} castShadow receiveShadow>
        <boxGeometry args={[SLAB_WIDTH, SLAB_HEIGHT, SLAB_LENGTH]} />
        <primitive object={slabSideMaterial} attach="material" />
      </mesh>

      {/* 4. SOCKEL-AKZENT */}
      <mesh position={[0, -SLAB_HEIGHT - 0.015, 0]}>
        <boxGeometry args={[SLAB_WIDTH + 0.08, 0.018, SLAB_LENGTH + 0.08]} />
        <meshStandardMaterial color="#16181b" roughness={0.6} metalness={0.8} />
      </mesh>
    </group>
  )
}
