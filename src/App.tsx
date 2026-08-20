import React, { useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

import { RoadSampleSlab } from './components/RoadSampleSlab'
import { HeadlightProjectors } from './components/HeadlightProjectors'
import { StudioRain } from './components/StudioRain'
import { StudioLightRig } from './components/StudioLightRig'
import { StudioFloor } from './components/StudioFloor'
import { HUD } from './components/HUD'
import { useSimulationStore } from './store'

// Camera Rig for Smooth Studio Perspectives with Free Orbit & Zoom
const CAMERA_TARGETS = {
  driver: {
    // Pure automotive driver perspective: 1.15m eye height, looking forward along lane
    position: new THREE.Vector3(0.0, 1.15, 3.6),
    target: new THREE.Vector3(0.0, 0.15, -1.5),
  },
  orbit: {
    position: new THREE.Vector3(3.2, 2.8, 3.8),
    target: new THREE.Vector3(0.0, 0.1, 0.0),
  },
  top: {
    position: new THREE.Vector3(0.0, 6.2, 0.01),
    target: new THREE.Vector3(0.0, 0.1, 0.0),
  },
  macro: {
    position: new THREE.Vector3(0.85, 0.42, 0.85),
    target: new THREE.Vector3(0.85, 0.1, 0.0),
  },
}

function StudioCameraRig() {
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null)
  const isTransitioningRef = useRef(false)
  
  const cameraMode = useSimulationStore((s) => s.cameraMode)
  const autoRotate = useSimulationStore((s) => s.autoRotate)
  const rotateSpeed = useSimulationStore((s) => s.rotateSpeed)

  // Trigger smooth transition only when preset mode changes
  useEffect(() => {
    isTransitioningRef.current = true
  }, [cameraMode])

  useFrame((state, delta) => {
    if (isTransitioningRef.current) {
      const config = CAMERA_TARGETS[cameraMode]
      const step = Math.min(1.0, delta * 4.0)
      state.camera.position.lerp(config.position, step)
      
      if (controlsRef.current) {
        controlsRef.current.target.lerp(config.target, step)
        controlsRef.current.update()
      }

      // Stop transition when close enough to allow 100% free orbit & zoom
      if (
        state.camera.position.distanceTo(config.position) < 0.02 &&
        (!controlsRef.current || controlsRef.current.target.distanceTo(config.target) < 0.02)
      ) {
        isTransitioningRef.current = false
      }
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
      autoRotate={autoRotate}
      autoRotateSpeed={rotateSpeed * 2.0}
      maxPolarAngle={Math.PI / 2.02}
      minDistance={0.3}
      maxDistance={25}
      onStart={() => {
        // User interacted: cancel any active preset animation immediately
        isTransitioningRef.current = false
      }}
    />
  )
}

function StudioScene() {
  const daylight = useSimulationStore((s) => s.daylight)
  const fog = useSimulationStore((s) => s.fog)
  const lightAngle = useSimulationStore((s) => s.lightAngle)
  const rain = useSimulationStore((s) => s.rain)
  const cameraMode = useSimulationStore((s) => s.cameraMode)

  const lightRad = (lightAngle * Math.PI) / 180
  const lightX = Math.sin(lightRad) * 4.2
  const lightZ = Math.cos(lightRad) * 4.2
  const lightY = 6.2 + daylight * 2.0 // Elevated studio lightbank for steep physical aggregate illumination

  // Dynamic Daylight Sky / Studio Background (Sun = Bright Showroom, Night = Deep Midnight Stage)
  const dayBg = new THREE.Color('#d8e2ee')
  const nightBg = new THREE.Color('#06080e')
  const currentBg = nightBg.clone().lerp(dayBg, Math.pow(daylight, 0.80))

  const fogColor = daylight > 0.4 ? '#b8c7d9' : '#090c14'
  const fogDensity = fog * 0.12

  return (
    <>
      {/* 3D Dynamic Background Color matching daylight */}
      <color attach="background" args={[currentBg.getStyle()]} />

      <PerspectiveCamera makeDefault fov={cameraFOV(cameraMode)} />
      <StudioCameraRig />

      {/* VISIBLE 3D STUDIO LIGHT GIZMO / SUN ORB */}
      <StudioLightRig position={[lightX, lightY, lightZ]} daylight={daylight} />

      {/* DYNAMIC FOG IN STUDIO */}
      {fog > 0.005 && <fogExp2 attach="fog" args={[fogColor, fogDensity]} />}

      {/* HIGH-PERFORMANCE PROCEDURAL STUDIO LIGHTING (Solid baseline floor at night) */}
      <ambientLight intensity={THREE.MathUtils.lerp(0.35, 0.80, daylight)} color="#ffffff" />

      {/* Studio Key Light (Optimized Shadow Frustum for High FPS) */}
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

      {/* Studio Fill Light */}
      <directionalLight
        position={[-lightX * 0.5, 4, -lightZ * 0.5]}
        intensity={daylight * 0.85}
        color="#e2e8f0"
      />

      {/* Studio Overhead Softbox */}
      <directionalLight
        position={[0, 6, 0]}
        intensity={daylight * 0.5}
        color="#f0f4f8"
      />

      {/* 5-METER ROAD SAMPLE SLAB (CIE 144 & ECE R149 PBR SHADER) */}
      <RoadSampleSlab
        rain={rain}
        daylight={daylight}
        fog={fog}
        lightAngle={lightRad}
      />

      {/* PHOTOREALISTIC STUDIO RAIN PARTICLES */}
      <StudioRain rain={rain} daylight={daylight} />

      {/* ECE R149 PHOTOMETRIC LOW-BEAM HEADLIGHTS (AUTOMATIC AT NIGHT) */}
      <HeadlightProjectors daylight={daylight} fog={fog} />

      {/* SOFT CONTACT SHADOWS UNDER THE SLAB (Cached 1-frame bake for max FPS) */}
      <ContactShadows
        position={[0, -0.22, 0]}
        opacity={0.75}
        scale={8.5}
        blur={2.0}
        far={4.0}
        color="#000000"
        frames={1}
      />

      {/* INFINITE AUTOMOTIVE STUDIO CYCLORAMA STAGE FLOOR */}
      <StudioFloor daylight={daylight} />
    </>
  )
}

function cameraFOV(mode: 'driver' | 'orbit' | 'top' | 'macro'): number {
  switch (mode) {
    case 'driver':
      return 52 // Natural automotive perspective FOV
    case 'orbit':
      return 45
    case 'top':
      return 40
    case 'macro':
      return 30
  }
}

export default function App() {
  return (
    <div className="relative w-full h-full bg-[#08080a] overflow-hidden select-none">
      <Canvas
        shadows
        dpr={[1, 1.25]}
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

      {/* ZERO-COST CINEMATIC CSS VIGNETTE (Zero GPU Fillrate Penalty) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(4,4,6,0.65)_100%)]" />

      {/* Studio HUD & Editor Controls */}
      <HUD />
    </div>
  )
}
