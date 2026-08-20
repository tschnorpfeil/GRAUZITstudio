import { useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore, SPLIT_LIMIT } from '../store'
import { SLAB_LENGTH, SLAB_TOP_Y } from './RoadStage'

const ACCENT = '#f1c302'

/**
 * Frei ziehbare Vergleichslinie: Der Kunde "streicht" die Musterplatte selbst
 * mit GRAUZIT ein. Leuchtende Klinge + Griff am nahen Plattenrand.
 */
export function SplitDivider() {
  const groupRef = useRef<THREE.Group>(null)
  const gripRef = useRef<THREE.Group>(null)
  const bladeMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const hoveredRef = useRef(false)

  const draggingSplit = useSimulationStore((s) => s.draggingSplit)
  const setSplitX = useSimulationStore((s) => s.setSplitX)
  const setDraggingSplit = useSimulationStore((s) => s.setDraggingSplit)

  // Sicherheitsnetz: Drag endet immer bei pointerup, egal wo
  useEffect(() => {
    if (!draggingSplit) return
    const stop = () => setDraggingSplit(false)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [draggingSplit, setDraggingSplit])

  useFrame(({ clock }) => {
    const s = useSimulationStore.getState()
    if (groupRef.current) {
      groupRef.current.position.x = s.splitX
    }
    // Sanfter Puls lädt zum Anfassen ein; beim Ziehen volle Leuchtkraft
    const t = clock.getElapsedTime()
    const active = s.draggingSplit || hoveredRef.current
    const pulse = active ? 1.0 : 0.62 + Math.sin(t * 2.2) * 0.16
    if (bladeMatRef.current) {
      bladeMatRef.current.opacity = (s.thermal ? 0.35 : 0.5) * pulse + 0.15
    }
    if (gripRef.current) {
      const scale = active ? 1.18 : 1.0 + Math.sin(t * 2.2) * 0.05
      gripRef.current.scale.setScalar(scale)
      gripRef.current.rotation.y = t * 0.6
    }
  })

  const beginDrag = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setDraggingSplit(true)
  }

  const hoverOn = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    hoveredRef.current = true
    document.body.style.cursor = 'ew-resize'
  }

  const hoverOff = () => {
    hoveredRef.current = false
    document.body.style.cursor = ''
  }

  return (
    <>
      <group ref={groupRef}>
        {/* Leuchtende Trennlinien-Klinge über die volle Plattenlänge */}
        <mesh position={[0, SLAB_TOP_Y + 0.008, 0]}>
          <boxGeometry args={[0.03, 0.008, SLAB_LENGTH]} />
          <meshBasicMaterial
            ref={bladeMatRef}
            color={ACCENT}
            transparent
            opacity={0.7}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>

        {/* Filigraner Griff-Pylon am nahen Plattenrand */}
        <group position={[0, SLAB_TOP_Y, SLAB_LENGTH / 2 + 0.25]}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.012, 0.02, 0.19, 10]} />
            <meshStandardMaterial color="#26282e" roughness={0.4} metalness={0.7} />
          </mesh>
          <group ref={gripRef} position={[0, 0.225, 0]}>
            <mesh>
              <octahedronGeometry args={[0.055, 0]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            {/* Richtungspfeile: signalisiert "hier ziehen" */}
            <mesh position={[0.105, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.023, 0.05, 4]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            <mesh position={[-0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.023, 0.05, 4]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
          </group>

          {/* Große unsichtbare Grab-Zone um den Griff */}
          <mesh
            position={[0, 0.2, 0]}
            onPointerDown={beginDrag}
            onPointerOver={hoverOn}
            onPointerOut={hoverOff}
          >
            <sphereGeometry args={[0.24, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* Schmale Grab-Zone entlang der Klinge */}
        <mesh
          position={[0, SLAB_TOP_Y + 0.05, 0]}
          onPointerDown={beginDrag}
          onPointerOver={hoverOn}
          onPointerOut={hoverOff}
        >
          <boxGeometry args={[0.22, 0.16, SLAB_LENGTH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Aktive Drag-Ebene: fängt Pointer-Moves über der gesamten Bühne ab */}
      {draggingSplit && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, SLAB_TOP_Y, 0]}
          onPointerMove={(e) => {
            setSplitX(THREE.MathUtils.clamp(e.point.x, -SPLIT_LIMIT, SPLIT_LIMIT))
          }}
          onPointerUp={() => setDraggingSplit(false)}
        >
          <planeGeometry args={[60, 60]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}
