import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { bytes, pct, uptime } from '../utils/format'
import { deriveUsage, displayName } from '../utils/derive'
import { cn } from '../utils/cn'
import type { Node } from '../types'
import { nodeKey } from '../utils/nodeKey'

interface NodeGroup {
  key: string
  lat: number
  lng: number
  nodes: Node[]
}

interface Props {
  groups: NodeGroup[]
  total: number
  onOpen?: (id: string) => void
}

interface GlobePalette {
  oceanTop: string
  oceanMidTop: string
  oceanMidBottom: string
  oceanBottom: string
  bloom: string
  bloomFade: string
  gridLine: string
  landFill: string
  landStroke: string
  speckles: string
  markerGlow: number
  markerGlowHover: number
  markerCore: number
  markerCoreHover: number
  markerGlowOffline: number
  markerCoreOffline: number
  fogColor: number
  fogDensity: number
  ambientIntensity: number
  hemisphereSky: number
  hemisphereGround: number
  starColor: number
  starOpacity: number
  glowTextureRgb: string
}

interface GeoJsonGeometry {
  type: string
  coordinates: any
}

interface GeoJsonFeature {
  geometry: GeoJsonGeometry
  properties?: { name?: string }
}

interface GeoJson {
  features?: GeoJsonFeature[]
}

interface HoverState {
  group: NodeGroup
  x: number
  y: number
  pinned?: boolean
}

const WORLD_MAP_URL = `${import.meta.env.BASE_URL}geo/world.json`
const RADIUS = 1.7
const MIN_DISTANCE = 4.45
const MAX_DISTANCE = 9.25

function getGlobePalette(dark: boolean): GlobePalette {
  if (dark) {
    return {
      oceanTop: '#102337',
      oceanMidTop: '#0b1a2b',
      oceanMidBottom: '#071322',
      oceanBottom: '#04101d',
      bloom: 'rgba(34, 211, 238, 0.16)',
      bloomFade: 'rgba(34, 211, 238, 0)',
      gridLine: 'rgba(103, 232, 249, 0.13)',
      landFill: '#25405a',
      landStroke: 'rgba(103, 232, 249, 0.18)',
      speckles: 'rgba(226, 232, 240, 0.035)',
      markerGlow: 0x0ea5e9,
      markerGlowHover: 0x67e8f9,
      markerCore: 0xfbbf24,
      markerCoreHover: 0xfef3c7,
      markerGlowOffline: 0x64748b,
      markerCoreOffline: 0xcbd5e1,
      fogColor: 0x07111f,
      fogDensity: 0.02,
      ambientIntensity: 1.08,
      hemisphereSky: 0xeff6ff,
      hemisphereGround: 0x0f172a,
      starColor: 0x94a3b8,
      starOpacity: 0.16,
      glowTextureRgb: '14, 165, 233',
    }
  }

  return {
    oceanTop: '#f3f7fb',
    oceanMidTop: '#e7eef6',
    oceanMidBottom: '#d7e2ed',
    oceanBottom: '#c7d5e3',
    bloom: 'rgba(59, 130, 246, 0.06)',
    bloomFade: 'rgba(59, 130, 246, 0)',
    gridLine: 'rgba(100, 116, 139, 0.08)',
    landFill: '#90a4b6',
    landStroke: 'rgba(148, 163, 184, 0.5)',
    speckles: 'rgba(51, 65, 85, 0.018)',
    markerGlow: 0x0284c7,
    markerGlowHover: 0x38bdf8,
    markerCore: 0xfbbf24,
    markerCoreHover: 0xfef3c7,
    markerGlowOffline: 0x94a3b8,
    markerCoreOffline: 0xe2e8f0,
    fogColor: 0xe6edf5,
    fogDensity: 0.018,
    ambientIntensity: 1.02,
    hemisphereSky: 0xf8fafc,
    hemisphereGround: 0xd9e2ec,
    starColor: 0x94a3b8,
    starOpacity: 0.08,
    glowTextureRgb: '14, 116, 144',
  }
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof document === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    const root = document.documentElement
    const update = () => setDark(root.classList.contains('dark'))
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    update()
    return () => observer.disconnect()
  }, [])

  return dark
}

function projectTexturePoint(lon: number, lat: number, width: number, height: number) {
  const x = ((lon + 180) / 360) * width
  const y = ((90 - lat) / 180) * height
  return [x, y] as const
}

function drawPolygonRing(ctx: CanvasRenderingContext2D, ring: [number, number][], width: number, height: number) {
  for (let i = 0; i < ring.length; i += 1) {
    const point = ring[i]
    if (!point) continue
    const [x, y] = projectTexturePoint(point[0], point[1], width, height)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function buildEarthTextureCanvas(geoJson: GeoJson, colors: GlobePalette) {
  const canvas = document.createElement('canvas')
  canvas.width = 4096
  canvas.height = 2048
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const { width, height } = canvas
  const ocean = ctx.createLinearGradient(0, 0, 0, height)
  ocean.addColorStop(0, colors.oceanTop)
  ocean.addColorStop(0.4, colors.oceanMidTop)
  ocean.addColorStop(0.72, colors.oceanMidBottom)
  ocean.addColorStop(1, colors.oceanBottom)
  ctx.fillStyle = ocean
  ctx.fillRect(0, 0, width, height)

  const bloom = ctx.createRadialGradient(width * 0.28, height * 0.28, 0, width * 0.28, height * 0.28, width * 0.46)
  bloom.addColorStop(0, colors.bloom)
  bloom.addColorStop(1, colors.bloomFade)
  ctx.fillStyle = bloom
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.strokeStyle = colors.gridLine
  ctx.lineWidth = 0.8
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = projectTexturePoint(0, lat, width, height)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    const [x] = projectTexturePoint(lon, 0, width, height)
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.fillStyle = colors.landFill
  ctx.strokeStyle = colors.landStroke
  ctx.lineWidth = 1.35

  for (const feature of geoJson.features ?? []) {
    const geometry = feature.geometry
    if (!geometry) continue

    ctx.beginPath()
    if (geometry.type === 'Polygon') {
      for (const ring of geometry.coordinates as [number, number][][]) {
        drawPolygonRing(ctx, ring, width, height)
      }
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates as [number, number][][][]) {
        for (const ring of polygon) {
          drawPolygonRing(ctx, ring, width, height)
        }
      }
    }
    ctx.fillStyle = colors.landFill
    ctx.strokeStyle = colors.landStroke
    ctx.fill()
    ctx.stroke()
  }

  ctx.restore()
  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.fillStyle = colors.speckles
  for (let i = 0; i < 180; i += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = Math.random() * 2.4 + 0.4
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()

  return canvas
}

function buildGlowTexture(colors: GlobePalette) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.clearRect(0, 0, 256, 256)
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 126)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
  gradient.addColorStop(0.12, `rgba(${colors.glowTextureRgb}, 0.30)`)
  gradient.addColorStop(0.34, `rgba(${colors.glowTextureRgb}, 0.13)`)
  gradient.addColorStop(0.58, `rgba(${colors.glowTextureRgb}, 0.045)`)
  gradient.addColorStop(0.82, `rgba(${colors.glowTextureRgb}, 0.012)`)
  gradient.addColorStop(1, `rgba(${colors.glowTextureRgb}, 0)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  return canvas
}

function buildStarfield(colors: GlobePalette) {
  const geometry = new THREE.BufferGeometry()
  const starCount = 1200
  const positions = new Float32Array(starCount * 3)

  for (let i = 0; i < starCount; i += 1) {
    const radius = 12 + Math.random() * 14
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const sinPhi = Math.sin(phi)
    positions[i * 3] = radius * sinPhi * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.cos(phi)
    positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta)
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: colors.starColor,
      size: 0.05,
      transparent: true,
      opacity: colors.starOpacity,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  )
}

function lonLatToVector3(lon: number, lat: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  )
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) material.forEach(item => item.dispose())
  else material.dispose()
}

function disposeObject(object: THREE.Object3D | null) {
  if (!object) return
  object.traverse(child => {
    const maybeMesh = child as THREE.Mesh
    if (maybeMesh.geometry) maybeMesh.geometry.dispose()
    const material = (child as THREE.Mesh | THREE.Sprite | THREE.Line).material
    if (material) disposeMaterial(material as THREE.Material | THREE.Material[])
  })
}

function getMarkerGroup(object: THREE.Object3D | null): THREE.Group | null {
  let current = object
  while (current) {
    if (current.type === 'Group' && current.userData?.key) return current as THREE.Group
    current = current.parent
  }
  return null
}

function findMarkerHit(raycaster: THREE.Raycaster, markerGroup: THREE.Group | null) {
  if (!markerGroup) return null
  const hit = raycaster.intersectObjects(markerGroup.children, true)[0]
  return hit ? getMarkerGroup(hit.object) : null
}

function pointerToRay(event: PointerEvent, canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera, pointer: THREE.Vector2, raycaster: THREE.Raycaster) {
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)
  return rect
}

export function Globe3DMap({ groups, total, onOpen }: Props) {
  const dark = useDarkMode()
  const colors = useMemo(() => getGlobePalette(dark), [dark])
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [hover, setHover] = useState<HoverState | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const markerGroupRef = useRef<THREE.Group | null>(null)
  const earthMeshRef = useRef<THREE.Mesh | null>(null)
  const starfieldRef = useRef<THREE.Points | null>(null)
  const earthTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const glowTextureRef = useRef<THREE.CanvasTexture | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const frameIdRef = useRef(0)
  const pointerRef = useRef(new THREE.Vector2())
  const raycasterRef = useRef(new THREE.Raycaster())
  const hoveredMarkerRef = useRef<THREE.Group | null>(null)
  const groupsRef = useRef(groups)
  const onOpenRef = useRef(onOpen)
  const hideTimerRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    groupsRef.current = groups
  }, [groups])

  useEffect(() => {
    onOpenRef.current = onOpen
  }, [onOpen])

  function clearHideTimer() {
    if (hideTimerRef.current != null) {
      window.clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }

  function scheduleHide(delay = 80) {
    clearHideTimer()
    hideTimerRef.current = window.setTimeout(() => setHover(null), delay)
  }

  function setMarkerState(marker: THREE.Group | null, hovered: boolean) {
    if (!marker) return
    const onlineCount = Number(marker.userData.onlineCount ?? 0)
    const selected = Boolean(marker.userData.selected)
    const glow = marker.userData.glow as THREE.Sprite | undefined
    const core = marker.userData.core as THREE.Mesh | undefined
    const glowMaterial = glow?.material as THREE.SpriteMaterial | undefined
    const coreMaterial = core?.material as THREE.MeshBasicMaterial | undefined

    marker.userData.hovered = hovered
    marker.userData.targetScale = selected ? (hovered ? 1.34 : 1.2) : hovered ? 1.18 : 1

    if (glowMaterial) {
      glowMaterial.color.set(onlineCount > 0 ? (hovered ? colors.markerGlowHover : colors.markerGlow) : colors.markerGlowOffline)
    }
    if (coreMaterial) {
      coreMaterial.color.set(onlineCount > 0 ? (hovered ? colors.markerCoreHover : colors.markerCore) : colors.markerCoreOffline)
    }
  }

  function clearMarkers() {
    const markerGroup = markerGroupRef.current
    if (markerGroup && sceneRef.current) sceneRef.current.remove(markerGroup)
    disposeObject(markerGroup)
    markerGroupRef.current = null
    hoveredMarkerRef.current = null
  }

  function rebuildMarkers() {
    const scene = sceneRef.current
    const glowTexture = glowTextureRef.current
    if (!scene || !glowTexture) return

    clearMarkers()
    const markerGroup = new THREE.Group()
    markerGroupRef.current = markerGroup
    scene.add(markerGroup)

    for (const group of groupsRef.current) {
      const onlineCount = group.nodes.filter(node => node.online).length
      const position = lonLatToVector3(group.lng, group.lat, RADIUS + 0.02)
      const marker = new THREE.Group()
      marker.userData = {
        key: group.key,
        group,
        onlineCount,
        targetScale: 1,
        currentScale: 1,
        baseGlowScale: 0.13 + Math.min(group.nodes.length * 0.018, 0.11),
      }
      marker.position.copy(position)
      marker.lookAt(position.clone().multiplyScalar(2))

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: onlineCount > 0 ? colors.markerGlow : colors.markerGlowOffline,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        }),
      )
      glow.scale.setScalar(marker.userData.baseGlowScale * 1.75)

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + Math.min(group.nodes.length * 0.004, 0.018), 24, 24),
        new THREE.MeshBasicMaterial({ color: onlineCount > 0 ? colors.markerCore : colors.markerCoreOffline }),
      )

      marker.userData.glow = glow
      marker.userData.core = core
      marker.add(glow)
      marker.add(core)
      markerGroup.add(marker)
      setMarkerState(marker, false)
    }
  }

  useEffect(() => {
    rebuildMarkers()
  }, [groups, colors])

  useEffect(() => {
    let disposed = false
    reducedMotionRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    async function init() {
      const root = rootRef.current
      if (!root) return

      setLoading(true)
      setLoadError('')

      try {
        const geoJson = await fetch(WORLD_MAP_URL).then(response => {
          if (!response.ok) throw new Error(`failed to load world map: ${response.status}`)
          return response.json()
        }) as GeoJson
        if (disposed || !rootRef.current) return

        const scene = new THREE.Scene()
        scene.fog = new THREE.FogExp2(colors.fogColor, colors.fogDensity)
        sceneRef.current = scene

        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
        camera.position.set(0, 0.02, 7.8)
        cameraRef.current = camera

        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.domElement.style.display = 'block'
        renderer.domElement.style.width = '100%'
        renderer.domElement.style.height = '100%'
        renderer.domElement.style.cursor = 'grab'
        root.appendChild(renderer.domElement)
        rendererRef.current = renderer

        const controls = new OrbitControls(camera, renderer.domElement)
        controls.enablePan = false
        controls.enableDamping = true
        controls.dampingFactor = 0.04
        controls.autoRotate = !reducedMotionRef.current
        controls.autoRotateSpeed = 0.22
        controls.rotateSpeed = 0.42
        controls.zoomSpeed = 0.72
        controls.minDistance = MIN_DISTANCE
        controls.maxDistance = MAX_DISTANCE
        controlsRef.current = controls

        const ambient = new THREE.AmbientLight(0xffffff, colors.ambientIntensity)
        const hemisphere = new THREE.HemisphereLight(colors.hemisphereSky, colors.hemisphereGround, 0.95)
        const directional = new THREE.DirectionalLight(0xffffff, dark ? 0.46 : 0.54)
        directional.position.set(4, 3, 5)
        scene.add(ambient, hemisphere, directional)

        const starfield = buildStarfield(colors)
        starfieldRef.current = starfield
        scene.add(starfield)

        const earthTexture = new THREE.CanvasTexture(buildEarthTextureCanvas(geoJson, colors))
        earthTexture.colorSpace = THREE.SRGBColorSpace
        earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()
        earthTextureRef.current = earthTexture

        const glowTexture = new THREE.CanvasTexture(buildGlowTexture(colors))
        glowTexture.colorSpace = THREE.SRGBColorSpace
        glowTextureRef.current = glowTexture

        const earthMesh = new THREE.Mesh(
          new THREE.SphereGeometry(RADIUS, 96, 96),
          new THREE.MeshStandardMaterial({
            map: earthTexture,
            color: 0xffffff,
            roughness: 0.9,
            metalness: 0.05,
          }),
        )
        earthMeshRef.current = earthMesh
        scene.add(earthMesh)

        rebuildMarkers()

        const resize = () => {
          const width = root.clientWidth
          const height = root.clientHeight
          if (!width || !height) return
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
        }

        const clearHover = () => {
          if (hoveredMarkerRef.current) setMarkerState(hoveredMarkerRef.current, false)
          hoveredMarkerRef.current = null
          clearHideTimer()
          setHover(current => (current?.pinned ? current : null))
          renderer.domElement.style.cursor = 'grab'
        }

        const handlePointerMove = (event: PointerEvent) => {
          const rect = pointerToRay(event, renderer.domElement, camera, pointerRef.current, raycasterRef.current)
          if (!rect) return
          const marker = findMarkerHit(raycasterRef.current, markerGroupRef.current)
          if (!marker) {
            clearHover()
            return
          }

          clearHideTimer()
          if (hoveredMarkerRef.current !== marker) {
            if (hoveredMarkerRef.current) setMarkerState(hoveredMarkerRef.current, false)
            hoveredMarkerRef.current = marker
            setMarkerState(marker, true)
          }
          renderer.domElement.style.cursor = 'pointer'
          setHover({
            group: marker.userData.group as NodeGroup,
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            pinned: false,
          })
        }

        const handlePointerLeave = () => clearHover()

        const handlePointerDown = (event: PointerEvent) => {
          const rect = pointerToRay(event, renderer.domElement, camera, pointerRef.current, raycasterRef.current)
          if (!rect) return
          const marker = findMarkerHit(raycasterRef.current, markerGroupRef.current)
          if (!marker) return
          const group = marker.userData.group as NodeGroup
          if (group.nodes.length === 1) onOpenRef.current?.(nodeKey(group.nodes[0]))
          else {
            clearHideTimer()
            setHover({ group, x: event.clientX - rect.left, y: event.clientY - rect.top, pinned: true })
          }
        }

        const preventWheelScroll = (event: WheelEvent) => event.preventDefault()

        renderer.domElement.addEventListener('pointermove', handlePointerMove)
        renderer.domElement.addEventListener('pointerleave', handlePointerLeave)
        renderer.domElement.addEventListener('pointerdown', handlePointerDown)
        renderer.domElement.addEventListener('wheel', preventWheelScroll, { passive: false })

        resize()
        const resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(root)
        resizeObserverRef.current = resizeObserver

        const worldPosition = new THREE.Vector3()
        const cameraDirection = new THREE.Vector3()

        const animate = (time: number) => {
          frameIdRef.current = window.requestAnimationFrame(animate)
          controls.update()
          camera.getWorldDirection(cameraDirection)
          cameraDirection.multiplyScalar(-1).normalize()

          const pulse = 0.985 + Math.sin(time / 1700) * 0.015
          const markerGroup = markerGroupRef.current
          if (markerGroup) {
            for (const marker of markerGroup.children as THREE.Group[]) {
              const targetScale = Number(marker.userData.targetScale ?? 1)
              const currentScale = Number(marker.userData.currentScale ?? 1)
              const nextScale = currentScale + (targetScale - currentScale) * 0.12
              marker.userData.currentScale = nextScale
              marker.scale.setScalar(nextScale)

              const glow = marker.userData.glow as THREE.Sprite | undefined
              if (!glow) continue
              marker.getWorldPosition(worldPosition)
              const dot = worldPosition.clone().normalize().dot(cameraDirection)
              const limbFade = Math.max(0, Math.min(1, (dot - 0.08) / 0.22))
              const hovered = Boolean(marker.userData.hovered)
              const targetOpacity = (hovered ? 0.38 : 0.22) * limbFade
              const material = glow.material as THREE.SpriteMaterial
              material.opacity += (targetOpacity - material.opacity) * 0.12
              const baseGlowScale = Number(marker.userData.baseGlowScale ?? 0.13)
              glow.scale.setScalar(baseGlowScale * (hovered ? 2.15 : 1.85) * pulse)
            }
          }

          renderer.render(scene, camera)
        }

        frameIdRef.current = window.requestAnimationFrame(animate)
        setLoading(false)

        return () => {
          renderer.domElement.removeEventListener('pointermove', handlePointerMove)
          renderer.domElement.removeEventListener('pointerleave', handlePointerLeave)
          renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
          renderer.domElement.removeEventListener('wheel', preventWheelScroll)
        }
      } catch (error) {
        if (!disposed) {
          console.error('[Globe3DMap] Failed to init Three.js globe:', error)
          setLoadError('3D 地球加载失败')
          setLoading(false)
        }
      }
    }

    let cleanupListeners: (() => void) | undefined
    init().then(cleanup => {
      cleanupListeners = cleanup
    })

    return () => {
      disposed = true
      cleanupListeners?.()
      clearHideTimer()
      if (frameIdRef.current) window.cancelAnimationFrame(frameIdRef.current)
      resizeObserverRef.current?.disconnect()
      controlsRef.current?.dispose()
      clearMarkers()
      disposeObject(earthMeshRef.current)
      disposeObject(starfieldRef.current)
      earthTextureRef.current?.dispose()
      glowTextureRef.current?.dispose()
      rendererRef.current?.dispose()
      rendererRef.current?.domElement.remove()
      sceneRef.current = null
      cameraRef.current = null
      rendererRef.current = null
      controlsRef.current = null
      earthMeshRef.current = null
      starfieldRef.current = null
      earthTextureRef.current = null
      glowTextureRef.current = null
      setHover(null)
    }
  }, [colors, dark])

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-[1.4rem] border border-border/70 bg-[linear-gradient(180deg,rgba(244,247,250,0.98),rgba(231,237,243,0.98))] shadow-[inset_0_1px_0_rgba(255,255,255,0.78),inset_0_0_0_1px_rgba(148,163,184,0.12),0_16px_36px_rgba(15,23,42,0.07)]',
        'dark:bg-[linear-gradient(180deg,rgba(7,17,29,0.96),rgba(2,8,20,0.98))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_0_0_1px_rgba(34,211,238,0.04),0_22px_60px_rgba(2,8,23,0.4)]',
      )}
      style={{ aspectRatio: '900 / 460' }}
      onMouseLeave={() => { clearHideTimer(); setHover(null) }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(100,116,139,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(100,116,139,0.045)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.88),transparent_100%)] dark:opacity-45 dark:[background-image:linear-gradient(rgba(103,232,249,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.05)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute left-[0.9rem] top-[0.9rem] z-[1] h-[2.8rem] w-[2.8rem] rounded-tl-[0.6rem] border-l-2 border-t-2 border-sky-200/80 dark:border-cyan-300/35" />
      <div className="pointer-events-none absolute right-[0.9rem] top-[0.9rem] z-[1] h-[2.8rem] w-[2.8rem] rounded-tr-[0.6rem] border-r-2 border-t-2 border-sky-200/80 dark:border-cyan-300/35" />
      <div className="pointer-events-none absolute bottom-[0.9rem] left-[0.9rem] z-[1] h-[2.8rem] w-[2.8rem] rounded-bl-[0.6rem] border-b-2 border-l-2 border-sky-200/80 dark:border-cyan-300/35" />
      <div className="pointer-events-none absolute bottom-[0.9rem] right-[0.9rem] z-[1] h-[2.8rem] w-[2.8rem] rounded-br-[0.6rem] border-b-2 border-r-2 border-sky-200/80 dark:border-cyan-300/35" />

      <div ref={rootRef} className="relative z-[2] h-full w-full" />

      {hover && (
        <div
          className={cn('absolute z-20 w-[220px]', hover.pinned ? 'pointer-events-auto' : 'pointer-events-none')}
          style={{
            left: hover.x,
            top: hover.y,
            transform: `translate(${hover.x > 620 ? 'calc(-100% - 16px)' : '16px'}, ${hover.y > 285 ? 'calc(-100% - 16px)' : '16px'})`,
          }}
          onMouseEnter={hover.pinned ? clearHideTimer : undefined}
          onMouseLeave={hover.pinned ? () => scheduleHide(140) : undefined}
        >
          <MapNodePopoverCard
            nodes={hover.group.nodes}
            onPick={id => {
              setHover(null)
              onOpenRef.current?.(id)
            }}
            onMouseEnter={hover.pinned ? clearHideTimer : undefined}
            onMouseLeave={hover.pinned ? () => scheduleHide(140) : undefined}
          />
        </div>
      )}

      {total === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center text-sm text-muted-foreground">
          没有节点设置过经纬度
        </div>
      )}

      {(loading || loadError) && total > 0 && (
        <div className="absolute inset-0 z-[5] flex items-center justify-center bg-background/55 text-sm text-muted-foreground backdrop-blur-[8px]">
          {loadError || '正在加载 3D 地球…'}
        </div>
      )}
    </div>
  )
}

function MapNodePopoverCard({
  nodes,
  onPick,
  onMouseEnter,
  onMouseLeave,
}: {
  nodes: Node[]
  onPick: (id: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  return (
    <div
      className="max-h-[334px] overflow-auto rounded-sm border border-border/90 bg-card/95 px-1.5 py-1.5 text-card-foreground shadow-[0_14px_30px_rgba(15,23,42,0.14)] backdrop-blur animate-in fade-in-0 zoom-in-95 duration-150"
      onClick={e => e.stopPropagation()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {nodes.map((n, index) => {
        const u = deriveUsage(n)
        return (
          <button
            key={nodeKey(n)}
            onClick={() => onPick(nodeKey(n))}
            className={cn(
              'w-full rounded-sm px-2.5 py-2 text-left transition-colors hover:bg-accent/70',
              index !== nodes.length - 1 && 'border-b border-dashed border-border/80',
            )}
          >
            <div className="flex items-start gap-2">
              <span className={cn('mt-1 h-1.5 w-1.5 shrink-0 rounded-full', n.online ? 'bg-emerald-500' : 'bg-slate-400')} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-bold text-foreground">{displayName(n)}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase text-muted-foreground">{n.meta?.region || '—'}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{n.source}</div>
                <div className="mt-2 grid grid-cols-[34px_1fr] gap-x-2 gap-y-0.5 text-[10px] leading-4">
                  <span className="text-muted-foreground">CPU</span>
                  <span className="text-right font-mono">{pct(u.cpu)}</span>
                  <span className="text-muted-foreground">内存</span>
                  <span className="text-right font-mono">{pct(u.mem)}</span>
                  <span className="text-muted-foreground">↑ 入</span>
                  <span className="text-right font-mono">{bytes(u.netIn)}/s</span>
                  <span className="text-muted-foreground">↓ 出</span>
                  <span className="text-right font-mono">{bytes(u.netOut)}/s</span>
                  <span className="text-muted-foreground">运行</span>
                  <span className="text-right font-mono">{uptime(u.uptime)}</span>
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
