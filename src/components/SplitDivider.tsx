import { useEffect, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimulationStore, SPLIT_LIMIT } from '../store'
import { ROAD_LENGTH, ROAD_CENTER_Z } from './RoadStage'

const ACCENT = '#f1c302'

/**
 * Frei ziehbare Vergleichslinie: Der Kunde "streicht" die Fahrbahn selbst
 * mit GRAUZIT ein. Leuchtende Klinge + Griff am nahen Fahrbahnende.
 */
export function SplitDivider() {
  const groupRef = useRef<THREE.Group>(null)
  const gripRef = useRef<THREE.Group>(null)
  const bladeMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const hoveredRef = useRef(false)

  const draggingSplit = useSimulationStore((s) => s.draggingSplit)
  const mode = useSimulationStore((s) => s.mode)
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
    if (mode === 'tour') return
    e.stopPropagation()
    setDraggingSplit(true)
  }

  const onDragMove = (e: ThreeEvent<PointerEvent>) => {
    setSplitX(THREE.MathUtils.clamp(e.point.x, -SPLIT_LIMIT, SPLIT_LIMIT))
  }

  return (
    <>
      <group ref={groupRef}>
        {/* Leuchtende Trennlinien-Klinge über die volle Fahrbahnlänge */}
        <mesh position={[0, 0.012, ROAD_CENTER_Z]}>
          <boxGeometry args={[0.045, 0.012, ROAD_LENGTH]} />
          <meshBasicMaterial
            ref={bladeMatRef}
            color={ACCENT}
            transparent
            opacity={0.7}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>

        {/* Griff-Pylon am nahen Fahrbahnende */}
        <group position={[0, 0, ROAD_CENTER_Z + ROAD_LENGTH / 2 + 0.55]}>
          <mesh position={[0, 0.09, 0]}>
            <cylinderGeometry args={[0.035, 0.05, 0.5, 12]} />
            <meshStandardMaterial color="#26282e" roughness={0.4} metalness={0.7} />
          </mesh>
          <group ref={gripRef} position={[0, 0.46, 0]}>
            <mesh>
              <octahedronGeometry args={[0.13, 0]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            {/* Richtungspfeile: signalisiert "hier ziehen" */}
            <mesh position={[0.26, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.055, 0.12, 4]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
            <mesh position={[-0.26, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[0.055, 0.12, 4]} />
              <meshBasicMaterial color={ACCENT} toneMapped={false} />
            </mesh>
          </group>

          {/* Große unsichtbare Grab-Zone um den Griff */}
          <mesh
            position={[0, 0.45, 0]}
            onPointerDown={beginDrag}
            onPointerOver={(e) => {
              e.stopPropagation()
              hoveredRef.current = true
              document.body.style.cursor = 'ew-resize'
            }}
            onPointerOut={() => {
              hoveredRef.current = false
              document.body.style.cursor = ''
            }}
          >
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>

        {/* Schmale Grab-Zone entlang der Klinge */}
        <mesh
          position={[0, 0.1, ROAD_CENTER_Z]}
          onPointerDown={beginDrag}
          onPointerOver={(e) => {
            e.stopPropagation()
            hoveredRef.current = true
            document.body.style.cursor = 'ew-resize'
          }}
          onPointerOut={() => {
            hoveredRef.current = false
            document.body.style.cursor = ''
          }}
        >
          <boxGeometry args={[0.3, 0.25, ROAD_LENGTH]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>

      {/* Aktive Drag-Ebene: fängt Pointer-Moves über der gesamten Bühne ab */}
      {draggingSplit && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.02, ROAD_CENTER_Z]}
          onPointerMove={onDragMove}
          onPointerUp={() => setDraggingSplit(false)}
        >
          <planeGeometry args={[120, 120]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}
