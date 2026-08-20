import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import { generateRoadTextures, generateSlabCrossSectionTexture } from '../textures/proceduralTextures'
import { RoadShader, RoadMarkingShader } from '../shaders/roadShader'
import { useSimulationStore } from '../store'

// Straßengeometrie: 40m zweistreifige Fahrbahn (RQ 7 nach RAL)
export const ROAD_LENGTH = 40
export const ROAD_WIDTH = 7
export const ROAD_CENTER_Z = -10 // Fahrbahn von z=+10 bis z=-30
const ROAD_THICKNESS = 0.3

// Allokationen aus dem Render-Loop heben (verhindert GC-Stotterer)
const _sunDir = new THREE.Vector3()
const _sunColor = new THREE.Color('#ffffff')
const _fogColor = new THREE.Color()

export function RoadStage() {
  // Prozedurale PBR-Texturen (gecacht, 1024x1024, 16x Anisotropie)
  const standardTex = useMemo(() => generateRoadTextures(false), [])
  const grauzitTex = useMemo(() => generateRoadTextures(true), [])
  const crossSectionTex = useMemo(() => generateSlabCrossSectionTexture(), [])

  // Ein gemergter Dual-Material-Shader für die gesamte Fahrbahn (1 Draw Call)
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
    mat.uniforms.uTiling.value.set(4.0, 22.0)
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

  // Markierungen: durchgezogene Randlinien + Leitlinie (StVO: 3m Strich / 3m Lücke)
  const mergedMarkingsGeo = useMemo(() => {
    const geos: THREE.BufferGeometry[] = []

    for (let z = -ROAD_LENGTH / 2 + 2; z < ROAD_LENGTH / 2; z += 6) {
      const dash = new THREE.PlaneGeometry(0.12, 3)
      dash.rotateX(-Math.PI / 2)
      dash.translate(0, 0.004, z + 1.5)
      geos.push(dash)
    }

    const leftLine = new THREE.PlaneGeometry(0.12, ROAD_LENGTH)
    leftLine.rotateX(-Math.PI / 2)
    leftLine.translate(-ROAD_WIDTH / 2 + 0.22, 0.004, 0)
    geos.push(leftLine)

    const rightLine = new THREE.PlaneGeometry(0.12, ROAD_LENGTH)
    rightLine.rotateX(-Math.PI / 2)
    rightLine.translate(ROAD_WIDTH / 2 - 0.22, 0.004, 0)
    geos.push(rightLine)

    return BufferGeometryUtils.mergeGeometries(geos)
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

    // Weiche Übergänge für Trennlinie & Wärmebild
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
    <group position={[0, 0, ROAD_CENTER_Z]}>
      {/* 1. FAHRBAHNOBERFLÄCHE: ein Mesh, Dual-Material-Shader mit Wipe */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH, 2, 2]} />
        <primitive object={roadMat} attach="material" />
      </mesh>

      {/* 2. FAHRBAHNMARKIERUNGEN (matte Kreide-Dispersion, Reflexperlen) */}
      <mesh geometry={mergedMarkingsGeo}>
        <primitive object={markingMat} attach="material" />
      </mesh>

      {/* 3. STRASSENAUFBAU-QUERSCHNITT (sichtbare Flanken) */}
      <mesh position={[0, -ROAD_THICKNESS / 2 - 0.004, 0]} receiveShadow>
        <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, ROAD_LENGTH]} />
        <primitive object={slabSideMaterial} attach="material" />
      </mesh>
    </group>
  )
}
