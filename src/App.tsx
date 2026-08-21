import React, { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

import { RoadStage } from './components/RoadStage'
import { HeadlightProjectors } from './components/HeadlightProjectors'
import { StudioRain } from './components/StudioRain'
import { StudioLightRig } from './components/StudioLightRig'
import { StudioFloor } from './components/StudioFloor'
import { NightSky } from './components/NightSky'
import { HUD } from './components/HUD'
import { useSimulationStore, type CameraMode } from './store'

// Kamera-Presets für die Studio-Musterplatte
const CAMERA_TARGETS: Record<
  CameraMode,
  { position: THREE.Vector3; target: THREE.Vector3; fov: number }
> = {
  driver: {
    // Authentische Fahrerperspektive: 1.15m Augenhöhe, Blick entlang der Spur
    position: new THREE.Vector3(0.0, 1.15, 3.6),
    target: new THREE.Vector3(0.0, 0.035, -1.5),
    fov: 52,
  },
  orbit: {
    position: new THREE.Vector3(3.2, 2.6, 3.6),
    target: new THREE.Vector3(0.0, 0.035, 0.0),
    fov: 45,
  },
  top: {
    position: new THREE.Vector3(0.0, 6.0, 0.01),
    target: new THREE.Vector3(0.0, 0.035, 0.0),
    fov: 40,
  },
  macro: {
    // Nahaufnahme direkt an der Trennlinie: beide Gesteinskörnungen im Bild
    position: new THREE.Vector3(0.45, 0.35, 1.2),
    target: new THREE.Vector3(0.0, 0.035, 0.4),
    fov: 30,
  },
}

function StudioCameraRig() {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const isTransitioningRef = useRef(false)

  const cameraMode = useSimulationStore((s) => s.cameraMode)

  // Preset-Wechsel weich anfahren
  useEffect(() => {
    isTransitioningRef.current = true
  }, [cameraMode])

  useFrame((state, delta) => {
    if (!isTransitioningRef.current) return

    const config = CAMERA_TARGETS[cameraMode]
    const lambda = 5.5

    state.camera.position.x = THREE.MathUtils.damp(state.camera.position.x, config.position.x, lambda, delta)
    state.camera.position.y = THREE.MathUtils.damp(state.camera.position.y, config.position.y, lambda, delta)
    state.camera.position.z = THREE.MathUtils.damp(state.camera.position.z, config.position.z, lambda, delta)

    const cam = state.camera as THREE.PerspectiveCamera
    cam.fov = THREE.MathUtils.damp(cam.fov, config.fov, lambda, delta)
    cam.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.x = THREE.MathUtils.damp(controlsRef.current.target.x, config.target.x, lambda, delta)
      controlsRef.current.target.y = THREE.MathUtils.damp(controlsRef.current.target.y, config.target.y, lambda, delta)
      controlsRef.current.target.z = THREE.MathUtils.damp(controlsRef.current.target.z, config.target.z, lambda, delta)
      controlsRef.current.update()
    }

    // Übergang beenden, sobald angekommen -> 100% freies Orbit & Zoom
    if (
      state.camera.position.distanceTo(config.position) < 0.01 &&
      (!controlsRef.current || controlsRef.current.target.distanceTo(config.target) < 0.01)
    ) {
      isTransitioningRef.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.08}
      maxPolarAngle={Math.PI / 2.02}
      minDistance={0.3}
      maxDistance={25}
      onStart={() => {
        // Nutzer greift ein: Preset-Animation sofort abbrechen
        isTransitioningRef.current = false
      }}
    />
  )
}

// Wiederverwendete Farbobjekte
const _dayBg = new THREE.Color('#d8e2ee')
const _nightBg = new THREE.Color('#06080e')
const _bg = new THREE.Color()
const _fogColorDay = new THREE.Color('#b8c7d9')
const _fogColorNight = new THREE.Color('#090c14')
const _curFogCol = new THREE.Color()

function StudioScene() {
  const { scene } = useThree()
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const sunLightRef = useRef<THREE.DirectionalLight>(null)
  const fillLightRef = useRef<THREE.DirectionalLight>(null)
  const topLightRef = useRef<THREE.DirectionalLight>(null)

  const curDaylight = useRef(1.0)
  const curLightAngle = useRef(45)
  const curFog = useRef(0.0)
  const curRain = useRef(0.0)

  const [smoothedDaylight, setSmoothedDaylight] = React.useState(1.0)
  const [smoothedRain, setSmoothedRain] = React.useState(0.0)
  const [smoothedFog, setSmoothedFog] = React.useState(0.0)
  const [lightPos, setLightPos] = React.useState<[number, number, number]>([0, 8, 4])

  useFrame((_, delta) => {
    const s = useSimulationStore.getState()
    const lambda = 5.5

    curDaylight.current = THREE.MathUtils.damp(curDaylight.current, s.daylight, lambda, delta)
    curLightAngle.current = THREE.MathUtils.damp(curLightAngle.current, s.lightAngle, lambda, delta)
    curFog.current = THREE.MathUtils.damp(curFog.current, s.fog, lambda, delta)
    curRain.current = THREE.MathUtils.damp(curRain.current, s.rain, lambda, delta)

    const dl = curDaylight.current
    const la = curLightAngle.current
    const fg = curFog.current
    const rn = curRain.current

    // 1. Weicher Hintergrundübergang
    _bg.copy(_nightBg).lerp(_dayBg, Math.pow(Math.max(0, dl), 0.8))
    scene.background = _bg

    // 2. Weicher Nebelübergang
    _curFogCol.copy(_fogColorNight).lerp(_fogColorDay, Math.max(0, dl))
    if (!scene.fog) {
      scene.fog = new THREE.FogExp2(_curFogCol, fg * 0.12)
    } else {
      const f = scene.fog as THREE.FogExp2
      f.color.copy(_curFogCol)
      f.density = fg * 0.12
    }

    // 3. Sonnenposition & Lichtkegel
    const lightRad = (la * Math.PI) / 180
    const lightX = Math.sin(lightRad) * 4.2
    const lightZ = Math.cos(lightRad) * 4.2
    const lightY = 6.2 + dl * 2.0

    if (sunLightRef.current) {
      sunLightRef.current.position.set(lightX, lightY, lightZ)
      sunLightRef.current.intensity = dl * 2.8
    }
    if (fillLightRef.current) {
      fillLightRef.current.position.set(-lightX * 0.5, 4, -lightZ * 0.5)
      fillLightRef.current.intensity = dl * 0.85
    }
    if (topLightRef.current) {
      topLightRef.current.intensity = dl * 0.5
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(0.30, 0.80, dl)
    }

    // Gekoppelte Subkomponenten aktualisieren
    if (Math.abs(dl - smoothedDaylight) > 0.005) setSmoothedDaylight(dl)
    if (Math.abs(rn - smoothedRain) > 0.005) setSmoothedRain(rn)
    if (Math.abs(fg - smoothedFog) > 0.005) setSmoothedFog(fg)
    if (Math.abs(lightX - lightPos[0]) > 0.05 || Math.abs(lightY - lightPos[1]) > 0.05) {
      setLightPos([lightX, lightY, lightZ])
    }
  })

  return (
    <>
      <PerspectiveCamera makeDefault fov={45} position={[3.2, 2.8, 3.8]} near={0.1} far={120} />
      <StudioCameraRig />

      {/* SICHTBARER STUDIO-SONNENORB */}
      <StudioLightRig position={lightPos} daylight={smoothedDaylight} />

      {/* STERNENHIMMEL BEI NACHT */}
      <NightSky daylight={smoothedDaylight} />

      {/* STUDIO-BELEUCHTUNG */}
      <ambientLight ref={ambientRef} intensity={0.80} color="#ffffff" />

      <directionalLight
        ref={sunLightRef}
        position={[3, 8, 3]}
        intensity={2.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={20}
        shadow-camera-left={-3.5}
        shadow-camera-right={3.5}
        shadow-camera-top={3.5}
        shadow-camera-bottom={-3.5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        color="#ffffff"
      />

      <directionalLight
        ref={fillLightRef}
        position={[-2, 4, -2]}
        intensity={0.85}
        color="#e2e8f0"
      />

      <directionalLight ref={topLightRef} position={[0, 6, 0]} intensity={0.5} color="#f0f4f8" />

      {/* 5m MUSTERPLATTE: STANDARD vs. GRAUZIT */}
      <RoadStage />

      {/* GPU-REGENPARTIKEL */}
      <StudioRain rain={smoothedRain} daylight={smoothedDaylight} />

      {/* ECE R149 ABBLENDLICHT */}
      <HeadlightProjectors daylight={smoothedDaylight} fog={smoothedFog} />

      {/* WEICHE KONTAKTSCHATTEN UNTER DER PLATTE */}
      <ContactShadows
        position={[0, -0.001, 0]}
        opacity={0.70}
        scale={8.5}
        blur={1.6}
        far={2.0}
        color="#000000"
        frames={1}
      />

      {/* UNENDLICHER STUDIO-BÜHNENBODEN */}
      <StudioFloor daylight={smoothedDaylight} />
    </>
  )
}

export default function App() {
  return (
    <div className="relative w-full h-full bg-[#08080a] overflow-hidden select-none">
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
          powerPreference: 'high-performance',
        }}
      >
        <Suspense fallback={null}>
          <StudioScene />
        </Suspense>
      </Canvas>

      {/* KOSTENLOSE CSS-VIGNETTE (kein GPU-Fillrate-Overhead) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(4,4,6,0.65)_100%)]" />

      <HUD />
    </div>
  )
}
