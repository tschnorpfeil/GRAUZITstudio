import React, { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

import { RoadStage } from './components/RoadStage'
import { SplitDivider } from './components/SplitDivider'
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
    target: new THREE.Vector3(0.0, 0.15, -1.5),
    fov: 52,
  },
  orbit: {
    position: new THREE.Vector3(3.2, 2.8, 3.8),
    target: new THREE.Vector3(0.0, 0.1, 0.0),
    fov: 45,
  },
  top: {
    position: new THREE.Vector3(0.0, 6.2, 0.01),
    target: new THREE.Vector3(0.0, 0.1, 0.0),
    fov: 40,
  },
  macro: {
    // Nahaufnahme direkt an der Trennlinie: beide Gesteinskörnungen im Bild
    position: new THREE.Vector3(0.55, 0.5, 1.7),
    target: new THREE.Vector3(0.0, 0.09, 0.55),
    fov: 30,
  },
}

function StudioCameraRig() {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const isTransitioningRef = useRef(false)

  const cameraMode = useSimulationStore((s) => s.cameraMode)
  const draggingSplit = useSimulationStore((s) => s.draggingSplit)

  // Preset-Wechsel weich anfahren
  useEffect(() => {
    isTransitioningRef.current = true
  }, [cameraMode])

  useFrame((state, delta) => {
    if (!isTransitioningRef.current) return

    const config = CAMERA_TARGETS[cameraMode]
    const step = Math.min(1.0, delta * 4.0)
    state.camera.position.lerp(config.position, step)

    const cam = state.camera as THREE.PerspectiveCamera
    cam.fov = THREE.MathUtils.lerp(cam.fov, config.fov, step)
    cam.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.lerp(config.target, step)
      controlsRef.current.update()
    }

    // Übergang beenden, sobald angekommen -> 100% freies Orbit & Zoom
    if (
      state.camera.position.distanceTo(config.position) < 0.02 &&
      (!controlsRef.current || controlsRef.current.target.distanceTo(config.target) < 0.02)
    ) {
      isTransitioningRef.current = false
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!draggingSplit}
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

// Wiederverwendete Farbobjekte (keine Allokation pro Frame)
const _dayBg = new THREE.Color('#d8e2ee')
const _nightBg = new THREE.Color('#06080e')
const _bg = new THREE.Color()

function StudioScene() {
  const daylight = useSimulationStore((s) => s.daylight)
  const fog = useSimulationStore((s) => s.fog)
  const lightAngle = useSimulationStore((s) => s.lightAngle)
  const rain = useSimulationStore((s) => s.rain)

  const lightRad = (lightAngle * Math.PI) / 180
  const lightX = Math.sin(lightRad) * 4.2
  const lightZ = Math.cos(lightRad) * 4.2
  const lightY = 6.2 + daylight * 2.0

  // Dynamischer Himmel: heller Showroom am Tag, tiefe Mitternachtsbühne nachts
  _bg.copy(_nightBg).lerp(_dayBg, Math.pow(daylight, 0.8))

  const fogColor = daylight > 0.4 ? '#b8c7d9' : '#090c14'
  const fogDensity = fog * 0.12

  return (
    <>
      <color attach="background" args={[_bg.getStyle()]} />

      <PerspectiveCamera makeDefault fov={45} position={[3.2, 2.8, 3.8]} near={0.1} far={120} />
      <StudioCameraRig />

      {/* SICHTBARER STUDIO-SONNENORB */}
      <StudioLightRig position={[lightX, lightY, lightZ]} daylight={daylight} />

      {/* ATMOSPHÄRISCHER NEBEL */}
      {fog > 0.005 && <fogExp2 attach="fog" args={[fogColor, fogDensity]} />}

      {/* STERNENHIMMEL BEI NACHT */}
      <NightSky daylight={daylight} />

      {/* STUDIO-BELEUCHTUNG */}
      <ambientLight intensity={THREE.MathUtils.lerp(0.30, 0.80, daylight)} color="#ffffff" />

      <directionalLight
        position={[lightX, lightY, lightZ]}
        intensity={daylight * 2.8}
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
        position={[-lightX * 0.5, 4, -lightZ * 0.5]}
        intensity={daylight * 0.85}
        color="#e2e8f0"
      />

      <directionalLight position={[0, 6, 0]} intensity={daylight * 0.5} color="#f0f4f8" />

      {/* 5m MUSTERPLATTE: STANDARD vs. GRAUZIT (CIE 144 & ECE R149 PBR-SHADER) */}
      <RoadStage />

      {/* FREI ZIEHBARE VERGLEICHSLINIE */}
      <SplitDivider />

      {/* GPU-REGENPARTIKEL */}
      <StudioRain rain={rain} daylight={daylight} />

      {/* ECE R149 ABBLENDLICHT (AUTOMATISCH BEI NACHT) */}
      <HeadlightProjectors daylight={daylight} fog={fog} />

      {/* WEICHE KONTAKTSCHATTEN UNTER DER PLATTE (1-Frame-Bake für max. FPS) */}
      <ContactShadows
        position={[0, -0.22, 0]}
        opacity={0.75}
        scale={8.5}
        blur={2.0}
        far={4.0}
        color="#000000"
        frames={1}
      />

      {/* UNENDLICHER STUDIO-BÜHNENBODEN */}
      <StudioFloor daylight={daylight} />
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
