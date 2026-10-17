import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import type { MotionValue } from 'motion/react'
import { buildEmblem, dissolveAt, type Shade } from '@/lib/emblem'

interface SceneProps {
  /** 0 → 1 as the hero scrolls out of view. */
  progress: MotionValue<number>
  active: boolean
  onReady: () => void
  compact?: boolean
}

const pointer = { x: 0, y: 0 }
const SHADES: Shade[] = [0, 1, 2]

function useMaterials() {
  return useMemo(() => {
    const make = (color: string, roughness: number) =>
      new THREE.MeshStandardMaterial({ color, metalness: 1, roughness, envMapIntensity: 1.3 })
    return {
      0: make('#2a2b30', 0.2), // black chrome
      1: make('#a3a5ac', 0.24), // steel
      2: make('#e4e6ea', 0.12), // bright chrome
    } as Record<Shade, THREE.MeshStandardMaterial>
  }, [])
}

const box = new THREE.BoxGeometry(1, 1, 1)
const tmp = new THREE.Object3D()

function Sculpture({ progress, compact }: { progress: MotionValue<number>; compact?: boolean }) {
  const group = useRef<THREE.Group>(null)
  const emblem = useMemo(() => buildEmblem({ detail: 'full' }), [])
  const mats = useMaterials()
  const { viewport } = useThree()
  const scale = Math.min(1.45, viewport.width / 3.2, viewport.height / 2.75)

  // Split bars and cubes per shade so each shade is one instanced draw call.
  const groups = useMemo(
    () =>
      SHADES.map((s) => ({
        shade: s,
        bars: emblem.bars
          .filter((b) => b.shade === s)
          .map((b) => ({ ...b, dis: dissolveAt((Math.atan2(b.y, b.x) * 180) / Math.PI), phase: b.x * 3.1 + b.y * 1.7 })),
        cubes: emblem.cubes.filter((c) => c.shade === s).map((c, i) => ({ ...c, phase: i * 1.37 + c.x * 4 })),
      })),
    [emblem],
  )
  const barRefs = useRef<Array<THREE.InstancedMesh | null>>([])
  const cubeRefs = useRef<Array<THREE.InstancedMesh | null>>([])
  const smooth = useRef({ p: 0, px: 0, py: 0 })

  const tail = useMemo(() => {
    const shape = new THREE.Shape(emblem.tail.outline.map(([x, y]) => new THREE.Vector2(x, y)))
    const frame = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2 })
    frame.translate(0, 0, -0.06)
    const tiles = emblem.tail.tiles.map((t) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(t.pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.05, bevelEnabled: false })
      g.translate(0, 0, 0.05)
      return { g, shade: t.shade }
    })
    return { frame, tiles }
  }, [emblem])

  useLayoutEffect(() => () => {
    tail.frame.dispose()
    tail.tiles.forEach((t) => t.g.dispose())
  }, [tail])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const d = Math.min(delta, 1 / 20)
    const s = smooth.current
    s.p = THREE.MathUtils.damp(s.p, progress.get(), 4, d)
    s.px = THREE.MathUtils.damp(s.px, pointer.x, 3, d)
    s.py = THREE.MathUtils.damp(s.py, pointer.y, 3, d)
    const p = s.p

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.28 + Math.sin(t * 0.21) * 0.14 + s.px * 0.32 + p * 0.7, 2.2, d)
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.05 + Math.sin(t * 0.16) * 0.05 - s.py * 0.2 - p * 0.2, 2.2, d)
    g.position.y = Math.sin(t * 0.5) * 0.03 + p * 0.3

    const ptrX = s.px * 1.4
    const ptrY = s.py * 1.4

    groups.forEach((grp, gi) => {
      const bm = barRefs.current[gi]
      if (bm) {
        grp.bars.forEach((b, i) => {
          const near = Math.max(0, 1 - Math.hypot(b.x - ptrX, b.y - ptrY) / 0.8)
          // Scroll pulls more of the ring apart where it is already dissolving.
          const loosen = p * (0.25 + b.dis * 1.6)
          const ang = Math.atan2(b.y, b.x)
          tmp.position.set(
            b.x + Math.cos(ang) * loosen * 0.5 + loosen * 0.25,
            b.y + Math.sin(ang) * loosen * 0.35,
            b.z + Math.sin(t * 0.7 + b.phase) * 0.035 + near * 0.16 + loosen * (Math.sin(b.phase * 7) * 0.9),
          )
          tmp.rotation.set(0, near * 0.15 + loosen * Math.sin(b.phase) * 0.8, loosen * Math.cos(b.phase * 3) * 0.3)
          tmp.scale.set(b.w, b.h, b.d)
          tmp.updateMatrix()
          bm.setMatrixAt(i, tmp.matrix)
        })
        bm.instanceMatrix.needsUpdate = true
      }
      const cm = cubeRefs.current[gi]
      if (cm) {
        grp.cubes.forEach((c, i) => {
          const f = c.drift
          const out = p * (0.3 + f * 0.9)
          tmp.position.set(
            c.x + Math.sin(t * 0.45 + c.phase) * 0.03 * f + out * 0.8,
            c.y + Math.cos(t * 0.38 + c.phase) * 0.035 * f + out * 0.15,
            c.z + Math.sin(t * 0.3 + c.phase * 2) * 0.05 * f + out * Math.sin(c.phase) * 0.6,
          )
          tmp.rotation.set(t * 0.25 * f + c.phase, t * 0.32 * f + c.phase * 0.5, 0)
          tmp.scale.setScalar(c.s * (1 - p * 0.3 * f))
          tmp.updateMatrix()
          cm.setMatrixAt(i, tmp.matrix)
        })
        cm.instanceMatrix.needsUpdate = true
      }
    })
  })

  return (
    <group ref={group} scale={scale} position={[(compact ? -0.24 : -0.22) * scale, 0, 0]}>
      {groups.map((grp, gi) => (
        <group key={grp.shade}>
          {grp.bars.length > 0 && (
            <instancedMesh
              ref={(el) => {
                barRefs.current[gi] = el
              }}
              args={[box, mats[grp.shade], grp.bars.length]}
              frustumCulled={false}
            />
          )}
          {grp.cubes.length > 0 && (
            <instancedMesh
              ref={(el) => {
                cubeRefs.current[gi] = el
              }}
              args={[box, mats[grp.shade], grp.cubes.length]}
              frustumCulled={false}
            />
          )}
        </group>
      ))}
      <mesh geometry={tail.frame} material={mats[2]} />
      {tail.tiles.map((tl, i) => (
        <mesh key={i} geometry={tl.g} material={mats[tl.shade]} />
      ))}
    </group>
  )
}

function Studio() {
  // Tall light strips — reflected in the bars as crisp chrome bands.
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={['#000000']} />
      <Lightformer form="rect" intensity={3.4} position={[-3.2, 0.5, 2]} scale={[0.6, 9, 1]} rotation-y={Math.PI / 2.6} />
      <Lightformer form="rect" intensity={1.8} position={[3.4, 0, 1.6]} scale={[0.4, 9, 1]} rotation-y={-Math.PI / 2.4} />
      <Lightformer form="rect" intensity={1.3} position={[0, 4.5, -1]} scale={[8, 0.6, 1]} rotation-x={Math.PI / 2} />
      <Lightformer form="rect" intensity={0.7} position={[0, 0, -5]} scale={[10, 2, 1]} />
      {/* Soft key from the viewer's side so front faces catch light */}
      <Lightformer form="rect" intensity={1.1} position={[0.8, 0.6, 6]} scale={[5, 2.2, 1]} />
      <Lightformer form="rect" intensity={0.5} position={[0, -4, 1]} scale={[6, 0.4, 1]} rotation-x={-Math.PI / 2} />
    </Environment>
  )
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  const fired = useRef(false)
  useFrame(() => {
    if (!fired.current) {
      fired.current = true
      requestAnimationFrame(onReady)
    }
  })
  return null
}

export default function HeroScene({ progress, active, onReady, compact }: SceneProps) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={compact ? [1, 1.25] : [1, 1.5]}
      camera={{ position: [0, 0, 6.4], fov: 30 }}
      gl={{ antialias: !compact, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <ambientLight intensity={0.12} />
      <directionalLight position={[3, 4, 5]} intensity={0.6} />
      <Studio />
      <Sculpture progress={progress} compact={compact} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  )
}
