import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js'
import { generateRoadTextures, generateSlabCrossSectionTexture } from '../textures/proceduralTextures'
import { RoadShader, RoadMarkingShader } from '../shaders/roadShader'

interface RoadSampleSlabProps {
  rain: number
  daylight: number
  fog: number
  lightAngle: number
}

// Hoist allocation out of render loop to prevent GC stutters
const _sunDir = new THREE.Vector3()
const _sunColor = new THREE.Color('#ffffff')
const _fogColor = new THREE.Color()

export function RoadSampleSlab({
  rain,
  daylight,
  fog,
  lightAngle,
}: RoadSampleSlabProps) {
  // Slab Dimensions: 5.0m Length x 3.6m Width x 0.20m Thickness
  const slabLength = 5.0
  const slabWidth = 3.6
  const halfWidth = slabWidth / 2
  const slabHeight = 0.2

  // High-Res Procedural PBR Textures (Cached 512x1024 with 4x Anisotropy)
  const standardTex = useMemo(() => generateRoadTextures(false), [])
  const grauzitTex = useMemo(() => generateRoadTextures(true), [])
  const crossSectionTex = useMemo(() => generateSlabCrossSectionTexture(), [])

  // Standard Asphalt Shader Material
  const standardMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RoadShader.uniforms),
      vertexShader: RoadShader.vertexShader,
      fragmentShader: RoadShader.fragmentShader,
    })
    mat.uniforms.uAlbedoMap.value = standardTex.albedo
    mat.uniforms.uNormalMap.value = standardTex.normal
    mat.uniforms.uRoughnessMap.value = standardTex.roughness
    mat.uniforms.uIsGrauzit.value = 0.0
    return mat
  }, [standardTex])

  // GRAUZIT Shader Material
  const grauzitMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RoadShader.uniforms),
      vertexShader: RoadShader.vertexShader,
      fragmentShader: RoadShader.fragmentShader,
    })
    mat.uniforms.uAlbedoMap.value = grauzitTex.albedo
    mat.uniforms.uNormalMap.value = grauzitTex.normal
    mat.uniforms.uRoughnessMap.value = grauzitTex.roughness
    mat.uniforms.uIsGrauzit.value = 1.0
    return mat
  }, [grauzitTex])

  // Stratified Civil Engineering Cross-Section Flanks (Deckschicht, Binderschicht, Tragschicht)
  const slabSideMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color('#ffffff'),
      map: crossSectionTex,
      roughness: 0.85,
      metalness: 0.02,
    })
  }, [crossSectionTex])

  // Authentic 100% Matte Non-Metallic Road Marking Shader (Zero grazing specular sheen)
  const markingMat = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(RoadMarkingShader.uniforms),
      vertexShader: RoadMarkingShader.vertexShader,
      fragmentShader: RoadMarkingShader.fragmentShader,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    })
    return mat
  }, [])

  // Merge markings geometry: Continuous outer edge lines + Dashed center line (StVO Leitlinie)
  const mergedMarkingsGeo = useMemo(() => {
    // Dashed center line segments (Dash 1.6m -> Gap 1.4m -> Dash 1.6m)
    const dash1 = new THREE.PlaneGeometry(0.10, 1.6)
    dash1.rotateX(-Math.PI / 2)
    dash1.translate(0, 0.003, -1.5)

    const dash2 = new THREE.PlaneGeometry(0.10, 1.6)
    dash2.rotateX(-Math.PI / 2)
    dash2.translate(0, 0.003, 1.5)

    // Solid outer edge lines (Begrenzungslinien)
    const leftLine = new THREE.PlaneGeometry(0.06, slabLength)
    leftLine.rotateX(-Math.PI / 2)
    leftLine.translate(-halfWidth + 0.05, 0.003, 0)

    const rightLine = new THREE.PlaneGeometry(0.06, slabLength)
    rightLine.rotateX(-Math.PI / 2)
    rightLine.translate(halfWidth - 0.05, 0.003, 0)

    return BufferGeometryUtils.mergeGeometries([dash1, dash2, leftLine, rightLine])
  }, [halfWidth, slabLength])

  // Update dynamic shader uniforms each frame
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    
    // Mutate hoisted vectors instead of reallocating
    _sunDir.set(
      Math.sin(lightAngle) * 0.45,
      Math.max(0.75, daylight * 1.35),
      Math.cos(lightAngle) * 0.45
    ).normalize()

    const sunIntensity = daylight * 2.6
    
    // Dynamic Fog Color based on daylight
    const fogColorHex = daylight > 0.4 ? '#181c24' : '#08080c'
    _fogColor.set(fogColorHex)

    // Standard Uniforms
    standardMat.uniforms.uRain.value = rain
    standardMat.uniforms.uDaylight.value = daylight
    standardMat.uniforms.uFog.value = fog
    standardMat.uniforms.uFogColor.value.copy(_fogColor)
    standardMat.uniforms.uTime.value = t
    standardMat.uniforms.uSunDirection.value.copy(_sunDir)
    standardMat.uniforms.uSunColor.value.copy(_sunColor)
    standardMat.uniforms.uSunIntensity.value = sunIntensity

    // Grauzit Uniforms
    grauzitMat.uniforms.uRain.value = rain
    grauzitMat.uniforms.uDaylight.value = daylight
    grauzitMat.uniforms.uFog.value = fog
    grauzitMat.uniforms.uFogColor.value.copy(_fogColor)
    grauzitMat.uniforms.uTime.value = t
    grauzitMat.uniforms.uSunDirection.value.copy(_sunDir)
    grauzitMat.uniforms.uSunColor.value.copy(_sunColor)
    grauzitMat.uniforms.uSunIntensity.value = sunIntensity

    // Marking Uniforms
    markingMat.uniforms.uRain.value = rain
    markingMat.uniforms.uDaylight.value = daylight
    markingMat.uniforms.uFog.value = fog
    markingMat.uniforms.uFogColor.value.copy(_fogColor)
    markingMat.uniforms.uSunDirection.value.copy(_sunDir)
    markingMat.uniforms.uSunColor.value.copy(_sunColor)
    markingMat.uniforms.uSunIntensity.value = sunIntensity
  })

  return (
    <group position={[0, slabHeight / 2, 0]}>
      {/* 1. TOP SURFACE: LEFT HALF (Standard Asphalt) */}
      <mesh position={[-halfWidth / 2, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfWidth, slabLength, 2, 2]} />
        <primitive object={standardMat} attach="material" />
      </mesh>

      {/* 2. TOP SURFACE: RIGHT HALF (GRAUZIT 50/50 Edelsplitt) */}
      <mesh position={[halfWidth / 2, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[halfWidth, slabLength, 2, 2]} />
        <primitive object={grauzitMat} attach="material" />
      </mesh>

      {/* 3. MERGED ROAD MARKINGS (Authentic 100% Matte Chalk Dispersion) */}
      <mesh geometry={mergedMarkingsGeo} receiveShadow>
        <primitive object={markingMat} attach="material" />
      </mesh>

      {/* 4. SLAB CROSS-SECTION BASE */}
      <mesh position={[0, -slabHeight / 2 - 0.003, 0]} castShadow receiveShadow>
        <boxGeometry args={[slabWidth, slabHeight, slabLength]} />
        <primitive object={slabSideMaterial} attach="material" />
      </mesh>

      {/* 5. CLEAN BASE ACCENT */}
      <mesh position={[0, -slabHeight - 0.015, 0]}>
        <boxGeometry args={[slabWidth + 0.08, 0.018, slabLength + 0.08]} />
        <meshStandardMaterial color="#16181b" roughness={0.6} metalness={0.8} />
      </mesh>
    </group>
  )
}
