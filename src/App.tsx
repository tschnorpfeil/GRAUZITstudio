import React, { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

import { RoadStage } from './components/RoadStage'
import { SplitDivider } from './components/SplitDivider'
import { Pedestrians } from './components/Pedestrians'
import { HeadlightProjectors } from './components/HeadlightProjectors'
import { StudioRain } from './components/StudioRain'
import { StudioLightRig } from './components/StudioLightRig'
import { StudioFloor } from './components/StudioFloor'
import { NightSky } from './components/NightSky'
import { TourController } from './components/TourController'
import { HUD } from './components/HUD'
import { useSimulationStore, type CameraMode } from './store'

// Kamera-Presets für den Explore-Modus (40m-Fahrbahn)
const CAMERA_TARGETS: Record<
  CameraMode,
  { position: THREE.Vector3; target: THREE.Vector3; fov: number }
> = {
  driver: {
    // Authentische Fahrerperspektive: 1.28m Augenhöhe, Blick die Fahrbahn hinab
    position: new THREE.Vector3(0, 1.28, 6.2),
    target: new THREE.Vector3(0, 0.35, -12),
    fov: 52,
  },
  orbit: {
    // Von der Standard-Seite: das helle GRAUZIT-Band zieht sich längs durchs Bild
    position: new THREE.Vector3(-11, 10, 11),
    target: new THREE.Vector3(0, 0, -8),
    fov: 42,
  },
  top: {
    // Luftaufnahme: die gesamte 40m-Fahrbahn diagonal im Bild
    position: new THREE.Vector3(17, 19, 9),
    target: new THREE.Vector3(0, 0, -10),
    fov: 45,
  },
  macro: {
    position: new THREE.Vector3(2.6, 1.35, 4.8),
    target: new THREE.Vector3(1.2, 0.0, 1.4),
    fov: 35,
  },
}

function StudioCameraRig() {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const isTransitioningRef = useRef(false)

  const cameraMode = useSimulationStore((s) => s.cameraMode)
  const mode = useSimulationStore((s) => s.mode)
  const draggingSplit = useSimulationStore((s) => s.draggingSplit)

  // Preset-Wechsel im Explore-Modus (und Rückkehr aus der Tour) weich anfahren
  useEffect(() => {
    if (mode === 'explore') {
      isTransitioningRef.current = true
    }
  }, [cameraMode, mode])

  useFrame((state, delta) => {
    if (mode !== 'explore' || !isTransitioningRef.current) return

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

    if (
      state.camera.position.distanceTo(config.position) < 0.02 &&
      (!controlsRef.current || controlsRef.current.target.distanceTo(config.target) < 0.02)
    ) {
      isTransitioningRef.current = false
    }
  })

  // Während der Tour steuert der TourController die Kamera exklusiv
  if (mode === 'tour') return null

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!draggingSplit}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.08}
      autoRotate={mode === 'intro'}
      autoRotateSpeed={0.5}
      maxPolarAngle={Math.PI / 2.05}
      minDistance={0.4}
      maxDistance={60}
      onStart={() => {
        isTransitioningRef.current = false
      }}
    />
  )
}

// Wiederverwendete Farbobjekte (keine Allokation pro Frame)
const _dayBg = new THREE.Color('#d8e2ee')
const _nightBg = new THREE.Color('#05070d')
const _bg = new THREE.Color()

function StudioScene() {
  const daylight = useSimulationStore((s) => s.daylight)
  const fog = useSimulationStore((s) => s.fog)
  const lightAngle = useSimulationStore((s) => s.lightAngle)
  const rain = useSimulationStore((s) => s.rain)

  const lightRad = (lightAngle * Math.PI) / 180
  const lightX = Math.sin(lightRad) * 14
  const lightZ = Math.cos(lightRad) * 14 - 8
  const lightY = 12 + daylight * 4

  // Dynamischer Himmel: heller Showroom am Tag, tiefe Mitternachtsbühne nachts
  _bg.copy(_nightBg).lerp(_dayBg, Math.pow(daylight, 0.8))

  const fogColor = daylight > 0.4 ? '#b8c7d9' : '#090c14'
  const fogDensity = fog * 0.045

  return (
    <>
      <color attach="background" args={[_bg.getStyle()]} />

      <PerspectiveCamera makeDefault fov={45} position={[-16, 9, 20]} near={0.1} far={250} />
      <StudioCameraRig />
      <TourController />

      {/* SICHTBARER STUDIO-SONNENORB */}
      <StudioLightRig position={[lightX, lightY, lightZ]} daylight={daylight} />

      {/* ATMOSPHÄRISCHER NEBEL */}
      {fog > 0.005 && <fogExp2 attach="fog" args={[fogColor, fogDensity]} />}

      {/* STERNENHIMMEL BEI NACHT */}
      <NightSky daylight={daylight} />

      {/* STUDIO-BELEUCHTUNG */}
      <ambientLight intensity={THREE.MathUtils.lerp(0.07, 0.85, daylight)} color="#ffffff" />

      <directionalLight
        position={[lightX, lightY, lightZ]}
        intensity={daylight * 2.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={1}
        shadow-camera-far={80}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
        color="#ffffff"
      />

      <directionalLight
        position={[-lightX * 0.5, 8, -lightZ * 0.5]}
        intensity={daylight * 0.85}
        color="#e2e8f0"
      />

      <directionalLight position={[0, 14, -10]} intensity={daylight * 0.5} color="#f0f4f8" />

      {/* 40m FAHRBAHN: STANDARD vs. GRAUZIT (CIE 144 & ECE R149 PBR-SHADER) */}
      <RoadStage />

      {/* FREI ZIEHBARE VERGLEICHSLINIE */}
      <SplitDivider />

      {/* SICHERHEITS-SZENARIO: FUSSGÄNGER AUF BEIDEN FAHRSTREIFEN */}
      <Pedestrians />

      {/* GPU-REGENPARTIKEL */}
      <StudioRain rain={rain} daylight={daylight} />

      {/* ECE R149 ABBLENDLICHT (AUTOMATISCH BEI NACHT) */}
      <HeadlightProjectors daylight={daylight} fog={fog} />

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
