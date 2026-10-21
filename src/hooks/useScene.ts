import { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface SceneStats {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  geometries: number
  textures: number
  programs: number
  objectCount: number
  fpsHistory: number[]
}

export type ScenePreset = 'minimal' | 'moderate' | 'heavy' | 'stress'

const PRESET_COUNTS: Record<ScenePreset, number> = {
  minimal: 10,
  moderate: 100,
  heavy: 500,
  stress: 2000,
}

function makeObjects(count: number, scene: THREE.Scene): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = []
  const geos = [
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.SphereGeometry(0.5, 16, 16),
    new THREE.TorusGeometry(0.4, 0.15, 12, 24),
    new THREE.ConeGeometry(0.5, 1, 12),
    new THREE.CylinderGeometry(0.3, 0.3, 1, 12),
  ]
  for (let i = 0; i < count; i++) {
    const geo = geos[i % geos.length]
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5),
      roughness: 0.6,
      metalness: 0.2,
    })
    const mesh = new THREE.Mesh(geo, mat)
    const range = Math.cbrt(count) * 3
    mesh.position.set(
      (Math.random() - 0.5) * range * 2,
      (Math.random() - 0.5) * range * 2,
      (Math.random() - 0.5) * range * 2
    )
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    meshes.push(mesh)
  }
  return meshes
}

export function useScene(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const animRef = useRef(0)
  const frameTimesRef = useRef<number[]>([])
  const lastFrameRef = useRef(performance.now())

  const [stats, setStats] = useState<SceneStats>({
    fps: 0, frameTime: 0, drawCalls: 0, triangles: 0,
    geometries: 0, textures: 0, programs: 0, objectCount: 0, fpsHistory: [],
  })
  const [preset, setPreset] = useState<ScenePreset>('moderate')
  const [wireframe, setWireframe] = useState(false)
  const [shadows, setShadows] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0a0a0f')
    scene.fog = new THREE.FogExp2('#0a0a0f', 0.02)
    sceneRef.current = scene

    const { clientWidth: w, clientHeight: h } = canvas
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 500)
    camera.position.set(0, 5, 20)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    rendererRef.current = renderer

    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const sun = new THREE.DirectionalLight(0xffffff, 1.5)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    scene.add(sun)
    const fill = new THREE.PointLight(0x7c3aed, 2, 50)
    fill.position.set(-10, 5, -10)
    scene.add(fill)

    const grid = new THREE.GridHelper(100, 50, 0x1e1e2e, 0x16161e)
    scene.add(grid)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.5
    controlsRef.current = controls

    meshesRef.current = makeObjects(PRESET_COUNTS.moderate, scene)

    const ro = new ResizeObserver(() => {
      const { clientWidth: cw, clientHeight: ch } = canvas
      if (!cw || !ch) return
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
    })
    ro.observe(canvas)

    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      const now = performance.now()
      const delta = now - lastFrameRef.current
      lastFrameRef.current = now

      controls.update()
      renderer.render(scene, camera)

      // Collect frame times (rolling 60)
      frameTimesRef.current.push(delta)
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift()

      const avgFrame = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length
      const fps = Math.round(1000 / avgFrame)
      const info = renderer.info

      setStats((prev) => ({
        fps,
        frameTime: Math.round(avgFrame * 10) / 10,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        objectCount: scene.children.length,
        fpsHistory: [...prev.fpsHistory.slice(-119), fps],
      }))
    }
    animate()

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      renderer.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const changePreset = useCallback((p: ScenePreset) => {
    const scene = sceneRef.current
    if (!scene) return
    meshesRef.current.forEach((m) => scene.remove(m))
    meshesRef.current = makeObjects(PRESET_COUNTS[p], scene)
    setPreset(p)
  }, [])

  const toggleWireframe = useCallback(() => {
    setWireframe((prev) => {
      const next = !prev
      meshesRef.current.forEach((m) => {
        ;(m.material as THREE.MeshStandardMaterial).wireframe = next
      })
      return next
    })
  }, [])

  const toggleShadows = useCallback(() => {
    setShadows((prev) => {
      const next = !prev
      if (rendererRef.current) rendererRef.current.shadowMap.enabled = next
      return next
    })
  }, [])

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      if (controlsRef.current) controlsRef.current.autoRotate = !prev
      return !prev
    })
  }, [])

  return { stats, preset, wireframe, shadows, autoRotate, changePreset, toggleWireframe, toggleShadows, toggleAutoRotate }
}
