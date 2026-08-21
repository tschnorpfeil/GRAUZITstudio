import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import { generateRoadTextures } from '../textures/proceduralTextures'
import { RoadShader, RoadMarkingShader } from '../shaders/roadShader'
import { useSimulationStore } from '../store'

// Deckschicht: 5.0m Länge x 3.6m Breite x 0.035m Dicke (ca. 3,5 cm Asphaltdeckschicht)
export const SLAB_LENGTH = 5.0
export const SLAB_WIDTH = 3.6
export const SLAB_HEIGHT = 0.035
export const SLAB_TOP_Y = SLAB_HEIGHT
const HALF_WIDTH = SLAB_WIDTH / 2

// Allokationen aus dem Render-Loop heben (verhindert GC-Stotterer)
const _sunDir = new THREE.Vector3()
const _sunColor = new THREE.Color('#ffffff')
const _fogColor = new THREE.Color()

export function RoadStage() {
  // Prozedurale PBR-Texturen (gecacht, 1024x1024, 16x Anisotropie)
  const standardTex = useMemo(() => generateRoadTextures(false), [])
  const grauzitTex = useMemo(() => generateRoadTextures(true), [])

  // Ein gemergter Dual-Material-Shader für die gesamte Platte (1 Draw Call)
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

  // Solide, dunkle Asphaltkanten der 3,5 cm Deckschicht
  const slabSideMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#1c1e22'),
      roughness: 0.92,
      metalness: 0.03,
    })
  }, [])

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

  const curDaylight = useRef(1.0)
  const curRain = useRef(0.0)
  const curFog = useRef(0.0)
  const curLightAngle = useRef(45)
  const curThermal = useRef(0.0)

  // Dynamische Uniforms pro Frame direkt aus dem Store mit weicher Dämpfung
  useFrame(({ clock }, delta) => {
    const s = useSimulationStore.getState()
    const t = clock.getElapsedTime()
    const lambda = 5.5

    curDaylight.current = THREE.MathUtils.damp(curDaylight.current, s.daylight, lambda, delta)
    curRain.current = THREE.MathUtils.damp(curRain.current, s.rain, lambda, delta)
    curFog.current = THREE.MathUtils.damp(curFog.current, s.fog, lambda, delta)
    curLightAngle.current = THREE.MathUtils.damp(curLightAngle.current, s.lightAngle, lambda, delta)
    curThermal.current = THREE.MathUtils.damp(curThermal.current, s.thermal ? 1.0 : 0.0, 5.0, delta)

    const dl = curDaylight.current
    const rn = curRain.current
    const fg = curFog.current
    const la = curLightAngle.current
    const th = curThermal.current

    const lightRad = (la * Math.PI) / 180

    _sunDir
      .set(
        Math.sin(lightRad) * 0.45,
        Math.max(0.75, dl * 1.35),
        Math.cos(lightRad) * 0.45
      )
      .normalize()

    const sunIntensity = dl * 2.6
    _fogColor.set(dl > 0.4 ? '#181c24' : '#08080c')

    const u = roadMat.uniforms
    u.uSplitX.value = 0.0
    u.uThermal.value = th
    u.uRain.value = rn
    u.uDaylight.value = dl
    u.uFog.value = fg
    u.uFogColor.value.copy(_fogColor)
    u.uTime.value = t
    u.uSunDirection.value.copy(_sunDir)
    u.uSunColor.value.copy(_sunColor)
    u.uSunIntensity.value = sunIntensity

    const m = markingMat.uniforms
    m.uThermal.value = th
    m.uRain.value = rn
    m.uDaylight.value = dl
    m.uFog.value = fg
    m.uFogColor.value.copy(_fogColor)
    m.uSunDirection.value.copy(_sunDir)
    m.uSunColor.value.copy(_sunColor)
    m.uSunIntensity.value = sunIntensity
  })

  return (
    <group position={[0, SLAB_HEIGHT / 2, 0]}>
      {/* 1. FAHRBAHNOBERFLÄCHE: Dual-Material-Shader (Standard vs. GRAUZIT) */}
      <mesh position={[0, SLAB_HEIGHT / 2 + 0.0005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[SLAB_WIDTH, SLAB_LENGTH, 2, 2]} />
        <primitive object={roadMat} attach="material" />
      </mesh>

      {/* 2. FAHRBAHNMARKIERUNGEN (Reflexperlen nach DIN EN 1436) */}
      <mesh geometry={mergedMarkingsGeo} position={[0, SLAB_HEIGHT / 2, 0]}>
        <primitive object={markingMat} attach="material" />
      </mesh>

      {/* 3. 3,5 cm DECKSCHICHT-KÖRPER (Solide Asphaltflanken) */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[SLAB_WIDTH, SLAB_HEIGHT, SLAB_LENGTH]} />
        <primitive object={slabSideMaterial} attach="material" />
      </mesh>
    </group>
  )
}
